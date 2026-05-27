import type { Config } from "@netlify/functions";

export default async (_req: Request) => {
  const endpoint = Netlify.env.get("AWS_IOT_ENDPOINT");
  const hasCert = Netlify.env.has("AWS_IOT_CERT");
  const hasKey = Netlify.env.has("AWS_IOT_KEY");
  const topic = Netlify.env.get("AWS_IOT_TOPIC") || "fert/cmd";

  const configured = !!(endpoint && hasCert && hasKey);

  return Response.json({
    connected: configured,
    configured,
    endpoint: endpoint || "Not configured",
    topic,
  });
};

export const config: Config = {
  path: "/api/status",
  method: "GET",
};
