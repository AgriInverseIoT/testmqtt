import type { VercelRequest, VercelResponse } from "@vercel/node";
import { connect } from "mqtt";
import { db } from "../db/index.js";
import { messages } from "../db/schema.js";

interface MqttOptions {
  endpoint: string;
  cert: Buffer;
  key: Buffer;
  ca?: Buffer;
  clientId: string;
  topic: string;
}

function getMqttOptions(): MqttOptions | null {
  const endpoint = process.env.AWS_IOT_ENDPOINT;
  const certB64 = process.env.AWS_IOT_CERT;
  const keyB64 = process.env.AWS_IOT_KEY;
  if (!endpoint || !certB64 || !keyB64) return null;

  const caB64 = process.env.AWS_IOT_CA;
  return {
    endpoint,
    cert: Buffer.from(certB64, "base64"),
    key: Buffer.from(keyB64, "base64"),
    ca: caB64 ? Buffer.from(caB64, "base64") : undefined,
    clientId: `${process.env.AWS_IOT_CLIENT_ID || "vercel"}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    topic: process.env.AWS_IOT_TOPIC || "fert/cmd",
  };
}

async function publishToMqtt(opts: MqttOptions, message: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const client = connect(`mqtts://${opts.endpoint}:8883`, {
      clientId: opts.clientId,
      clean: true,
      connectTimeout: 15000,
      keepalive: 30,
      cert: opts.cert,
      key: opts.key,
      ca: opts.ca,
      protocol: "mqtts",
      protocolVersion: 4,
    });

    const timeout = setTimeout(() => {
      client.end(true);
      reject(new Error("Connection timeout after 20s"));
    }, 20000);

    client.on("connect", () => {
      client.publish(opts.topic, message, { qos: 1 }, (err) => {
        clearTimeout(timeout);
        client.end();
        if (err) reject(err);
        else resolve();
      });
    });

    client.on("error", (err) => {
      clearTimeout(timeout);
      client.end(true);
      reject(err);
    });
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  let body: { message?: string };
  try {
    body = req.body;
  } catch {
    return res.status(400).json({ error: "Invalid JSON body" });
  }

  if (!body.message) {
    return res.status(400).json({ error: "Message is required" });
  }

  const opts = getMqttOptions();
  if (!opts) {
    return res.status(503).json({
      error: "AWS IoT not configured. Set AWS_IOT_ENDPOINT, AWS_IOT_CERT, and AWS_IOT_KEY in environment variables.",
    });
  }

  try {
    await publishToMqtt(opts, body.message);
    await db.insert(messages).values({
      topic: opts.topic,
      message: body.message,
      direction: "sent",
    });

    return res.json({
      success: true,
      topic: opts.topic,
      message: body.message,
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Failed to publish message";
    return res.status(500).json({ error: errMsg });
  }
}
