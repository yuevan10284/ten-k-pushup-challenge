import { sql } from "drizzle-orm";
import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const participants = sqliteTable("participants", { id: integer("id").primaryKey({ autoIncrement: true }), name: text("name").notNull(), nameKey: text("name_key").notNull(), pinHash: text("pin_hash").notNull(), createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`) }, (table) => [uniqueIndex("idx_participants_name_key").on(table.nameKey)]);
export const pushupLogs = sqliteTable("pushup_logs", { id: integer("id").primaryKey({ autoIncrement: true }), participantId: integer("participant_id").notNull().references(() => participants.id, { onDelete: "cascade" }), day: integer("day").notNull(), count: integer("count").notNull(), updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`) }, (table) => [uniqueIndex("idx_logs_participant_day").on(table.participantId, table.day), index("idx_logs_participant").on(table.participantId)]);
