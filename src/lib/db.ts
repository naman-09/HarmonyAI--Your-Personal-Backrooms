import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import {
  pgTable,
  serial,
  integer,
  text,
  boolean,
  timestamp,
  jsonb,
  index,
  customType,
} from 'drizzle-orm/pg-core';

// ─── Tables ──────────────────────────────────────────────────
export const users = pgTable('users', {
  id:        serial('id').primaryKey(),
  email:     text('email').notNull().unique(),
  name:      text('name'),
  password:  text('password').notNull(), // bcrypt hash
  createdAt: timestamp('created_at').defaultNow().notNull(),
  isActive:  boolean('is_active').default(true).notNull(),
});

export const sessions = pgTable('sessions', {
  id:              serial('id').primaryKey(),
  userId:          integer('user_id').references(() => users.id).notNull(),
  sessionId:       text('session_id').unique().notNull(),
  emotionTimeline: jsonb('emotion_timeline').$type<any[]>().default([]).notNull(),
  riskLevel:       text('risk_level').default('none').notNull(),
  crisisLevel:     integer('crisis_level').default(0).notNull(),
  location:        text('location'),
  alertedAt:       timestamp('alerted_at'),
  alertActedOn:    boolean('alert_acted_on').default(false).notNull(),
  isFlagged:       boolean('is_flagged').default(false).notNull(),
  endedAt:         timestamp('ended_at'),
  createdAt:       timestamp('created_at').defaultNow().notNull(),
}, (t) => ({
  userIdx: index('sessions_user_id_idx').on(t.userId),
}));

export const messages = pgTable('messages', {
  id:           serial('id').primaryKey(),
  sessionId:    integer('session_id').references(() => sessions.id).notNull(),
  role:         text('role').notNull(),
  content:      text('content').notNull(),
  emotionScore: jsonb('emotion_score').$type<{ rage: number; calm: number }>(),
  safetyLevel:  integer('safety_level').default(0).notNull(),
  createdAt:    timestamp('created_at').defaultNow().notNull(),
}, (t) => ({
  sessionIdx: index('messages_session_id_idx').on(t.sessionId),
}));

// Append-only audit log — never update or delete rows here
export const auditLog = pgTable('audit_log', {
  id:        serial('id').primaryKey(),
  sessionId: text('session_id').notNull(),
  userId:    integer('user_id').notNull(),
  event:     text('event').notNull(),
  metadata:  jsonb('metadata').$type<any>().default({}),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => ({
  sessionIdx: index('audit_log_session_id_idx').on(t.sessionId),
}));

// Trusted contact and user preferences for crisis alerting
export const userSettings = pgTable('user_settings', {
  id:                  serial('id').primaryKey(),
  userId:              integer('user_id').references(() => users.id).notNull().unique(),
  trustedContactName:  text('trusted_contact_name'),
  trustedContactPhone: text('trusted_contact_phone'), // Indian mobile e.g. 9876543210
  userName:            text('user_name'),              // used in SMS alerts
  shareLocation:       boolean('share_location').default(true).notNull(),
  createdAt:           timestamp('created_at').defaultNow().notNull(),
  updatedAt:           timestamp('updated_at').defaultNow().notNull(),
});

export const journalEntries = pgTable('journal_entries', {
  id:        serial('id').primaryKey(),
  userId:    integer('user_id').references(() => users.id).notNull(),
  mood:      integer('mood').notNull(),
  note:      text('note'),
  date:      text('date').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (t) => ({
  userDateIdx: index('journal_user_date_idx').on(t.userId, t.date),
}));

// ─── DB instance (Neon serverless HTTP) ──────────────────────
const sql = neon(process.env.DATABASE_URL!);
export const db = drizzle(sql as any, {
  schema: { users, sessions, messages, auditLog, userSettings, journalEntries },
});
