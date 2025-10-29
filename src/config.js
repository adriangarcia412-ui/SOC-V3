// src/config.js
// Centraliza la URL del backend y helpers de fetch JSON

export const API_URL =
  "https://script.google.com/macros/s/AKfycbzMZl3qsIIIwIUAPGUk1JYt1CuPP3BI4Aq9WK5ZlAslrgNg4PPD5aQEcSe07Ce43stkLQ/exec";

// Helper POST JSON
export async function postJSON(url, data) {
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data || {}),
  });
  return resp.json();
}

// Helper GET JSON (por si hicieras pings o lecturas simples)
export async function getJSON(url) {
  const resp = await fetch(url);
  return resp.json();
}
