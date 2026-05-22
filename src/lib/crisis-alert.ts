// ─── Crisis Alert Library ─────────────────────────────────────
// Handles SMS, voice calls, and audit logging for all crisis levels.
// Uses Fast2SMS for Indian numbers (free plan = SMS only; paid plan = OBD calls).

import { db, auditLog, sessions, userSettings } from './db';
import { eq } from 'drizzle-orm';

export interface LocationData {
  lat: number;
  lng: number;
}

export interface AlertSettings {
  trustedContactName:  string | null;
  trustedContactPhone: string | null;
  userName:            string | null;
  shareLocation:       boolean;
}

export interface AlertResult {
  smsStatus:  'sent' | 'failed' | 'no_contact' | 'no_api_key';
  callStatus: 'sent' | 'failed' | 'no_contact' | 'no_api_key' | 'tel_fallback' | 'skipped';
  trustedContactReached: boolean;
}

const FAST2SMS_URL = 'https://www.fast2sms.com/dev/bulkV2';

// ─── SMS ──────────────────────────────────────────────────────
async function sendSMS(phone: string, message: string): Promise<boolean> {
  const apiKey = process.env.FAST2SMS_API_KEY;
  if (!apiKey || apiKey === 'your_fast2sms_api_key_here') return false;

  try {
    const res = await fetch(FAST2SMS_URL, {
      method:  'POST',
      headers: {
        authorization: apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        route:     'q',           // quick route — free plan
        message,
        language:  'english',
        flash:     '0',
        numbers:   phone.replace(/\D/g, '').slice(-10), // strip to 10-digit Indian number
      }),
    });
    const data = await res.json();
    return data.return === true;
  } catch {
    return false;
  }
}

// ─── Voice Call ───────────────────────────────────────────────
// Fast2SMS OBD (outbound dialling) requires a paid plan.
// Returns 'sent' if API call succeeded, 'tel_fallback' if no paid plan detected,
// 'no_api_key' if key is missing.
async function makeCall(phone: string): Promise<AlertResult['callStatus']> {
  const apiKey = process.env.FAST2SMS_API_KEY;
  if (!apiKey || apiKey === 'your_fast2sms_api_key_here') return 'no_api_key';

  try {
    const res = await fetch('https://www.fast2sms.com/dev/voice', {
      method:  'POST',
      headers: {
        authorization: apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        route:   'obd',
        callers: phone.replace(/\D/g, '').slice(-10),
        message: 'This is an urgent message from Harmony. Please check on your loved one immediately.',
        language: 'english',
      }),
    });
    const data = await res.json();
    // If the plan doesn't support OBD, Fast2SMS returns a specific error
    if (data.return === true) return 'sent';
    // Fall back to tel: link guidance — client will handle this
    return 'tel_fallback';
  } catch {
    return 'tel_fallback';
  }
}

// ─── SMS message builder ──────────────────────────────────────
function buildAlertSMS(
  userName:      string,
  trustedName:   string,
  level:         number,
  location?:     LocationData
): string {
  const urgency = level >= 4
    ? 'is in serious crisis and urgently needs'
    : level === 3
    ? 'seems to be in crisis and needs'
    : 'has been really struggling and might need';

  let msg = `Hey ${trustedName}, ${userName} ${urgency} you right now. They've been talking to Harmony and seem to be going through something really difficult. Please check on them as soon as you can. 💙`;

  if (location) {
    msg += `\n\nLast known location: https://maps.google.com/?q=${location.lat},${location.lng}`;
  }

  return msg;
}

// ─── Main alert orchestrator ──────────────────────────────────
export async function triggerLevelAlert(
  level:     2 | 3 | 4,
  sessionId: string,
  userId:    number,
  settings:  AlertSettings,
  location?: LocationData
): Promise<AlertResult> {
  const result: AlertResult = {
    smsStatus:             'no_contact',
    callStatus:            'skipped',
    trustedContactReached: false,
  };

  const phone = settings.trustedContactPhone;
  const name  = settings.trustedContactName ?? 'your loved one';
  const user  = settings.userName           ?? 'Your friend';

  // ── Level 2: SMS only ──────────────────────────────────────
  // ── Level 3+: SMS + call attempt ──────────────────────────
  if (phone) {
    const loc = settings.shareLocation ? location : undefined;
    const message = buildAlertSMS(user, name, level, loc);

    const smsSent = await sendSMS(phone, message);
    result.smsStatus = smsSent ? 'sent' : 'failed';

    if (level >= 3) {
      result.callStatus = await makeCall(phone);
      // If call was sent successfully, mark as potentially reached
      result.trustedContactReached = result.callStatus === 'sent';
    }
  } else {
    result.smsStatus  = 'no_contact';
    result.callStatus = 'no_contact';
  }

  // ── Always log to audit_log ────────────────────────────────
  await Promise.allSettled([
    db.insert(auditLog).values({
      sessionId,
      userId,
      event:    'crisis_alert_sent',
      metadata: {
        level,
        smsStatus:             result.smsStatus,
        callStatus:            result.callStatus,
        trustedContactReached: result.trustedContactReached,
        hasLocation:           !!location,
      },
    }),
    // Mark session as alerted
    db.update(sessions)
      .set({ alertedAt: new Date(), alertActedOn: false })
      .where(eq(sessions.sessionId, sessionId)),
  ]);

  return result;
}

// ─── Fetch user settings helper ──────────────────────────────
export async function getUserAlertSettings(userId: number): Promise<AlertSettings> {
  const s = await db.query.userSettings.findFirst({
    where: eq(userSettings.userId, userId),
  });
  return {
    trustedContactName:  s?.trustedContactName  ?? null,
    trustedContactPhone: s?.trustedContactPhone ?? null,
    userName:            s?.userName            ?? null,
    shareLocation:       s?.shareLocation       ?? true,
  };
}
