import type { Config } from "@netlify/functions";
import { db } from "../../db/index.js";
import { messages } from "../../db/schema.js";
import { desc } from "drizzle-orm";

export default async (req: Request) => {
  if (req.method === "GET") {
    const rows = await db
      .select()
      .from(messages)
      .orderBy(desc(messages.receivedAt))
      .limit(100);

    return Response.json({
      topic: Netlify.env.get("AWS_IOT_TOPIC") || "fert/cmd",
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
    return Response.json({ success: true, message: "Messages cleared" });
  }

  return new Response("Method not allowed", { status: 405 });
};

export const config: Config = {
  path: "/api/messages",
  method: ["GET", "DELETE"],
};
