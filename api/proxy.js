// api/proxy.js
// Serverless function en Vercel que reenvía las peticiones al Web App de Apps Script.

const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbzMZl3qsIIIwIUAPGUk1JYt1CuPP3BI4Aq9WK5ZlAslrgNg4PPD5aQEcSe07Ce43stkLQ/exec";

export default async function handler(req, res) {
  try {
    if (req.method !== "POST" && req.method !== "GET") {
      res.status(405).json({ ok: false, error: "Method not allowed" });
      return;
    }

    // GET -> ping (opcional)
    if (req.method === "GET") {
      const r = await fetch(APPS_SCRIPT_URL, { method: "GET" });
      const text = await r.text();
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.status(r.status || 200).send(text);
      return;
    }

    // POST -> acciones (CLOSE_CASE, SAVE_PENDING, LIST_PENDING, DELETE_PENDING)
    const bodyText =
      typeof req.body === "string" ? req.body : JSON.stringify(req.body || {});

    const upstream = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8", // evita preflight en GAS
        "Accept": "application/json",
      },
      body: bodyText,
    });

    const respText = await upstream.text();
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.status(upstream.status || 200).send(respText);
  } catch (err) {
    res
      .status(502)
      .json({ ok: false, error: "proxy_failed", detail: String(err?.message || err) });
  }
}
