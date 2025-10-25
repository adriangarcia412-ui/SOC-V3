// api/gsheet.js - Proxy a Google Apps Script
export default async function handler(req, res) {
  // CORS básico
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  try {
    const GAS_URL = 'https://script.google.com/macros/s/AKfycbz2jHR--ztUyX-PE78lvjG4GXKbtdDJ5e3jJDgPtRaFcCDh258hu9slB4SAxgFkMPmIOg/exec';

    const r = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // Si tu frontend envía como string, usa req.body tal cual
      // Si viene como objeto (Next 13/14 API routes), serialize:
      body: typeof req.body === 'string' ? req.body : JSON.stringify(req.body),
    });

    const text = await r.text();
    // Apps Script puede responder HTML si hay algún fallback;
    // intentamos parsear a JSON, si falla devolvemos "raw".
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { ok: true, raw: text };
    }

    return res.status(200).json(data);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ ok: false, error: String(err) });
  }
}
