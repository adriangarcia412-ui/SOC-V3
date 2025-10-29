// src/config.js (reemplazo completo)

// === URL del backend (Apps Script Web App) ===
export const API_URL =
  "https://script.google.com/macros/s/AKfycbzMZl3qsIIIwIUAPGUk1JYt1CuPP3BI4Aq9WK5ZlAslrgNg4PPD5aQEcSe07Ce43stkLQ/exec";

// === Helpers de red (JSON) ===
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
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify(body || {}),
      // Importante: credenciales fuera, Apps Script con “Cualquiera con el enlace”
      // no requiere cookies. Mantener simple evita “Failed to fetch”.
    })
  );

  // Si Apps Script devuelve 200 pero sin JSON válido, evitamos crash.
  let data = null;
  try {
    data = await resp.json();
  } catch {
    data = { ok: false, status: resp.status, text: await resp.text() };
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
    data = { ok: false, status: resp.status, text: await resp.text() };
  }

  return data;
}
