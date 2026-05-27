import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const messages = pgTable("messages", {
  id: serial().primaryKey(),
  topic: text().notNull(),
  message: text().notNull(),
  direction: text().notNull().default("received"),
  receivedAt: timestamp("received_at").defaultNow().notNull(),
});
