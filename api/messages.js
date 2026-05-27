import { neon } from "@neondatabase/serverless";

export default async function handler(req, res) {
  try {
    if (!process.env.DATABASE_URL) {
      return res.status(500).json({ error: "DATABASE_URL not set" });
    }
    const sql = neon(process.env.DATABASE_URL);

    if (req.method === "GET") {
      const rows = await sql`
        SELECT * FROM messages 
        ORDER BY received_at DESC 
        LIMIT 100
      `;
      return res.json({
        topic: process.env.AWS_IOT_TOPIC || "fert/cmd",
        count: rows.length,
        messages: rows.map((m) => ({
          message: m.message,
          topic: m.topic,
          direction: m.direction,
          timestamp: m.received_at,
        })),
      });
    }

    if (req.method === "DELETE") {
      await sql`DELETE FROM messages`;
      return res.json({ success: true, message: "Messages cleared" });
    }

    return res.status(405).send("Method not allowed");
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
