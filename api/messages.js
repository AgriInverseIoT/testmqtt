import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
import { desc } from "drizzle-orm";

const messages = pgTable("messages", {
  id: serial().primaryKey(),
  topic: text().notNull(),
  message: text().notNull(),
  direction: text().notNull().default("received"),
  receivedAt: timestamp("received_at").defaultNow().notNull(),
});

export default async function handler(req, res) {
  const sql = neon(process.env.DATABASE_URL);
  const db = drizzle(sql);

  if (req.method === "GET") {
    const rows = await db
      .select()
      .from(messages)
      .orderBy(desc(messages.receivedAt))
      .limit(100);

    return res.json({
      topic: process.env.AWS_IOT_TOPIC || "fert/cmd",
      count: rows.length,
      messages: rows.map((m) => ({
        message: m.message,
        topic: m.topic,
        direction: m.direction,
        timestamp: m.receivedAt,
      })),
    });
  }

  if (req.method === "DELETE") {
    await db.delete(messages);
    return res.json({ success: true, message: "Messages cleared" });
  }

  return res.status(405).send("Method not allowed");
}
