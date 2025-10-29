import React, { useEffect, useMemo, useState } from "react";
import "./modern.css";
import { API_URL, postJSON } from "./config";

/* =============== CONFIG & KEYS ================= */
const STORAGE_KEY_DRAFTS = "soc_v3_drafts_v2"; // v2 para evitar colisión con versiones anteriores

/* =============== UTILIDADES ================= */
const uid = (len = 6) => Math.random().toString(36).slice(2, 2 + len);
const nowISO = () => new Date().toISOString();

function percent(num, den) {
  if (!den) return 0;
  const p = Math.round((num / den) * 100);
  return Number.isFinite(p) ? p : 0;
}

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

/* =============== MODELO DE FORMULARIO =============== */
const emptyRow = () => ({ inicial: "", final: "" }); // "SI" | "NO" | ""
const emptyForm = () => ({
  id: "",        // ID local (borrador local)
  cloudId: "",   // ID en la nube (pendiente Apps Script)
  fecha: "",
  nombre: "",
  antiguedad: "",
  area: "",
  supervisor: "",
  evaluaciones: ITEMS.map(() => emptyRow()),
});

/* =====================================================
                        COMPONENTE
   ===================================================== */
export default function App() {
  const [form, setForm] = useState(emptyForm());
  const [pctInicial, setPctInicial] = useState(0);
  const [pctFinal, setPctFinal] = useState(0);

  // Borradores locales (múltiples)
  const [drafts, setDrafts] = useState([]);

  // Pendientes en la nube
  const [cloudPendings, setCloudPendings] = useState([]);
  const [cloudLoading, setCloudLoading] = useState(false);

  // Mensajes
  const [msg, setMsg] = useState(null);

  /* ---------- cargar drafts del localStorage ---------- */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_DRAFTS);
      const list = raw ? JSON.parse(raw) : [];
      if (Array.isArray(list)) setDrafts(list);
    } catch {
      setDrafts([]);
    }
  }, []);

  /* ---------- cargar lista nube al montar ---------- */
  useEffect(() => {
    fetchCloudPendings();
  }, []);

  /* ---------- recálculo de % inicial/final ---------- */
  useEffect(() => {
    const total = form.evaluaciones.length;
    const siInicial = form.evaluaciones.filter((r) => r.inicial === "SI").length;
    const siFinal = form.evaluaciones.filter((r) => r.final === "SI").length;
    setPctInicial(percent(siInicial, total));
    setPctFinal(percent(siFinal, total));
  }, [form.evaluaciones]);

  /* ---------- handlers básicos ---------- */
  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  // Selección por columna (inicial/final) con exclusión por fila
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

  /* ---------- guardar borrador (LOCAL, múltiples) ---------- */
  const guardarBorrador = () => {
    const basicFilled =
      (form.nombre || form.area || form.supervisor || form.fecha) &&
      form.evaluaciones.length === ITEMS.length;

    if (!basicFilled) {
      setMsg({ type: "error", text: "Completa datos básicos antes de guardar el borrador." });
      return;
    }

    const id = form.id || `PEND-${uid(8)}`;
    const nuevo = { ...form, id, iso: nowISO(), pctInicial, pctFinal };

    const next = (() => {
      const exists = drafts.find((d) => d.id === id);
      if (exists) return drafts.map((d) => (d.id === id ? nuevo : d));
      return [nuevo, ...drafts];
    })();

    try {
      localStorage.setItem(STORAGE_KEY_DRAFTS, JSON.stringify(next));
      setDrafts(next);
      setForm((f) => ({ ...f, id })); // conservar ID local
      setMsg({ type: "ok", text: `Borrador guardado como ${id}` });
    } catch {
      setMsg({ type: "error", text: "No se pudo guardar el borrador (almacenamiento local)." });
    }
  };

  /* ---------- NUBE: guardar pendiente en Apps Script ---------- */
  const savePendingToCloud = async () => {
    const basicFilled =
      (form.nombre || form.area || form.supervisor || form.fecha) &&
      form.evaluaciones.length === ITEMS.length;

    if (!basicFilled) {
      setMsg({ type: "error", text: "Completa datos básicos antes de guardar en la nube." });
      return;
    }

    try {
      setCloudLoading(true);
      const payload = {
        action: "SAVE_PENDING",
        ts: nowISO(),
        id: form.cloudId || `CLOUD-${uid(10)}`,
        nombre: form.nombre || "",
        area: form.area || "",
        supervisor: form.supervisor || "",
        pctInicial,
        pctFinal,
        json: JSON.stringify({ ...form, cloudId: form.cloudId || "" }),
      };
      const resp = await postJSON(API_URL, payload);
      if (resp?.ok) {
        setForm((f) => ({ ...f, cloudId: payload.id }));
        setMsg({ type: "ok", text: `Guardado en la nube como ${payload.id}` });
        await fetchCloudPendings();
      } else {
        setMsg({ type: "error", text: `No se pudo guardar en nube: ${JSON.stringify(resp)}` });
      }
    } catch {
      setMsg({ type: "error", text: "Error de red al guardar en la nube." });
    } finally {
      setCloudLoading(false);
    }
  };

  /* ---------- NUBE: listar pendientes ---------- */
  const fetchCloudPendings = async () => {
    try {
      setCloudLoading(true);
      const resp = await postJSON(API_URL, { action: "LIST_PENDING" });
      if (resp?.ok && Array.isArray(resp.rows)) setCloudPendings(resp.rows);
      else setCloudPendings([]);
    } catch {
      setCloudPendings([]);
    } finally {
      setCloudLoading(false);
    }
  };

  /* ---------- NUBE: reanudar pendiente ---------- */
  const resumeCloudPending = (p) => {
    try {
      const parsed = p?.json ? JSON.parse(p.json) : null;
      if (!parsed) throw new Error("Sin JSON de formulario.");
      setForm({
        ...emptyForm(),
        ...parsed,
        cloudId: p.id,
        evaluaciones:
          Array.isArray(parsed.evaluaciones) && parsed.evaluaciones.length === ITEMS.length
            ? parsed.evaluaciones
            : ITEMS.map(() => emptyRow()),
      });
      setMsg({ type: "ok", text: `Reanudando caso nube ${p.id}` });
    } catch {
      setMsg({ type: "error", text: "No se pudo reanudar: JSON inválido." });
    }
  };

  /* ---------- NUBE: eliminar pendiente ---------- */
  const deleteCloudPending = async (id) => {
    try {
      setCloudLoading(true);
      const resp = await postJSON(API_URL, { action: "DELETE_PENDING", id });
      if (resp?.ok) {
        setMsg({ type: "ok", text: `Pendiente ${id} eliminado de la nube.` });
        await fetchCloudPendings();
        if (form.cloudId === id) setForm(emptyForm());
      } else {
        setMsg({ type: "error", text: `No se pudo eliminar: ${JSON.stringify(resp)}` });
      }
    } catch {
      setMsg({ type: "error", text: "Error de red al eliminar pendiente." });
    } finally {
      setCloudLoading(false);
    }
  };

  /* ---------- reanudar/eliminar borrador local ---------- */
  const reanudar = (draft) => {
    setForm({
      id: draft.id,
      cloudId: draft.cloudId || "",
      fecha: draft.fecha || "",
      nombre: draft.nombre || "",
      antiguedad: draft.antiguedad || "",
      area: draft.area || "",
      supervisor: draft.supervisor || "",
      evaluaciones:
        Array.isArray(draft.evaluaciones) && draft.evaluaciones.length === ITEMS.length
          ? draft.evaluaciones
          : ITEMS.map(() => emptyRow()),
    });
    setMsg({ type: "ok", text: `Reanudando caso ${draft.id}` });
  };
  const eliminarDraft = (id) => {
    const next = drafts.filter((d) => d.id !== id);
    localStorage.setItem(STORAGE_KEY_DRAFTS, JSON.stringify(next));
    setDrafts(next);
    if (form.id === id) setForm(emptyForm());
  };

  /* ---------- enviar a Google Sheets (cerrar caso) ---------- */
  const enviar = async () => {
    const hayAlgo =
      form.evaluaciones.some((r) => r.inicial) ||
      form.evaluaciones.some((r) => r.final);

    if (!hayAlgo) {
      setMsg({ type: "error", text: "Selecciona al menos una opción en Inicial o Final." });
      return;
    }

    const payload = {
      action: "CLOSE_CASE",
      ts: nowISO(),
      id: form.id || form.cloudId || `REG-${uid(10)}`,
      fecha: form.fecha,
      nombre: form.nombre,
      antiguedad: form.antiguedad,
      area: form.area,
      supervisor: form.supervisor,
      pctInicial,
      pctFinal,
      rows: form.evaluaciones,
    };

    try {
      const resp = await postJSON(API_URL, payload);
      if (resp?.ok) {
        setMsg({ type: "ok", text: "Caso enviado a Google Sheets correctamente." });

        if (form.cloudId) {
          try { await postJSON(API_URL, { action: "DELETE_PENDING", id: form.cloudId }); } catch {}
          await fetchCloudPendings();
        }
        if (form.id) eliminarDraft(form.id);

        setForm(emptyForm());
      } else {
        setMsg({ type: "error", text: `No se pudo enviar. Respuesta: ${JSON.stringify(resp)}` });
      }
    } catch {
      setMsg({ type: "error", text: "Error de red al enviar el caso." });
    }
  };

  /* ---------- UI helpers ---------- */
  const Msg = useMemo(() => {
    if (!msg) return null;
    return (
      <div className={msg.type === "ok" ? "ok" : "error"} style={{ marginTop: 12 }}>
        {msg.text}
      </div>
    );
  }, [msg]);

  /* =====================================================
                          RENDER
     ===================================================== */
  return (
    <div className="container">
      {/* Encabezado */}
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
            <input
              type="datetime-local"
              value={form.fecha}
              onChange={(e) => setField("fecha", e.target.value)}
            />
          </div>
          <div className="field">
            <label>Nombre del empleado / 员工姓名:</label>
            <input
              type="text"
              value={form.nombre}
              onChange={(e) => setField("nombre", e.target.value)}
              placeholder="Nombre y apellido"
            />
          </div>
          <div className="field">
            <label>Antigüedad / 工龄:</label>
            <input
              type="text"
              value={form.antiguedad}
              onChange={(e) => setField("antiguedad", e.target.value)}
              placeholder="Ej. 2 años"
            />
          </div>
          <div className="field">
            <label>Área / 区域:</label>
            <input
              type="text"
              value={form.area}
              onChange={(e) => setField("area", e.target.value)}
              placeholder="Área"
            />
          </div>
          <div className="field">
            <label>Supervisor / 主管:</label>
            <input
              type="text"
              value={form.supervisor}
              onChange={(e) => setField("supervisor", e.target.value)}
              placeholder="Supervisor"
            />
          </div>
        </div>

        {/* Acciones de borrador (& nube) */}
        <div className="actions">
          <button onClick={guardarBorrador}>Guardar borrador</button>
          <button onClick={savePendingToCloud} disabled={cloudLoading}>
            {cloudLoading ? "Guardando..." : "Guardar en la nube (pendiente)"}
          </button>
            <button onClick={() => { setForm(emptyForm()); setMsg(null); }}>
            Limpiar formulario
          </button>
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
              const r = form.evaluaciones[idx];
              const isI = r?.inicial || "";
              const isF = r?.final || "";
              return (
                <div className="tr" key={idx}>
                  <div className="td item">
                    <div className="item-text">{txt}</div>
                  </div>

                  {/* Inicial Sí */}
                  <div className="td radio">
                    <input
                      type="radio"
                      name={`r${idx}-inicial`}
                      checked={isI === "SI"}
                      onChange={() => updateEval(idx, "inicial", "SI")}
                    />
                  </div>

                  {/* Inicial No */}
                  <div className="td radio">
                    <input
                      type="radio"
                      name={`r${idx}-inicial`}
                      checked={isI === "NO"}
                      onChange={() => updateEval(idx, "inicial", "NO")}
                    />
                  </div>

                  {/* Final Sí */}
                  <div className="td radio">
                    <input
                      type="radio"
                      name={`r${idx}-final`}
                      checked={isF === "SI"}
                      onChange={() => updateEval(idx, "final", "SI")}
                    />
                  </div>

                  {/* Final No */}
                  <div className="td radio">
                    <input
                      type="radio"
                      name={`r${idx}-final`}
                      checked={isF === "NO"}
                      onChange={() => updateEval(idx, "final", "NO")}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Resumen */}
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

      {/* Casos pendientes (NUBE) */}
      <section className="card">
        <h2>Casos pendientes (nube)</h2>

        <div className="actions" style={{ marginBottom: 10 }}>
          <button className="secondary" onClick={fetchCloudPendings} disabled={cloudLoading}>
            {cloudLoading ? "Actualizando..." : "Actualizar lista"}
          </button>
        </div>

        {(!cloudPendings || cloudPendings.length === 0) ? (
          <div className="hint">No hay pendientes en la nube.</div>
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

            {cloudPendings.map((p) => (
              <div className="pending-row" key={p.id}>
                <div className="col id">{p.id}</div>
                <div className="col when">{new Date(p.iso || p.ts || Date.now()).toLocaleString()}</div>
                <div className="col who">{p.nombre || "-"}</div>
                <div className="col area">{p.area || "-"}</div>
                <div className="col boss">{p.supervisor || "-"}</div>
                <div className="col act">
                  <button onClick={() => resumeCloudPending(p)}>Reanudar</button>
                  <button className="danger" onClick={() => deleteCloudPending(p.id)} disabled={cloudLoading}>
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Casos pendientes (LOCALES) */}
      <section className="card">
        <h2>Casos pendientes (guardados localmente)</h2>

        {drafts.length === 0 ? (
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

      {/* Footer */}
      <footer className="footer">
        <span>Hengli · SOC V3</span>
      </footer>
    </div>
  );
}
