import type { Config } from "@netlify/functions";
import { connect } from "mqtt";
import { db } from "../../db/index.js";
import { messages } from "../../db/schema.js";

interface MqttOptions {
  endpoint: string;
  cert: Buffer;
  key: Buffer;
  ca?: Buffer;
  clientId: string;
  topic: string;
}

function getMqttOptions(): MqttOptions | null {
  const endpoint = Netlify.env.get("AWS_IOT_ENDPOINT");
  const certB64 = Netlify.env.get("AWS_IOT_CERT");
  const keyB64 = Netlify.env.get("AWS_IOT_KEY");

  if (!endpoint || !certB64 || !keyB64) return null;

  const caB64 = Netlify.env.get("AWS_IOT_CA");
  return {
    endpoint,
    cert: Buffer.from(certB64, "base64"),
    key: Buffer.from(keyB64, "base64"),
    ca: caB64 ? Buffer.from(caB64, "base64") : undefined,
    clientId: `${Netlify.env.get("AWS_IOT_CLIENT_ID") || "netlify"}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    topic: Netlify.env.get("AWS_IOT_TOPIC") || "fert/cmd",
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

export default async (req: Request) => {
  let body: { message?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.message) {
    return Response.json({ error: "Message is required" }, { status: 400 });
  }

  const opts = getMqttOptions();
  if (!opts) {
    return Response.json(
      {
        error:
          "AWS IoT not configured. Set AWS_IOT_ENDPOINT, AWS_IOT_CERT, and AWS_IOT_KEY in Netlify environment variables.",
      },
      { status: 503 },
    );
  }

  try {
    await publishToMqtt(opts, body.message);

    await db.insert(messages).values({
      topic: opts.topic,
      message: body.message,
      direction: "sent",
    });

    return Response.json({
      success: true,
      topic: opts.topic,
      message: body.message,
    });
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : "Failed to publish message";
    return Response.json({ error: errMsg }, { status: 500 });
  }
};

export const config: Config = {
  path: "/api/publish",
  method: "POST",
};
