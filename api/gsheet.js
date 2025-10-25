// /api/gsheet.js
const GAS_URL = "https://script.google.com/macros/s/AKfycbyxAStIHHL7JKj00clLnlbQw0ZnKm5JSWIXZLVawpeFawWBkGuAxDqbbNa0Oq9i7PU6aQ/exec";

export default async function handler(req, res) {
  // CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method Not Allowed" });
  }

  try {
    const r = await fetch(GAS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body || {}),
    });

    // Intentar parsear JSON. Si no, devolver texto crudo para diagnóstico.
    let data;
    try {
      data = await r.json();
    } catch {
      const raw = await r.text();
      data = { ok: false, error: "Invalid JSON from GAS", raw };
    }

    return res.status(r.ok ? 200 : 500).json(data);
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e) });
  }
}
