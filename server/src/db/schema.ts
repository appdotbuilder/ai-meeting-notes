
import { serial, text, pgTable, timestamp, jsonb } from 'drizzle-orm/pg-core';

export const meetingsTable = pgTable('meetings', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  date: timestamp('date').notNull(),
  attendees: jsonb('attendees').notNull().default('[]'), // Array of strings stored as JSONB
  general_notes: text('general_notes'), // Nullable by default
  discussion_points: jsonb('discussion_points').notNull().default('[]'), // Array of strings stored as JSONB
  action_items: jsonb('action_items').notNull().default('[]'), // Array of strings stored as JSONB
  summary: text('summary'), // Nullable by default
  transcribed_text: text('transcribed_text'), // Nullable by default
  ai_enhanced_notes: text('ai_enhanced_notes'), // Nullable by default
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
});

// TypeScript type for the table schema
export type Meeting = typeof meetingsTable.$inferSelect; // For SELECT operations
export type NewMeeting = typeof meetingsTable.$inferInsert; // For INSERT operations

// Important: Export all tables and relations for proper query building
export const tables = { meetings: meetingsTable };
