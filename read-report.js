// api/read-report.js — Vercel serverless function (Node, CommonJS for max compatibility).
// Reads an uploaded lab-report image/PDF with Google Gemini (vision) and returns structured
// marker values for the app to show you for confirmation. The GEMINI_API_KEY lives ONLY here,
// as a Vercel environment variable — it is never sent to the app or the phone.
//
// One-time setup:
//   1. Create a FREE key at  https://aistudio.google.com/app/apikey
//   2. Put this file at  api/read-report.js  in your GitHub repo (create the /api folder).
//   3. Vercel -> your project -> Settings -> Environment Variables:
//        Name: GEMINI_API_KEY   Value: <your key>   (then redeploy / push)
//   4. In the app: gear -> Reports -> "Upload report photo / PDF".
//
// The app downscales photos before sending, so requests stay small and fast.

const MODEL = "gemini-2.0-flash"; // fast, free-tier friendly, reads images and PDFs

module.exports = async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Use POST." });

  const key = process.env.GEMINI_API_KEY;
  if (!key) return res.status(500).json({ error: "Server not set up yet: GEMINI_API_KEY is missing in Vercel." });

  try {
    // Vercel parses a JSON body automatically; fall back to manual parse just in case.
    let bodyObj = req.body;
    if (!bodyObj || typeof bodyObj === "string") { try { bodyObj = JSON.parse(bodyObj || "{}"); } catch (e) { bodyObj = {}; } }
    const files = bodyObj && bodyObj.files;
    if (!Array.isArray(files) || !files.length) return res.status(400).json({ error: "No file was provided." });

    const prompt = [
      "You are a careful medical lab-report reader. Read the attached blood/lab report image(s) or PDF",
      "and extract EVERY test result you can clearly read.",
      "Return ONLY strict JSON in exactly this shape (no markdown, no commentary):",
      '{ "reportDate": "YYYY-MM-DD or null", "markers": [ { "name": "canonical test name", "value": <number>, "unit": "string", "refLow": <number or null>, "refHigh": <number or null> } ] }',
      "Rules:",
      "- value must be a single number. If a result is a range or text (e.g. 'Positive'), skip it.",
      "- Use the report's own reference/normal range for refLow and refHigh when shown, else null.",
      "- Prefer these canonical names when they match: Total Cholesterol, LDL Cholesterol, HDL Cholesterol,",
      "  Triglycerides, VLDL, GGT, SGOT (AST), SGPT (ALT), TSH, T3, T4, HbA1c, Fasting Glucose, Vitamin D,",
      "  Vitamin B12, Uric Acid, Creatinine, Urea, Hemoglobin, Weight.",
      "- reportDate is when the sample was collected/reported. If several dates, use the most recent.",
      '- If you cannot read any results, return {"reportDate":null,"markers":[]}.',
    ].join("\n");

    const parts = [{ text: prompt }].concat(files.map(function (f) { return { inline_data: { mime_type: f.mimeType, data: f.data } }; }));
    const body = { contents: [{ parts: parts }], generationConfig: { responseMimeType: "application/json", temperature: 0 } };

    const url = "https://generativelanguage.googleapis.com/v1beta/models/" + MODEL + ":generateContent?key=" + encodeURIComponent(key);
    const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!r.ok) { const t = await r.text().catch(function () { return ""; }); return res.status(502).json({ error: "AI service error.", detail: String(t).slice(0, 400) }); }

    const j = await r.json();
    const text = (j && j.candidates && j.candidates[0] && j.candidates[0].content && j.candidates[0].content.parts && j.candidates[0].content.parts[0] && j.candidates[0].content.parts[0].text) || "";
    let parsed;
    try { parsed = JSON.parse(text); } catch (e) { return res.status(502).json({ error: "Could not read the report clearly. Try a sharper photo or a PDF." }); }
    if (!parsed || !Array.isArray(parsed.markers)) parsed = { reportDate: (parsed && parsed.reportDate) || null, markers: [] };
    return res.status(200).json(parsed);
  } catch (e) {
    return res.status(500).json({ error: String((e && e.message) || e) });
  }
};
