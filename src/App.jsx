import React, { useEffect, useMemo, useState } from "react";
import "./modern.css";

/* ================== CONFIG ================== */
const SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbw-oreEqAmNrXg208Y0RlGY_mkqKasLOKRh7YAJcSb6QtZgd4neplWXM3HDbLK2Tvnh2g/exec";

const STORAGE_KEY_DRAFTS = "soc_v3_drafts";
const STORAGE_KEY_RESUME = "soc_v3_resume_id";

/* ============== UTILIDADES ============== */
const uid = (len = 5) =>
  Math.random().toString(36).slice(2, 2 + len);

const nowISO = () => new Date().toISOString();

function postJSON(url, payload) {
  return fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).then((r) => r.json());
}

function getJSON(url) {
  return fetch(url).then((r) => r.json());
}

/* ============== ITEMS ============== */
const items = [
  "Usa herramientas adecuadas para la tarea / 使用适当的工具完成任务",
  "Se usan los equipos de manera segura, sin improvisaciones / 安全使用设备，无即兴操作",
  "Usa correctamente el EPP (colocado y ajustado) / 正确使用并佩戴好PPE防护装备",
  "El área está limpia y libre de materiales fuera de lugar / 区域干净、无杂物",
  "Realiza correctamente la manipulación de las cargas / 正确进行搬运操作",
  "No presenta distracciones por celular durante la ejecución / 作业中无手机分心行为",
  "Los equipos se encuentran en buen estado y funcionales / 设备状况良好、功能正常",
  "Ejecuta sus actividades conforme a la instrucción de trabajo / 按作业指导执行工作",
  "Levanta objetos con técnica correcta / 正确使用抬举技巧",
  "Verifica el estado de sus herramientas / 工具设备点检完好",
];

/* ============== APP ============== */
export default function App() {
  const [form, setForm] = useState({
    fecha: "",
    nombre: "",
    antiguedad: "",
    area: "",
    supervisor: "",
    evaluaciones: items.map(() => ({
      inicialSi: false,
      inicialNo: false,
      finalSi: false,
      finalNo: false,
    })),
    pctInicial: 0,
    pctFinal: 0,
  });

  const [message, setMessage] = useState(null); // {type: 'ok'|'error', text: string}
  const [pending, setPending] = useState([]); // casos locales
  const [sheetDrafts, setSheetDrafts] = useState([]); // borradores en Google Sheet (multidispositivo)
  const [resumingId, setResumingId] = useState(null);

  /* ====== Cargar pendientes locales y sheet drafts ====== */
  useEffect(() => {
    // Local (múltiples)
    const raw = localStorage.getItem(STORAGE_KEY_DRAFTS);
    const arr = raw ? JSON.parse(raw) : [];
    setPending(arr);

    // Reanudar si hay id marcado
    const r = localStorage.getItem(STORAGE_KEY_RESUME);
    if (r) setResumingId(r);

    // Cargar drafts centralizados (para ver desde cualquier dispositivo)
    getJSON(`${SCRIPT_URL}?action=list_drafts`).then((j) => {
      if (j?.ok) setSheetDrafts(j.rows || []);
    });
  }, []);

  /* ====== Métricas automáticas ====== */
  const { pctInicial, pctFinal } = useMemo(() => {
    let iYes = 0,
      iCount = 0,
      fYes = 0,
      fCount = 0;
    form.evaluaciones.forEach((e) => {
      if (e.inicialSi || e.inicialNo) {
        iCount++;
        if (e.inicialSi) iYes++;
      }
      if (e.finalSi || e.finalNo) {
        fCount++;
        if (e.finalSi) fYes++;
      }
    });
    return {
      pctInicial: iCount ? Math.round((iYes / iCount) * 100) : 0,
      pctFinal: fCount ? Math.round((fYes / fCount) * 100) : 0,
    };
  }, [form.evaluaciones]);

  useEffect(() => {
    setForm((f) => ({ ...f, pctInicial, pctFinal }));
  }, [pctInicial, pctFinal]);

  /* ====== Handlers ====== */
  const updateField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleMark = (rowIdx, col) => {
    setForm((f) => {
      const eva = [...f.evaluaciones];
      const row = { ...eva[rowIdx] };
      if (col === "inicialSi") {
        row.inicialSi = true;
        row.inicialNo = false;
      } else if (col === "inicialNo") {
        row.inicialNo = true;
        row.inicialSi = false;
      } else if (col === "finalSi") {
        row.finalSi = true;
        row.finalNo = false;
      } else if (col === "finalNo") {
        row.finalNo = true;
        row.finalSi = false;
      }
      eva[rowIdx] = row;
      return { ...f, evaluaciones: eva };
    });
  };

  /* ====== Guardar borrador local (múltiples) ====== */
  const saveLocalDraft = () => {
    const id = `PEND-${uid(4)}-${uid(4)}`;
    const now = new Date();
    const entry = {
      id,
      savedAt: now.toISOString(),
      savedAtHuman: now.toLocaleString("es-MX"),
      nombre: form.nombre || "",
      antiguedad: form.antiguedad || "",
      area: form.area || "",
      supervisor: form.supervisor || "",
      pctInicial: form.pctInicial || 0,
      form,
    };
    const raw = localStorage.getItem(STORAGE_KEY_DRAFTS);
    const arr = raw ? JSON.parse(raw) : [];
    arr.unshift(entry); // acumular
    localStorage.setItem(STORAGE_KEY_DRAFTS, JSON.stringify(arr));
    setPending(arr);
    setMessage({ type: "ok", text: `Borrador local guardado: ${id}` });
  };

  const deleteLocalDraft = (id) => {
    const raw = localStorage.getItem(STORAGE_KEY_DRAFTS);
    const arr = raw ? JSON.parse(raw) : [];
    const next = arr.filter((x) => x.id !== id);
    localStorage.setItem(STORAGE_KEY_DRAFTS, JSON.stringify(next));
    setPending(next);
  };

  const resumeLocalDraft = (id) => {
    const raw = localStorage.getItem(STORAGE_KEY_DRAFTS);
    const arr = raw ? JSON.parse(raw) : [];
    const found = arr.find((x) => x.id === id);
    if (!found) return;
    setForm(found.form);
    setMessage({ type: "ok", text: `Reanudando caso ${id}.` });
  };

  /* ====== Guardar borrador centralizado (Sheet) ====== */
  const saveSheetDraft = async () => {
    const id = `PEND-${uid(4)}${uid(4)}`;
    const res = await postJSON(SCRIPT_URL, {
      action: "save_draft",
      draft: {
        id,
        nombre: form.nombre || "",
        antiguedad: form.antiguedad || "",
        area: form.area || "",
        supervisor: form.supervisor || "",
        pctInicial: form.pctInicial || 0,
        evaluaciones: form.evaluaciones || [],
      },
    });
    if (res?.ok) {
      setMessage({ type: "ok", text: `Borrador central guardado: ${id}` });
      // refrescar lista
      const j = await getJSON(`${SCRIPT_URL}?action=list_drafts`);
      if (j?.ok) setSheetDrafts(j.rows || []);
      // marcar para reanudar en otro dispositivo
      localStorage.setItem(STORAGE_KEY_RESUME, id);
    } else {
      setMessage({ type: "error", text: `Error guardando: ${res?.error || ""}` });
    }
  };

  const resumeSheetDraft = async (id) => {
    const j = await getJSON(`${SCRIPT_URL}?action=get_draft&id=${encodeURIComponent(id)}`);
    if (j?.ok && j.draft) {
      setForm((f) => ({
        ...f,
        nombre: j.draft.nombre || "",
        antiguedad: j.draft.antiguedad || "",
        area: j.draft.area || "",
        supervisor: j.draft.supervisor || "",
        evaluaciones: j.draft.evaluaciones || items.map(() => ({
          inicialSi:false,inicialNo:false,finalSi:false,finalNo:false
        })),
        pctInicial: j.draft.pctInicial || 0,
      }));
      setMessage({ type: "ok", text: `Reanudando caso ${id}` });
    } else {
      setMessage({ type: "error", text: `No se pudo reanudar ${id}` });
    }
  };

  const deleteSheetDraft = async (id) => {
    const r = await postJSON(SCRIPT_URL, { action: "delete_draft", id });
    if (r?.ok) {
      const j = await getJSON(`${SCRIPT_URL}?action=list_drafts`);
      if (j?.ok) setSheetDrafts(j.rows || []);
    }
  };

  /* ====== Enviar y cerrar caso ====== */
  const enviarGoogle = async () => {
    const payload = {
      fase: "FINAL",
      id: `REG-${uid(6)}-${uid(4)}`,
      ts: nowISO(),
      nombre: form.nombre,
      antiguedad: form.antiguedad,
      area: form.area,
      supervisor: form.supervisor,
      evaluaciones: form.evaluaciones,
      pct: form.pctFinal,
    };
    const r = await postJSON(SCRIPT_URL, payload);
    if (r?.ok) {
      setMessage({ type: "ok", text: `Enviado. ID: ${r.id}` });
      // limpiar reanudar
      localStorage.removeItem(STORAGE_KEY_RESUME);
    } else {
      setMessage({ type: "error", text: r?.error || "Error al enviar" });
    }
  };

  return (
    <div className="container">
      <header className="header">
        <h1 className="brand"><span>Hengli ·</span> SOC V3</h1>
        <p className="subtitle">Sistema de Observación de Comportamientos</p>
      </header>

      {/* Datos del empleado */}
      <section className="card">
        <h2>Información del empleado / 员工信息</h2>
        <div className="grid-2">
          <label>
            Fecha y hora
            <input
              type="datetime-local"
              value={form.fecha}
              onChange={(e) => updateField("fecha", e.target.value)}
            />
          </label>
          <label>
            Nombre del empleado
            <input
              value={form.nombre}
              onChange={(e) => updateField("nombre", e.target.value)}
              placeholder="Nombre y apellido"
            />
          </label>
          <label>
            Antigüedad
            <input
              value={form.antiguedad}
              onChange={(e) => updateField("antiguedad", e.target.value)}
              placeholder="Ej. 2 años"
            />
          </label>
          <label>
            Área
            <input
              value={form.area}
              onChange={(e) => updateField("area", e.target.value)}
              placeholder="Área"
            />
          </label>
          <label>
            Supervisor
            <input
              value={form.supervisor}
              onChange={(e) => updateField("supervisor", e.target.value)}
              placeholder="Supervisor"
            />
          </label>
        </div>

        <div className="actions">
          <button onClick={saveLocalDraft}>Guardar borrador (local)</button>
          <button onClick={saveSheetDraft}>Guardar borrador (multidispositivo)</button>
          <button className="primary" onClick={enviarGoogle}>Enviar a Google Sheets (cerrar caso)</button>
        </div>

        {message && (
          <div className={message.type === "ok" ? "ok" : "error"}>
            {message.text}
          </div>
        )}
      </section>

      {/* Evaluación */}
      <section className="card">
        <h2>Marca solo <strong>una</strong> columna por fila (Inicial o Final).</h2>
        <table className="eval-table">
          <thead>
            <tr>
              <th className="col-item">Ítem / 项目</th>
              <th>Inicial Sí / 初始是</th>
              <th>Inicial No / 初始否</th>
              <th>Final Sí / 最终是</th>
              <th>Final No / 最终否</th>
            </tr>
          </thead>
          <tbody>
            {items.map((txt, idx) => {
              const e = form.evaluaciones[idx];
              return (
                <tr key={idx}>
                  <td className="eval-item">{txt}</td>
                  <td className="eval-cell">
                    <input
                      type="radio"
                      name={`ini-${idx}`}
                      checked={e.inicialSi}
                      onChange={() => handleMark(idx, "inicialSi")}
                    />
                  </td>
                  <td className="eval-cell">
                    <input
                      type="radio"
                      name={`ini-${idx}`}
                      checked={e.inicialNo}
                      onChange={() => handleMark(idx, "inicialNo")}
                    />
                  </td>
                  <td className="eval-cell">
                    <input
                      type="radio"
                      name={`fin-${idx}`}
                      checked={e.finalSi}
                      onChange={() => handleMark(idx, "finalSi")}
                    />
                  </td>
                  <td className="eval-cell">
                    <input
                      type="radio"
                      name={`fin-${idx}`}
                      checked={e.finalNo}
                      onChange={() => handleMark(idx, "finalNo")}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <div className="grid-2 mt-12">
          <label>
            Porcentaje de cumplimiento inicial (%)
            <input value={form.pctInicial} readOnly />
          </label>
          <label>
            Porcentaje de cumplimiento final (%)
            <input value={form.pctFinal} readOnly />
          </label>
        </div>
      </section>

      {/* Casos locales (múltiples) */}
      <section className="card">
        <h2>Casos pendientes (guardados localmente)</h2>
        {pending.length === 0 ? (
          <div className="note">No hay pendientes.</div>
        ) : (
          <div className="pending">
            <table className="list">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Guardado</th>
                  <th>Nombre</th>
                  <th>Área</th>
                  <th>Supervisor</th>
                  <th>% Inicial</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {pending.map((p) => (
                  <tr key={p.id}>
                    <td>{p.id}</td>
                    <td>{p.savedAtHuman}</td>
                    <td>{p.nombre}</td>
                    <td>{p.area}</td>
                    <td>{p.supervisor}</td>
                    <td>{p.pctInicial}%</td>
                    <td className="row-actions">
                      <button onClick={() => resumeLocalDraft(p.id)}>Reanudar</button>
                      <button className="danger" onClick={() => deleteLocalDraft(p.id)}>
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Borradores centralizados (multidispositivo) */}
      <section className="card">
        <h2>Borradores centralizados (ver en cualquier dispositivo)</h2>
        {sheetDrafts.length === 0 ? (
          <div className="note">No hay borradores centralizados.</div>
        ) : (
          <div className="pending">
            <table className="list">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Guardado</th>
                  <th>Nombre</th>
                  <th>Área</th>
                  <th>Supervisor</th>
                  <th>% Inicial</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {sheetDrafts.map((p) => (
                  <tr key={p.id}>
                    <td>{p.id}</td>
                    <td>{p.ts_humano}</td>
                    <td>{p.nombre}</td>
                    <td>{p.area}</td>
                    <td>{p.supervisor}</td>
                    <td>{p.pct_inicial}%</td>
                    <td className="row-actions">
                      <button onClick={() => resumeSheetDraft(p.id)}>Reanudar</button>
                      <button className="danger" onClick={() => deleteSheetDraft(p.id)}>
                        Eliminar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <footer className="footer">Hengli · SOC V3</footer>
    </div>
  );
}
