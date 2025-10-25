// api/gsheet.js  (Vercel Serverless Function)
const GAS_URL = 'https://script.google.com/macros/s/AKfycbw_nDszvVWB_wGzacJKVAtiLALeV8mCDuPNfRVWVxOC53vg9VIQ8LKSUv49riPECUcQ/exec'; // <-- tu URL .exec

export default async function handler(req, res) {
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
    const forward = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body || {}),
    });

    const text = await forward.text();

    try {
      const json = JSON.parse(text);
      return res.status(forward.status).json(json);
    } catch {
      return res.status(forward.status).send(text);
    }
  } catch (err) {
    return res.status(500).json({ ok: false, error: String(err) });
  }
}
