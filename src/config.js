// src/config.js

// === URL del backend (Apps Script) ===
export const API_URL =
  "https://script.google.com/macros/s/AKfycbw-oreEqAmNrXg208Y0RlGY_mkqKasLOKRh7YAJcSb6QtZgd4neplWXM3HDbLK2Tvnh2g/exec";

// === Helpers HTTP ===
export async function postJSON(url, payload) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json;charset=utf-8" },
    body: JSON.stringify(payload ?? {}),
  });
  // Si Apps Script devuelve JSON con { ok: true/false, ... }
  try {
    return await res.json();
  } catch {
    return { ok: false, error: "Respuesta no JSON del servidor" };
  }
}

// Acciones de conveniencia (opcional)
export const api = {
  savePending: (record) => postJSON(API_URL, { action: "SAVE_PENDING", payload: record }),
  listPending: () => postJSON(API_URL, { action: "LIST_PENDING" }),
  deletePending: (id) => postJSON(API_URL, { action: "DELETE_PENDING", id }),
  closeCase: (record) => postJSON(API_URL, { action: "CLOSE_CASE", payload: record }),
};
