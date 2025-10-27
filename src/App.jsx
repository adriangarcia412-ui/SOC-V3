// ======= App.jsx (REEMPLAZA TODO EL ARCHIVO) =======
import React, { useEffect, useState } from "react";
import "./modern.css";

/** ⛳️ CONFIGURACIÓN */
// Tu WebApp de Apps Script (la misma que ya usas y funciona):
const SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbz2jHR--ztUyX-PE78lvjG4GXKbtdDJ5e3jJDgPtRaFcCDh258hu9slB4SAxgFkMPmIOg/exec";

const STORAGE_KEY = "SOC_V3_PENDIENTES"; // ahora guardamos un ARREGLO
const ID_PREFIX = "PEND-";

/** Helper: id corto legible */
function makeId() {
  const rnd = Math.random().toString(36).slice(2, 7);
  const ts = Date.now().toString(36).slice(-4);
  return `${ID_PREFIX}${ts}-${rnd}`;
}

/** Ítems de evaluación (ajusta tu lista si hace falta) */
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

/** Estado inicial del formulario */
function emptyForm() {
  return {
    id: "",
    fase: "INICIAL", // INICIAL o FINAL
    fecha: "",
    nombre: "",
    antiguedad: "",
    area: "",
    supervisor: "",
    evaluaciones: items.map(() => ({ inicialSi: "", inicialNo: "", finalSi: "", finalNo: "" })),
    pctInicial: 0,
    pctFinal: 0,
  };
}

export default function App() {
  const [form, setForm] = useState(emptyForm());
  const [okMsg, setOkMsg] = useState("");
  const [errMsg, setErrMsg] = useState("");

  /** PENDIENTES LOCAL */
  const [localPend, setLocalPend] = useState([]);
  /** PENDIENTES NUBE */
  const [cloudPend, setCloudPend] = useState([]);
  const [loadingCloud, setLoadingCloud] = useState(false);

  /** Cargar borradores locales al abrir */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      setLocalPend(raw ? JSON.parse(raw) : []);
    } catch {
      setLocalPend([]);
    }
  }, []);

  /** Guardar arreglo local cada vez que cambie */
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(localPend));
  }, [localPend]);

  /** Helpers de seteo */
  const setField = (k, v) => setForm((s) => ({ ...s, [k]: v }));

  /** Reglas: marcar sólo UNA opción por columna por fila */
  const handleRadio = (rowIdx, colKey) => {
    setForm((s) => {
      const next = structuredClone(s);
      if (colKey === "inicialSi") {
        next.evaluaciones[rowIdx].inicialNo = "";
        next.evaluaciones[rowIdx].inicialSi = "SI";
      } else if (colKey === "inicialNo") {
        next.evaluaciones[rowIdx].inicialSi = "";
        next.evaluaciones[rowIdx].inicialNo = "NO";
      } else if (colKey === "finalSi") {
        next.evaluaciones[rowIdx].finalNo = "";
        next.evaluaciones[rowIdx].finalSi = "SI";
      } else if (colKey === "finalNo") {
        next.evaluaciones[rowIdx].finalSi = "";
        next.evaluaciones[rowIdx].finalNo = "NO";
      }
      return next;
    });
  };

  /** % auto (INICIAL) */
  useEffect(() => {
    const tot = form.evaluaciones.length;
    const ok = form.evaluaciones.filter((e) => e.inicialSi === "SI").length;
    const p = Math.round((ok / tot) * 100);
    if (p !== form.pctInicial) setField("pctInicial", p);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.evaluaciones]);

  /** ====== GUARDAR BORRADOR (LOCAL + NUBE) ====== */
  const saveDraft = async () => {
    try {
      const id = form.id || makeId();
      const payload = { ...form, id, fase: "INICIAL", fecha: new Date().toISOString() };

      // 1) Guardar en LOCAL (multi)
      setLocalPend((arr) => {
        const filtered = arr.filter((d) => d.id !== id);
        return [
          ...filtered,
          {
            id,
            ts: Date.now(),
            nombre: payload.nombre || "",
            antiguedad: payload.antiguedad || "",
            area: payload.area || "",
            supervisor: payload.supervisor || "",
            pctInicial: payload.pctInicial || 0,
            evaluaciones: payload.evaluaciones,
          },
        ];
      });

      // 2) Guardar en NUBE
      await fetch(SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save_draft", draft: payload }),
      });

      setForm((s) => ({ ...s, id })); // fija el id al form
      flashOk(`Borrador guardado: ${id}`);
      await loadCloudDrafts(); // refresca lista nube
    } catch (e) {
      console.error(e);
      flashErr("No pude guardar el borrador.");
    }
  };

  /** Cargar borradores en la nube */
  const loadCloudDrafts = async () => {
    try {
      setLoadingCloud(true);
      const r = await fetch(SCRIPT_URL + "?action=list_drafts");
      const j = await r.json();
      setCloudPend(Array.isArray(j.rows) ? j.rows : []);
    } catch (e) {
      console.error(e);
      setCloudPend([]);
    } finally {
      setLoadingCloud(false);
    }
  };
  useEffect(() => {
    loadCloudDrafts();
  }, []);

  /** Reanudar (LOCAL o NUBE) */
  const resumeLocal = (id) => {
    const d = localPend.find((x) => x.id === id);
    if (!d) return;
    setForm((s) => ({
      ...s,
      id: d.id,
      nombre: d.nombre,
      antiguedad: d.antiguedad,
      area: d.area,
      supervisor: d.supervisor,
      evaluaciones: d.evaluaciones,
      pctInicial: d.pctInicial || 0,
    }));
    flashOk(`Reanudando caso ${id}.`);
  };

  const resumeCloud = async (id) => {
    try {
      const r = await fetch(SCRIPT_URL + "?action=get_draft&id=" + encodeURIComponent(id));
      const j = await r.json();
      if (!j || !j.ok || !j.draft) return flashErr("No encontré ese borrador en nube.");
      const d = j.draft;
      setForm((s) => ({
        ...s,
        id: d.id,
        nombre: d.nombre || "",
        antiguedad: d.antiguedad || "",
        area: d.area || "",
        supervisor: d.supervisor || "",
        evaluaciones: Array.isArray(d.evaluaciones) ? d.evaluaciones : s.evaluaciones,
        pctInicial: Number(d.pctInicial || 0),
      }));
      flashOk(`Reanudando caso ${id}.`);
    } catch (e) {
      console.error(e);
      flashErr("No pude descargar ese borrador.");
    }
  };

  /** Eliminar borrador (LOCAL o NUBE) */
  const delLocal = (id) => {
    setLocalPend((arr) => arr.filter((x) => x.id !== id));
  };
  const delCloud = async (id) => {
    try {
      await fetch(SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete_draft", id }),
      });
      await loadCloudDrafts();
    } catch (e) {
      console.error(e);
      flashErr("No pude eliminar ese borrador en nube.");
    }
  };

  /** Enviar a Google Sheets (cerrar caso) */
  const sendToSheets = async () => {
    try {
      const payload = {
        id: form.id || makeId(),
        fase: "FINAL",
        ts: new Date().toISOString(),
        nombre: form.nombre || "",
        antiguedad: form.antiguedad || "",
        area: form.area || "",
        supervisor: form.supervisor || "",
        evaluaciones: form.evaluaciones,
        pct: form.pctFinal || 0,
      };
      const r = await fetch(SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await r.json();
      if (!j || !j.ok) throw new Error("Respuesta no OK");

      // Limpiar de local y nube
      setLocalPend((arr) => arr.filter((x) => x.id !== payload.id));
      await delCloud(payload.id);

      flashOk("Caso enviado y cerrado.");
      setForm(emptyForm());
    } catch (e) {
      console.error(e);
      flashErr("No pude enviar a Google Sheets.");
    }
  };

  /** Mensajes */
  const flashOk = (t) => {
    setOkMsg(t);
    setTimeout(() => setOkMsg(""), 3500);
  };
  const flashErr = (t) => {
    setErrMsg(t);
    setTimeout(() => setErrMsg(""), 4500);
  };

  /** UI encabezado */
  const header = (
    <>
      <h1>SOC V3</h1>
      <p>Sistema de Observación de Comportamientos</p>

      {okMsg && <div className="ok">{okMsg}</div>}
      {errMsg && <div className="error">{errMsg}</div>}

      <div className="grid2">
        <label>
          Fecha y hora:
          <input
            type="datetime-local"
            value={form.fecha}
            onChange={(e) => setField("fecha", e.target.value)}
          />
        </label>
        <label>
          Nombre del empleado:
          <input value={form.nombre} onChange={(e) => setField("nombre", e.target.value)} />
        </label>
        <label>
          Antigüedad:
          <input value={form.antiguedad} onChange={(e) => setField("antiguedad", e.target.value)} />
        </label>
        <label>
          Área:
          <input value={form.area} onChange={(e) => setField("area", e.target.value)} />
        </label>
        <label>
          Supervisor:
          <input value={form.supervisor} onChange={(e) => setField("supervisor", e.target.value)} />
        </label>
      </div>

      <div className="actions">
        <button onClick={saveDraft}>Guardar borrador</button>
        <button onClick={sendToSheets}>Enviar a Google Sheets (cerrar caso)</button>
      </div>
    </>
  );

  /** Tabla de evaluación */
  const table = (
    <>
      <p className="hint">Marca solo <b>una</b> opción por columna (Inicial o Final) en cada fila.</p>
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
          {items.map((txt, idx) => (
            <tr key={idx}>
              <td className="eval-item">{txt}</td>
              {["inicialSi", "inicialNo", "finalSi", "finalNo"].map((key) => (
                <td key={key} className="eval-cell">
                  <input
                    type="radio"
                    name={`row-${idx}-${key.includes("inicial") ? "inicial" : "final"}`}
                    checked={form.evaluaciones[idx][key] !== ""}
                    onChange={() => handleRadio(idx, key)}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="grid2 mt12">
        <label>
          Porcentaje de cumplimiento inicial (%):
          <input
            type="number"
            value={form.pctInicial}
            onChange={(e) => setField("pctInicial", Number(e.target.value || 0))}
          />
        </label>
        <label>
          Porcentaje de cumplimiento final (%):
          <input
            type="number"
            value={form.pctFinal}
            onChange={(e) => setField("pctFinal", Number(e.target.value || 0))}
          />
        </label>
      </div>
    </>
  );

  /** Tabla de pendientes (local) */
  const tableLocal = (
    <>
      <h2>Casos pendientes (guardados localmente)</h2>
      {localPend.length === 0 ? (
        <div className="draft-banner">No hay pendientes.</div>
      ) : (
        <table className="pend-table">
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
            {localPend
              .slice()
              .sort((a, b) => b.ts - a.ts)
              .map((d) => (
                <tr key={d.id}>
                  <td>{d.id}</td>
                  <td>{new Date(d.ts).toLocaleString()}</td>
                  <td>{d.nombre}</td>
                  <td>{d.area}</td>
                  <td>{d.supervisor}</td>
                  <td>{d.pctInicial}%</td>
                  <td className="td-actions">
                    <button onClick={() => resumeLocal(d.id)}>Reanudar</button>
                    <button className="danger" onClick={() => delLocal(d.id)}>
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      )}
    </>
  );

  /** Tabla de pendientes (nube) */
  const tableCloud = (
    <>
      <h2>Casos pendientes (guardados en la nube)</h2>
      {loadingCloud ? (
        <div className="draft-banner">Cargando…</div>
      ) : cloudPend.length === 0 ? (
        <div className="draft-banner">No hay pendientes en nube.</div>
      ) : (
        <table className="pend-table">
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
            {cloudPend.map((d) => (
              <tr key={d.id}>
                <td>{d.id}</td>
                <td>{d.ts_humano}</td>
                <td>{d.nombre}</td>
                <td>{d.area}</td>
                <td>{d.supervisor}</td>
                <td>{d.pct_inicial}%</td>
                <td className="td-actions">
                  <button onClick={() => resumeCloud(d.id)}>Reanudar</button>
                  <button className="danger" onClick={() => delCloud(d.id)}>
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );

  return (
    <div className="container">
      {header}
      <h2>Evaluación / 评估</h2>
      {table}
      <div className="mt16">
        {tableLocal}
        {tableCloud}
      </div>
      <footer>Hengli · SOC V3</footer>
    </div>
  );
}
// ======= FIN App.jsx =======
