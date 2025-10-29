// src/config.js (reemplazo completo)

// === URL del backend (Apps Script Web App) ===
export const API_URL =
  "https://script.google.com/macros/s/AKfycbzMZl3qsIIIwIUAPGUk1JYt1CuPP3BI4Aq9WK5ZlAslrgNg4PPD5aQEcSe07Ce43stkLQ/exec";

// === Helpers de red (JSON) ===
// Evitamos preflight CORS enviando texto plano.
// Apps Script seguirá leyendo con JSON.parse(e.postData.contents).

const DEFAULT_TIMEOUT_MS = 15000;

function withTimeout(promise, ms = DEFAULT_TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("timeout")), ms);
    promise
      .then((v) => {
        clearTimeout(t);
        resolve(v);
      })
      .catch((e) => {
        clearTimeout(t);
        reject(e);
      });
  });
}

export async function postJSON(url, body) {
  const resp = await withTimeout(
    fetch(url, {
      method: "POST",
      // 👇 Importante: texto plano para evitar preflight OPTIONS
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
        "Accept": "application/json",
      },
      body: JSON.stringify(body || {}),
      // NO usar credentials, ni headers custom.
    })
  );

  // Intentar leer JSON; si no, devolver texto/estado para diagnóstico
  let data = null;
  try {
    data = await resp.json();
  } catch {
    const text = await resp.text().catch(() => "");
    data = { ok: false, status: resp.status, text };
  }
  return data;
}

export async function getJSON(url) {
  const resp = await withTimeout(
    fetch(url, {
      method: "GET",
      headers: { "Accept": "application/json" },
    })
  );

  let data = null;
  try {
    data = await resp.json();
  } catch {
    const text = await resp.text().catch(() => "");
    data = { ok: false, status: resp.status, text };
  }
  return data;
}
