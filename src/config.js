// src/config.js

// Llamamos a nuestro proxy (mismo dominio) y eliminamos CORS del navegador.
export const API_URL = "/api/proxy";

// === Helpers de red ===
const DEFAULT_TIMEOUT_MS = 15000;

function withTimeout(promise, ms = DEFAULT_TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("timeout")), ms);
    promise
      .then((v) => { clearTimeout(t); resolve(v); })
      .catch((e) => { clearTimeout(t); reject(e); });
  });
}

export async function postJSON(url, body) {
  const resp = await withTimeout(
    fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",   // misma-origen, sin CORS
        "Accept": "application/json",
      },
      body: JSON.stringify(body || {}),
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
