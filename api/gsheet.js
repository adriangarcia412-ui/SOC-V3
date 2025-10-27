// api/gsheet.js
export default async function handler(req, res) {
  // ⬇⬇⬇ Pega aquí TU última URL de Apps Script (exec)
  const GAS_URL = "https://script.google.com/macros/s/AKfycbz2jHR--ztUyX-PE78lvjG4GXKbtdDJ5e3jJDgPtRaFcCDh258hu9slB4SAxgFkMPmIOg/exec";

  // Solo permitimos POST y GET para prueba de conexión
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method === "GET") {
    try {
      const ping = await fetch(GAS_URL);
      const text = await ping.text();
      return res
        .status(200)
        .json({ ok: true, message: "Proxy activo", raw: text.slice(0, 150) });
    } catch (e) {
      return res.status(500).json({ ok: false, error: String(e) });
    }
  }

  if (req.method !== "POST") {
    return res.status(405).json({ ok: false, error: "Method Not Allowed" });
  }

  try {
    const r = await fetch(GAS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
    });

    // Apps Script podría responder texto o JSON.
    const text = await r.text();
    let data;
    try { data = JSON.parse(text); } catch { data = { ok: true, raw: text }; }

    return res.status(r.ok ? 200 : 500).json(data);
  } catch (e) {
    return res.status(500).json({ ok: false, error: String(e) });
  }
}
