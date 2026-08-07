// Vercel serverless function. Deployed at /api/chat.
// Keeps the real Anthropic API key server-side (set as an env var in Vercel's dashboard,
// never shipped to the phone). The app calls this instead of api.anthropic.com directly.

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Use POST" });
    return;
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: "ANTHROPIC_API_KEY is not set on the server. Add it in Vercel → Project → Settings → Environment Variables." });
    return;
  }

  try {
    const { system, message } = req.body || {};
    if (!message) {
      res.status(400).json({ error: "Missing 'message' in request body." });
      return;
    }

    const upstream = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        system: system || undefined,
        messages: [{ role: "user", content: message }],
      }),
    });

    const data = await upstream.json();
    if (!upstream.ok) {
      res.status(upstream.status).json({ error: data?.error?.message || "Upstream error from Anthropic API." });
      return;
    }

    const text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n");
    res.status(200).json({ text });
  } catch (err) {
    res.status(500).json({ error: String(err) });
  }
}
