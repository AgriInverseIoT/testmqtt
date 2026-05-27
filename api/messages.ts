import type { VercelRequest, VercelResponse } from "@vercel/node";
import { db } from "../db/index.js";
import { messages } from "../db/schema.js";
import { desc } from "drizzle-orm";
 
export default async function handler(req: VercelRequest, res: VercelResponse) {
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
