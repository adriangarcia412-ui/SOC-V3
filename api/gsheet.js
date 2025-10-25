// /api/gsheet.js (Vercel)
const GAS_URL = 'https://script.google.com/macros/s/AKfycbw_nDszvVWB_wGzacJKVAtiLALeV8mCDuPNfRVWVxOC53vg9VIQ8LKSUv49riPECUcQ/exec';

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    // Preflight CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end('ok');
  }

  if (req.method !== 'POST') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  }

  try {
    const r = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body || {})
    });

    const text = await r.text();
    let data;
    try { data = JSON.parse(text); } catch { data = { ok: true, raw: text }; }

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    return res.status(200).send(JSON.stringify(data));
  } catch (err) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    return res.status(500).json({ ok: false, error: String(err) });
  }
}
