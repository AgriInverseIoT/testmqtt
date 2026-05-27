export default function handler(req, res) {
  const endpoint = process.env.AWS_IOT_ENDPOINT;
  const hasCert = !!process.env.AWS_IOT_CERT;
  const hasKey = !!process.env.AWS_IOT_KEY;
  const topic = process.env.AWS_IOT_TOPIC || "fert/cmd";
  const configured = !!(endpoint && hasCert && hasKey);

  return res.json({
    connected: configured,
    configured,
    endpoint: endpoint || "Not configured",
    topic,
  });
}
