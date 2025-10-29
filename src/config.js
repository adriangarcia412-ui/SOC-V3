// src/config.js
// Config central de endpoints y helpers HTTP para SOC v3

// === URL del Apps Script (la más reciente que compartiste) ===
// Si en el futuro se genera una nueva, CAMBIA SOLO ESTA CONSTANTE.
export const API_URL = "https://script.google.com/macros/s/AKfycbw-oreEqAmNrXg208Y0RlGY_mkqKasLOKRh7YAJcSb6QtZgd4neplWXM3HDbLK2Tvnh2g/exec";

// --- Helper: POST JSON ---
export async function postJSON(pathOrURL, payload) {
  const url = absolutize(pathOrURL);
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json;charset=utf-8" },
    body: JSON.stringify(payload),
  });
  let data;
  try {
    data = await res.json();
  } catch (e) {
    const raw = await res.text();
    data = { ok: res.ok, status: res.status, raw };
  }
  return data;
}

// --- Helper: GET JSON ---
export async function getJSON(pathOrURL, query = {}) {
  const url = absolutize(pathOrURL, query);
  const res = await fetch(url);
  let data;
  try {
    data = await res.json();
  } catch (e) {
    const raw = await res.text();
    data = { ok: res.ok, status: res.status, raw };
  }
  return data;
}

// Convierte un path relativo en URL absoluta contra API_URL
function absolutize(pathOrURL, query = {}) {
  if (/^https?:\/\//i.test(pathOrURL)) {
    return appendQuery(pathOrURL, query);
  }
  const base = new URL(API_URL);
  if (pathOrURL.startsWith("?")) {
    const u = new URL(API_URL);
    const qs = new URLSearchParams(pathOrURL.slice(1));
    for (const [k, v] of qs.entries()) u.searchParams.set(k, v);
    for (const [k, v] of Object.entries(query)) u.searchParams.set(k, v);
    return u.toString();
  }
  const u = new URL(API_URL);
  for (const [k, v] of Object.entries(query)) u.searchParams.set(k, v);
  return u.toString();
}

function appendQuery(url, query = {}) {
  const u = new URL(url);
  for (const [k, v] of Object.entries(query)) u.searchParams.set(k, v);
  return u.toString();
}
