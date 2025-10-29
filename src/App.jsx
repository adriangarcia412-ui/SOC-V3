import React, { useEffect, useMemo, useState } from "react";
import "./modern.css";
import { API_URL, postJSON, api } from "./config";

/* =============== CONFIG & KEYS ================= */
const STORAGE_KEY_DRAFTS = "soc_v3_drafts_v2";

/* =============== UTILIDADES ================= */
const uid = (len = 6) => Math.random().toString(36).slice(2, 2 + len);
const nowISO = () => new Date().toISOString();
const percent = (num, den) => (!den ? 0 : Number.isFinite(Math.round((num / den) * 100)) ? Math.round((num / den) * 100) : 0);

/* =============== ÍTEMS ================= */
const ITEMS = [
  "Usa herramientas adecuadas para la tarea / 使用适当的工具完成任务",
  "Se usan los equipos de manera segura, sin improvisaciones / 安全使用设备，无即兴操作",
  "Usa correctamente el EPP (colocado y ajustado) / 正确使用并佩戴好PPE防护装备",
  "El área está limpia y libre de materiales fuera de lugar / 区域干净、无杂物",
  "Realiza correctamente la manipulación de las cargas / 正确进行搬运操作",
  "No presenta distracciones por celular durante la ejecución / 作业中无手机分心行为",
  "Los equipos se encuentran en buen estado y funcionales / 设备状况良好，功能正常",
  "Ejecuta sus actividades conforme a la instrucción de trabajo / 按作业指导执行工作",
  "Levanta objetos con técnica correcta / 正确使用抬举技巧",
  "Verifica el estado de sus herramientas / 工具设备点检完好",
];

const emptyRow = () => ({ inicial: "", final: "" });
const emptyForm = () => ({
  id: "",
  fecha: "",
  nombre: "",
  antiguedad: "",
  area: "",
  supervisor: "",
  evaluaciones: ITEMS.map(() => emptyRow()),
});

/* ===================================================== */
export default function App() {
  const [form, setForm] = useState(emptyForm());
  const [pctInicial, setPctInicial] = useState(0);
  const [pctFinal, setPctFinal] = useState(0);

  // Lista de pendientes que ahora vendrá de la NUBE (y local como respaldo)
  const [drafts, setDrafts] = useState([]);
  const [msg, setMsg] = useState(null);
  const [loadingPend, setLoadingPend] = useState(false);

  /* ---------- cálculo de % ---------- */
  useEffect(() => {
    const total = form.evaluaciones.length;
    const siI = form.evaluaciones.filter((r) => r.inicial === "SI").length;
    const siF = form.evaluaciones.filter((r) => r.final === "SI").length;
    setPctInicial(percent(siI, total));
    setPctFinal(percent(siF, total));
  }, [form.evaluaciones]);

  /* ---------- carga de pendientes desde la NUBE ---------- */
  const refreshPendingsFromCloud = async () => {
    setLoadingPend(true);
    try {
      const res = await api.listPending();
      // Se espera { ok:true, rows:[{id,iso,nombre,area,supervisor,pctInicial,pctFinal,evaluaciones,fecha,antiguedad}, ...] }
      if (res?.ok && Array.isArray(res.rows)) {
        setDrafts(res.rows);
        // respaldo local (opcional)
        try {
          localStorage.setItem(STORAGE_KEY_DRAFTS, JSON.stringify(res.rows));
        } catch {}
      } else {
        // Si falla la nube, intenta cargar respaldo local
        const raw = localStorage.getItem(STORAGE_KEY_DRAFTS);
        setDrafts(raw ? JSON.parse(raw) : []);
      }
    } catch {
      const raw = localStorage.getItem(STORAGE_KEY_DRAFTS);
      setDrafts(raw ? JSON.parse(raw) : []);
    } finally {
      setLoadingPend(false);
    }
  };

  useEffect(() => {
    refreshPendingsFromCloud();
  }, []);

  /* ---------- handlers ---------- */
  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const updateEval = (rowIndex, columna, value) => {
    setForm((f) => {
      const copia = structuredClone(f.evaluaciones);
      const row = { ...copia[rowIndex] };
      if (columna === "inicial") row.inicial = value;
      else row.final = value;
      copia[rowIndex] = row;
      return { ...f, evaluaciones: copia };
    });
  };

  /* ---------- guardar borrador (NUBE + respaldo local) ---------- */
  const guardarBorrador = async () => {
    const basicFilled =
      (form.nombre || form.area || form.supervisor || form.fecha) &&
      form.evaluaciones.length === ITEMS.length;

    if (!basicFilled) {
      setMsg({ type: "error", text: "Completa datos básicos antes de guardar el borrador." });
      return;
    }

    const id = form.id || `PEND-${uid(8)}`;
    const nuevo = {
      ...form,
      id,
      iso: nowISO(),
      pctInicial,
      pctFinal,
    };

    // Guarda en la nube
    const r = await api.savePending(nuevo);
    if (r?.ok) {
      setMsg({ type: "ok", text: `Borrador guardado en la nube: ${id}` });
      setForm((f) => ({ ...f, id }));
      await refreshPendingsFromCloud();
    } else {
      setMsg({ type: "error", text: "No se pudo guardar en la nube. Reintenta." });
    }
  };

  /* ---------- reanudar ---------- */
  const reanudar = (d) => {
    // Si en la hoja guardamos el JSON completo, `d.evaluaciones` vendrá lleno;
    // si no, cae a vacío.
    setForm({
      id: d.id || "",
      fecha: d.fecha || "",
      nombre: d.nombre || "",
      antiguedad: d.antiguedad || "",
      area: d.area || "",
      supervisor: d.supervisor || "",
      evaluaciones:
        Array.isArray(d.evaluaciones) && d.evaluaciones.length === ITEMS.length
          ? d.evaluaciones
          : ITEMS.map(() => emptyRow()),
    });
    setMsg({ type: "ok", text: `Reanudando caso ${d.id}` });
  };

  /* ---------- eliminar pendiente ---------- */
  const eliminarDraft = async (id) => {
    const r = await api.deletePending(id);
    if (r?.ok) {
      setMsg({ type: "ok", text: `Pendiente eliminado: ${id}` });
      await refreshPendingsFromCloud();
    } else {
      setMsg({ type: "error", text: "No se pudo eliminar el pendiente." });
    }
  };

  /* ---------- enviar (cerrar caso) ---------- */
  const enviar = async () => {
    const hayAlgo =
      form.evaluaciones.some((r) => r.inicial) ||
      form.evaluaciones.some((r) => r.final);

    if (!hayAlgo) {
      setMsg({ type: "error", text: "Selecciona al menos una opción en Inicial o Final." });
      return;
    }

    const payload = {
      id: form.id || `REG-${uid(10)}`,
      ts: nowISO(),
      fecha: form.fecha,
      nombre: form.nombre,
      antiguedad: form.antiguedad,
      area: form.area,
      supervisor: form.supervisor,
      pctInicial,
      pctFinal,
      rows: form.evaluaciones,
    };

    const r = await api.closeCase(payload);
    if (r?.ok) {
      setMsg({ type: "ok", text: "Caso enviado a Google Sheets correctamente." });
      setForm(emptyForm());
      // al cerrar, el backend debe retirar el pendiente; refrescamos lista
      await refreshPendingsFromCloud();
    } else {
      setMsg({ type: "error", text: "No se pudo enviar el caso." });
    }
  };

  /* ---------- UI helpers ---------- */
  const Msg = useMemo(() => {
    if (!msg) return null;
    return <div className={msg.type === "ok" ? "ok" : "error"} style={{ marginTop: 12 }}>{msg.text}</div>;
  }, [msg]);

  /* ============================== RENDER ============================== */
  return (
    <div className="container">
      <header className="header">
        <div className="brand">
          <img src="/hengli-logo.svg" alt="Hengli" className="brand-logo" />
          <div>
            <h1 className="title">SOC V3</h1>
            <p className="subtitle">Sistema de Observación de Comportamientos</p>
            <p className="subtitle-cn">行为观察系统</p>
          </div>
        </div>
      </header>

      {/* Información del empleado */}
      <section className="card">
        <h2>Información del empleado / 员工信息</h2>
        <div className="grid-2">
          <div className="field">
            <label>Fecha y hora / 日期和时间:</label>
            <input type="datetime-local" value={form.fecha} onChange={(e) => setField("fecha", e.target.value)} />
          </div>
          <div className="field">
            <label>Nombre del empleado / 员工姓名:</label>
            <input type="text" value={form.nombre} onChange={(e) => setField("nombre", e.target.value)} placeholder="Nombre y apellido" />
          </div>
          <div className="field">
            <label>Antigüedad / 工龄:</label>
            <input type="text" value={form.antiguedad} onChange={(e) => setField("antiguedad", e.target.value)} placeholder="Ej. 2 años" />
          </div>
          <div className="field">
            <label>Área / 区域:</label>
            <input type="text" value={form.area} onChange={(e) => setField("area", e.target.value)} placeholder="Área" />
          </div>
          <div className="field">
            <label>Supervisor / 主管:</label>
            <input type="text" value={form.supervisor} onChange={(e) => setField("supervisor", e.target.value)} placeholder="Supervisor" />
          </div>
        </div>

        <div className="actions">
          <button onClick={guardarBorrador}>Guardar borrador</button>
          <button onClick={() => { setForm(emptyForm()); setMsg(null); }}>Limpiar formulario</button>
        </div>
        {Msg}
      </section>

      {/* Evaluación */}
      <section className="card">
        <h2>Evaluación / 评估</h2>
        <p className="hint">Marca solo <b>una</b> opción por columna (Inicial o Final) en cada fila.</p>

        <div className="eval-table">
          <div className="thead">
            <div className="th item">Ítem / 项目</div>
            <div className="th">Inicial Sí / 初始是</div>
            <div className="th">Inicial No / 初始否</div>
            <div className="th">Final Sí / 最终是</div>
            <div className="th">Final No / 最终否</div>
          </div>

          <div className="tbody">
            {ITEMS.map((txt, idx) => {
              const r = form.evaluaciones[idx] || emptyRow();
              return (
                <div className="tr" key={idx}>
                  <div className="td item"><div className="item-text">{txt}</div></div>
                  <div className="td radio">
                    <input type="radio" name={`r${idx}-inicial`} checked={r.inicial === "SI"} onChange={() => updateEval(idx, "inicial", "SI")} />
                  </div>
                  <div className="td radio">
                    <input type="radio" name={`r${idx}-inicial`} checked={r.inicial === "NO"} onChange={() => updateEval(idx, "inicial", "NO")} />
                  </div>
                  <div className="td radio">
                    <input type="radio" name={`r${idx}-final`} checked={r.final === "SI"} onChange={() => updateEval(idx, "final", "SI")} />
                  </div>
                  <div className="td radio">
                    <input type="radio" name={`r${idx}-final`} checked={r.final === "NO"} onChange={() => updateEval(idx, "final", "NO")} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="summary">
          <div className="field">
            <label>Porcentaje de cumplimiento inicial (%):</label>
            <input value={pctInicial} readOnly />
          </div>
          <div className="field">
            <label>Porcentaje de cumplimiento final (%):</label>
            <input value={pctFinal} readOnly />
          </div>
        </div>

        <div className="actions">
          <button onClick={enviar}>Enviar a Google Sheets (cerrar caso)</button>
        </div>
      </section>

      {/* Casos pendientes (nube) */}
      <section className="card">
        <h2>Casos pendientes (guardados localmente y en la nube)</h2>
        {loadingPend ? (
          <div className="hint">Cargando pendientes…</div>
        ) : drafts.length === 0 ? (
          <div className="hint">No hay pendientes.</div>
        ) : (
          <div className="pending">
            <div className="pending-head">
              <div className="col id">ID</div>
              <div className="col when">Guardado</div>
              <div className="col who">Nombre</div>
              <div className="col area">Área</div>
              <div className="col boss">Supervisor</div>
              <div className="col act">Acciones</div>
            </div>
            {drafts.map((d) => (
              <div className="pending-row" key={d.id}>
                <div className="col id">{d.id}</div>
                <div className="col when">{new Date(d.iso || d.ts || Date.now()).toLocaleString()}</div>
                <div className="col who">{d.nombre || "-"}</div>
                <div className="col area">{d.area || "-"}</div>
                <div className="col boss">{d.supervisor || "-"}</div>
                <div className="col act">
                  <button onClick={() => reanudar(d)}>Reanudar</button>
                  <button className="danger" onClick={() => eliminarDraft(d.id)}>Eliminar</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <footer className="footer">
        <span>Hengli · SOC V3</span>
      </footer>
    </div>
  );
}
