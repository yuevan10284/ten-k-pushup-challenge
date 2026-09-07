import { sql } from "drizzle-orm";
import { boolean, integer, pgTable, serial, text, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";

// startedAt anchors "Day N" to a real calendar date (startedAt + N-1 days),
// which is what makes missed-day detection possible. Migrated accounts
// (imported from the previous backend, which had no join date) get
// startedAt set to the migration moment — missed-day tracking is only
// meaningful from that point forward for them, not retroactively.
export const participants = pgTable(
  "participants",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    nameKey: text("name_key").notNull(),
    pinHash: text("pin_hash").notNull(),
    claimed: boolean("claimed").notNull().default(true),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull().default(sql`now()`),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  },
  (table) => [uniqueIndex("idx_participants_name_key").on(table.nameKey)]
);

export const pushupLogs = pgTable(
  "pushup_logs",
  {
    id: serial("id").primaryKey(),
    participantId: integer("participant_id").notNull().references(() => participants.id, { onDelete: "cascade" }),
    day: integer("day").notNull(),
    count: integer("count").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().default(sql`now()`),
  },
  (table) => [
    uniqueIndex("idx_logs_participant_day").on(table.participantId, table.day),
    index("idx_logs_participant").on(table.participantId),
  ]
);

export const messages = pgTable(
  "messages",
  {
    id: serial("id").primaryKey(),
    participantId: integer("participant_id").notNull().references(() => participants.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
  },
  (table) => [index("idx_messages_created").on(table.createdAt)]
);
