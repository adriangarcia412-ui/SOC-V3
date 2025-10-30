// src/App.jsx
import React, { useEffect, useMemo, useState } from "react";
import "./modern.css";
import { API_URL, postJSON } from "./config";

/* =============== CLAVES / STORAGE ================= */
const STORAGE_KEY_DRAFTS = "soc_v3_drafts_v2";

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

/* =============== UTILIDADES ================= */
const uid = (len = 6) => Math.random().toString(36).slice(2, 2 + len);
const nowISO = () => new Date().toISOString();
const percent = (num, den) => {
  if (!den) return 0;
  const p = Math.round((num / den) * 100);
  return Number.isFinite(p) ? p : 0;
};

/* =============== MODELOS =============== */
const emptyRow = () => ({ inicial: "", final: "" }); // "SI" | "NO" | ""
const emptyForm = () => ({
  id: "",
  fecha: "",
  nombre: "",
  antiguedad: "",
  area: "",
  supervisor: "",
  evaluaciones: ITEMS.map(() => emptyRow()),
  // NUEVO: retroalimentaciones
  retroInicial: "",
  retroFinal: "",
});

/* =====================================================
                      COMPONENTE
   ===================================================== */
export default function App() {
  const [form, setForm] = useState(emptyForm());
  const [pctInicial, setPctInicial] = useState(0);
  const [pctFinal, setPctFinal] = useState(0);

  // Borradores locales (se dejó el soporte, aunque quitamos el botón)
  const [drafts, setDrafts] = useState([]);

  // Pendientes en la nube
  const [cloud, setCloud] = useState([]);
  const [loadingCloud, setLoadingCloud] = useState(false);

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

  /* ---------- recálculo de % inicial/final ---------- */
  useEffect(() => {
    const total = form.evaluaciones.length;
    const siInicial = form.evaluaciones.filter((r) => r.inicial === "SI").length;
    const siFinal = form.evaluaciones.filter((r) => r.final === "SI").length;
    setPctInicial(percent(siInicial, total));
    setPctFinal(percent(siFinal, total));
  }, [form.evaluaciones]);

  /* ---------- helpers de UI ---------- */
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

  /* =====================================================
                   NUBE (Apps Script)
     ===================================================== */
  const guardarNube = async () => {
    try {
      const payload = {
        action: "SAVE_PENDING",
        id: form.id || `CLOUD-${uid(10)}`,
        ts: nowISO(),
        nombre: form.nombre,
        area: form.area,
        supervisor: form.supervisor,
        pctInicial,
        pctFinal,
        // mantenemos el snapshot para reanudar
        json: JSON.stringify({ ...form, pctInicial, pctFinal }),
      };
      const resp = await postJSON(API_URL, payload);
      if (resp?.ok) {
        setForm((f) => ({ ...f, id: payload.id }));
        setMsg({ type: "ok", text: `Guardado en la nube: ${payload.id}` });
        await listarNube();
      } else {
        setMsg({ type: "error", text: `No se pudo guardar en la nube: ${JSON.stringify(resp)}` });
      }
    } catch (e) {
      setMsg({ type: "error", text: `Error de red: ${String(e)}` });
    }
  };

  const listarNube = async () => {
    try {
      setLoadingCloud(true);
      const resp = await postJSON(API_URL, { action: "LIST_PENDING" });
      if (resp?.ok && Array.isArray(resp.rows)) {
        const sorted = [...resp.rows].sort((a, b) =>
          String(b.iso || "").localeCompare(String(a.iso || ""))
        );
        setCloud(sorted);
      } else {
        setCloud([]);
      }
    } catch {
      setCloud([]);
    } finally {
      setLoadingCloud(false);
    }
  };

  const eliminarNube = async (id) => {
    try {
      const resp = await postJSON(API_URL, { action: "DELETE_PENDING", id });
      if (resp?.ok) {
        setMsg({ type: "ok", text: `Eliminado de la nube: ${id}` });
        await listarNube();
      } else {
        setMsg({ type: "error", text: `No se pudo eliminar: ${JSON.stringify(resp)}` });
      }
    } catch (e) {
      setMsg({ type: "error", text: `Error de red: ${String(e)}` });
    }
  };

  const reanudarNube = async (row) => {
    try {
      const raw = row?.json || "{}";
      const parsed = JSON.parse(raw);
      const evalsOK =
        Array.isArray(parsed?.evaluaciones) && parsed.evaluaciones.length === ITEMS.length;

      setForm({
        id: parsed.id || row.id || "",
        fecha: parsed.fecha || "",
        nombre: parsed.nombre || row.nombre || "",
        antiguedad: parsed.antiguedad || "",
        area: parsed.area || row.area || "",
        supervisor: parsed.supervisor || row.supervisor || "",
        evaluaciones: evalsOK ? parsed.evaluaciones : ITEMS.map(() => emptyRow()),
        retroInicial: parsed.retroInicial || "",
        retroFinal: parsed.retroFinal || "",
      });

      setMsg({ type: "ok", text: `Reanudando caso de la nube: ${row.id}` });
    } catch (e) {
      setMsg({ type: "error", text: `No se pudo reanudar: ${String(e)}` });
    }
  };

  useEffect(() => {
    listarNube();
  }, []);

  /* =====================================================
                    ENVÍO A GOOGLE SHEETS
     ===================================================== */
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
      id: form.id || `REG-${uid(10)}`,
      fecha: form.fecha,
      nombre: form.nombre,
      antiguedad: form.antiguedad,
      area: form.area,
      supervisor: form.supervisor,
      pctInicial,
      pctFinal,
      // 👇 NUEVO: mandamos las retroalimentaciones
      retroInicial: form.retroInicial || "",
      retroFinal: form.retroFinal || "",
      rows: form.evaluaciones,
      items: ITEMS,
    };

    try {
      const resp = await postJSON(API_URL, payload);
      if (resp?.ok) {
        setMsg({ type: "ok", text: "Caso enviado a Google Sheets correctamente." });
        try {
          await postJSON(API_URL, { action: "DELETE_PENDING", id: payload.id });
          await listarNube();
        } catch {}
        setForm(emptyForm());
      } else {
        setMsg({ type: "error", text: `No se pudo enviar. Respuesta: ${JSON.stringify(resp)}` });
      }
    } catch {
      setMsg({ type: "error", text: "Error de red al enviar el caso." });
    }
  };

  /* ---------- UI Msg ---------- */
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
      {/* Encabezado centrado con logo */}
      <header className="header header-centered">
        <img src="/hengli-logo.png" alt="Hengli" className="brand-logo-small" />
        <div className="brand-centered">
          <h1 className="title">SOC V3</h1>
          <p className="subtitle">Sistema de Observación de Comportamientos</p>
          <p className="subtitle-cn">行为观察系统</p>
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

          {/* Antigüedad con menú desplegable bilingüe */}
          <div className="field">
            <label>Antigüedad / 工龄:</label>
            <select
              value={form.antiguedad}
              onChange={(e) => setField("antiguedad", e.target.value)}
            >
              <option value="">Seleccione… / 请选择…</option>
              <option value="&lt;6m">Menos de 6 meses / 少于6个月</option>
              <option value="&lt;1y">Menos de 1 año / 少于1年</option>
              <option value="&lt;2y">Menos de 2 años / 少于2年</option>
              <option value="&gt;=2y">Más de 2 años / 多于2年</option>
            </select>
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

        {/* Acciones */}
        <div className="actions">
          <button onClick={guardarNube} className="secondary">
            Guardar en la nube / 云端保存
          </button>
          <button onClick={() => { setForm(emptyForm()); setMsg(null); }}>
            Limpiar formulario / 清空表单
          </button>
        </div>

        {Msg}
      </section>

      {/* Evaluación */}
      <section className="card">
        <h2>Evaluación / 评估</h2>
        <p className="hint">
          Marca solo <b>una</b> opción por columna (Inicial o Final) en cada fila.
        </p>

        <div className="eval-wrapper">
          <table className="eval-table">
            {/* Control fino de anchos de columna */}
            <colgroup>
              <col className="eval-col-item" />
              <col className="eval-col-narrow" />
              <col className="eval-col-narrow" />
              <col className="eval-col-narrow" />
              <col className="eval-col-narrow" />
            </colgroup>

            <thead>
              <tr>
                <th>Ítem / 项目</th>
                <th>Inicial Sí / 初始是</th>
                <th>Inicial No / 初始否</th>
                <th>Final Sí / 最终是</th>
                <th>Final No / 最终否</th>
              </tr>
            </thead>

            <tbody>
              {ITEMS.map((txt, idx) => {
                const r = form.evaluaciones[idx];
                const isI = r?.inicial || "";
                const isF = r?.final || "";
                return (
                  <tr key={idx}>
                    <td className="eval-item">
                      <div className="item-text">{txt}</div>
                    </td>

                    <td className="eval-cell">
                      <input
                        type="radio"
                        name={`r${idx}-inicial`}
                        checked={isI === "SI"}
                        onChange={() => updateEval(idx, "inicial", "SI")}
                      />
                    </td>

                    <td className="eval-cell">
                      <input
                        type="radio"
                        name={`r${idx}-inicial`}
                        checked={isI === "NO"}
                        onChange={() => updateEval(idx, "inicial", "NO")}
                      />
                    </td>

                    <td className="eval-cell">
                      <input
                        type="radio"
                        name={`r${idx}-final`}
                        checked={isF === "SI"}
                        onChange={() => updateEval(idx, "final", "SI")}
                      />
                    </td>

                    <td className="eval-cell">
                      <input
                        type="radio"
                        name={`r${idx}-final`}
                        checked={isF === "NO"}
                        onChange={() => updateEval(idx, "final", "NO")}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* NUEVO: Retroalimentaciones debajo de la tabla y arriba del resumen */}
        <div className="grid-2" style={{ marginTop: 16 }}>
          <div className="field">
            <label>Retroalimentación inicial / 初始反馈:</label>
            <textarea
              rows={3}
              value={form.retroInicial}
              onChange={(e) => setField("retroInicial", e.target.value)}
              placeholder="Escribe la retro inicial…"
            />
          </div>
          <div className="field">
            <label>Retroalimentación final / 最终反馈:</label>
            <textarea
              rows={3}
              value={form.retroFinal}
              onChange={(e) => setField("retroFinal", e.target.value)}
              placeholder="Escribe la retro final…"
            />
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

      {/* Casos en la nube */}
      <section className="card">
        <h2>Casos en la nube (pendientes)</h2>

        <div className="actions">
          <button className="secondary" onClick={listarNube} disabled={loadingCloud}>
            {loadingCloud ? "Actualizando…" : "Actualizar lista"}
          </button>
        </div>

        {cloud.length === 0 ? (
          <div className="hint">No hay pendientes en la nube.</div>
        ) : (
          <div className="pending">
            <div className="pending-head">
              <div className="col id">ID</div>
              <div className="col when">Guardado</div>
              <div className="col who">Nombre</div>
              <div className="col area">Área</div>
              <div className="col boss">Supervisor</div>
              <div className="col perc">Inicial%</div>
              <div className="col perc">Final%</div>
              <div className="col act">Acciones</div>
            </div>

            {cloud.map((row) => (
              <div className="pending-row" key={row.id}>
                <div className="col id">{row.id}</div>
                <div className="col when">
                  {new Date(row.iso || Date.now()).toLocaleString()}
                </div>
                <div className="col who">{row.nombre || "-"}</div>
                <div className="col area">{row.area || "-"}</div>
                <div className="col boss">{row.supervisor || "-"}</div>
                <div className="col perc">{row.pctInicial ?? 0}</div>
                <div className="col perc">{row.pctFinal ?? 0}</div>
                <div className="col act">
                  <button onClick={() => reanudarNube(row)}>Reanudar</button>
                  <button className="danger" onClick={() => eliminarNube(row.id)}>
                    Eliminar
                  </button>
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
