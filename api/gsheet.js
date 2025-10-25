export default async function handler(req, res) {
  const GS_URL = "https://script.google.com/macros/s/AKfycbw_nDszvVWB_wGzacJKVAtiLALeV8mCDuPNfRVWVxOC53vg9VIQ8LKSUv49riPECUcQ/exec";

  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method Not Allowed" });
  }

  try {
    const response = await fetch(GS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
    });

    const text = await response.text();
    try {
      const json = JSON.parse(text);
      return res.status(200).json(json);
    } catch (err) {
      return res.status(200).json({ ok: true, raw: text });
    }

  } catch (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
}
