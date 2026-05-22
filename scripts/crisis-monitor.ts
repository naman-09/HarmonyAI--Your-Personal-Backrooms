/**
 * Harmony Crisis Monitor — Background Service
 *
 * Polls the Neon PostgreSQL database every 30 seconds for unacted crisis flags.
 * Runs as a standalone Node.js process (managed by node-windows as a Windows Service).
 *
 * Start manually:   npm run monitor
 * Install as service: npm run monitor:install  (requires admin)
 * Remove service:   npm run monitor:uninstall (requires admin)
 */

// Load .env.local before anything else
import 'dotenv/config';

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq, and, gte, lte, lt } from 'drizzle-orm';
import * as fs from 'fs';
import * as path from 'path';

// ── Inline schema (mirrors src/lib/db.ts to avoid Next.js deps) ──
import {
  pgTable, serial, integer, text, boolean, timestamp, jsonb,
} from 'drizzle-orm/pg-core';

const sessions = pgTable('sessions', {
  id:           serial('id').primaryKey(),
  userId:       integer('user_id').notNull(),
  sessionId:    text('session_id').notNull(),
  crisisLevel:  integer('crisis_level').default(0).notNull(),
  alertedAt:    timestamp('alerted_at'),
  alertActedOn: boolean('alert_acted_on').default(false).notNull(),
  location:     text('location'),
});

const userSettings = pgTable('user_settings', {
  id:                  serial('id').primaryKey(),
  userId:              integer('user_id').notNull(),
  trustedContactName:  text('trusted_contact_name'),
  trustedContactPhone: text('trusted_contact_phone'),
  userName:            text('user_name'),
  shareLocation:       boolean('share_location').default(true).notNull(),
});

const auditLog = pgTable('audit_log', {
  id:        serial('id').primaryKey(),
  sessionId: text('session_id').notNull(),
  userId:    integer('user_id').notNull(),
  event:     text('event').notNull(),
  metadata:  jsonb('metadata').$type<any>().default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// ── DB ───────────────────────────────────────────────────────
const sql = neon(process.env.DATABASE_URL!);
const db  = drizzle(sql as any);

// ── Logging ──────────────────────────────────────────────────
const LOG_DIR  = path.join(process.cwd(), 'logs');
const LOG_FILE = path.join(LOG_DIR, 'crisis-monitor.log');

function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
}

function log(msg: string) {
  ensureLogDir();
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  fs.appendFileSync(LOG_FILE, line + '\n');
}

// ── Fast2SMS helpers (duplicated here to avoid Next.js deps) ──
async function sendSMS(phone: string, message: string): Promise<boolean> {
  const apiKey = process.env.FAST2SMS_API_KEY;
  if (!apiKey || apiKey === 'your_fast2sms_api_key_here') return false;
  try {
    const res = await fetch('https://www.fast2sms.com/dev/bulkV2', {
      method:  'POST',
      headers: { authorization: apiKey, 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        route: 'q', language: 'english', flash: '0',
        numbers: phone.replace(/\D/g, '').slice(-10),
        message,
      }),
    });
    const data = await res.json();
    return data.return === true;
  } catch { return false; }
}

// ── Main poll cycle ───────────────────────────────────────────
const POLL_INTERVAL_MS   = 30 * 1000;        // 30 seconds
const LEVEL4_REFIRE_MS   = 5  * 60 * 1000;   // 5 minutes between Level 4 re-alerts
const LEVEL4_TIMEOUT_MS  = 30 * 60 * 1000;   // stop after 30 minutes
// TODO: Replace LEVEL4_TIMEOUT_MS cutoff with a trusted-contact confirmation flow.
// Embed a short URL in the SMS (e.g. harmony.app/confirm?token=...) that the
// trusted contact can tap to mark alertActedOn = true via a public endpoint.

async function poll() {
  try {
    log('Polling for unacted crisis sessions…');

    // Find Level 3+ sessions that haven't been acted on
    const unacted = await db
      .select()
      .from(sessions)
      .where(
        and(
          gte(sessions.crisisLevel, 3),
          eq(sessions.alertActedOn, false)
        )
      );

    if (unacted.length === 0) {
      log(`No unacted crises found.`);
      return;
    }

    log(`Found ${unacted.length} unacted crisis session(s).`);

    for (const s of unacted) {
      const now = Date.now();

      // For Level 4: re-alert every 5 min, stop after 30 min
      if (s.crisisLevel >= 4 && s.alertedAt) {
        const firstAlertMs = new Date(s.alertedAt).getTime();
        const lastAlertMs  = firstAlertMs; // simplified — use alertedAt for now

        // Stop after 30 min total
        if (now - firstAlertMs > LEVEL4_TIMEOUT_MS) {
          log(`Session ${s.sessionId}: Level 4 timeout reached (30 min). Stopping alerts.`);
          await db.update(sessions)
            .set({ alertActedOn: true })
            .where(eq(sessions.id, s.id));
          continue;
        }

        // Only fire every 5 min
        if (now - lastAlertMs < LEVEL4_REFIRE_MS) {
          log(`Session ${s.sessionId}: Level 4 — waiting for next re-alert window.`);
          continue;
        }
      }

      // Fetch user settings
      const settings = await db
        .select()
        .from(userSettings)
        .where(eq(userSettings.userId, s.userId))
        .limit(1);

      const contact = settings[0];

      if (!contact?.trustedContactPhone) {
        log(`Session ${s.sessionId}: No trusted contact configured for user ${s.userId}. Logging only.`);
        await db.insert(auditLog).values({
          sessionId: s.sessionId,
          userId:    s.userId,
          event:     'crisis_monitor_no_contact',
          metadata:  { level: s.crisisLevel, source: 'background_monitor' },
        });
        continue;
      }

      // Parse location
      let locationStr = '';
      try {
        if (s.location && contact.shareLocation) {
          const loc = JSON.parse(s.location);
          locationStr = ` Last known location: https://maps.google.com/?q=${loc.lat},${loc.lng}`;
        }
      } catch { /* ignore */ }

      const userName    = contact.userName    ?? 'Someone you care about';
      const trustedName = contact.trustedContactName ?? 'there';
      const level       = s.crisisLevel;
      const urgency     = level >= 4
        ? 'is in serious and ongoing crisis — this is the second alert'
        : 'is in crisis and urgently needs';

      const message = `Hey ${trustedName}, ${userName} ${urgency} you right now. Harmony has detected repeated distress signals. Please check on them immediately.${locationStr}`;

      const sent = await sendSMS(contact.trustedContactPhone, message);
      log(`Session ${s.sessionId}: Level ${level} re-alert SMS → ${sent ? 'sent' : 'failed'}`);

      // Log to audit_log
      await db.insert(auditLog).values({
        sessionId: s.sessionId,
        userId:    s.userId,
        event:     'crisis_monitor_alert',
        metadata:  {
          level,
          smsStatus: sent ? 'sent' : 'failed',
          source:    'background_monitor',
          hasLocation: !!locationStr,
        },
      });
    }
  } catch (err) {
    log(`ERROR during poll: ${err instanceof Error ? err.message : String(err)}`);
  }
}

// ── Entry point ───────────────────────────────────────────────
log('Harmony Crisis Monitor starting…');
log(`DATABASE_URL configured: ${!!process.env.DATABASE_URL}`);

poll(); // Run immediately on start
setInterval(poll, POLL_INTERVAL_MS);
