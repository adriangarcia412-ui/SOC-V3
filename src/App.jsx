import React, { useEffect, useMemo, useState } from "react";
import "./modern.css";

/** ##############################################################
 *  CONFIG
 *  - Cambia esta URL por tu Apps Script publicado (si la actualiza).
 *  - Flujo: enviamos FASE INICIAL y luego FASE FINAL (dos POST),
 *    igual que veníamos haciendo, para que tu hoja quede idéntica.
 * ############################################################## */
const APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbz2jHR--ztUyX-PE78lvjG4GXKbtdDJ5e3jJDgPtRaFcCDh258hu9slB4SAxgFkMPmIOg/exec";

/** Ítems de evaluación (los mismos que ya usas) */
const ITEMS = [
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

/** Clave localStorage para la lista de pendientes */
const LS_KEY = "socv3_pendientes";

/** Utilidad: cargar/salvar JSON seguro en localStorage */
const loadLS = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
};
const saveLS = (key, value) => {
  localStorage.setItem(key, JSON.stringify(value));
};

/** Genera ID local legible */
const makeId = () =>
  "PEND-" +
  Math.random().toString(36).slice(2, 6) +
  "-" +
  Math.random().toString(36).slice(2, 6);

/** Estado base del formulario */
const makeEmptyForm = () => ({
  fecha: "",
  nombre: "",
  antiguedad: "",
  area: "",
  supervisor: "",
  // Un array por ítem. Cada fila solo puede tener una opción INICIAL (SI|NO) y una FINAL (SI|NO).
  evaluaciones: Array(ITEMS.length).fill({ inicial: "", final: "" }),
});

export default function App() {
  const [form, setForm] = useState(makeEmptyForm());
  const [editingId, setEditingId] = useState(null); // ID del pendiente que estoy reanudando (o null)
  const [pendientes, setPendientes] = useState([]);
  const [sending, setSending] = useState(false);
  const [okMsg, setOkMsg] = useState("");
  const [errMsg, setErrMsg] = useState("");

  /** Carga pendientes al entrar */
  useEffect(() => {
    setPendientes(loadLS(LS_KEY, []));
  }, []);

  /** Helpers de porcentaje */
  const pctInicial = useMemo(() => {
    const total = form.evaluaciones.length;
    const si = form.evaluaciones.filter((e) => e.inicial === "SI").length;
    return total ? Math.round((si * 100) / total) : 0;
  }, [form.evaluaciones]);

  const pctFinal = useMemo(() => {
    const total = form.evaluaciones.length;
    const si = form.evaluaciones.filter((e) => e.final === "SI").length;
    return total ? Math.round((si * 100) / total) : 0;
  }, [form.evaluaciones]);

  /** Manejo de cambios básicos */
  const onChangeField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  /** Manejo de radios por celda */
  const pickInicial = (idx, val) => {
    setForm((f) => {
      const next = f.evaluaciones.map((row, i) =>
        i === idx ? { ...row, inicial: val, /* limpia si el usuario quiere */ } : row
      );
      return { ...f, evaluaciones: next };
    });
  };
  const pickFinal = (idx, val) => {
    setForm((f) => {
      const next = f.evaluaciones.map((row, i) =>
        i === idx ? { ...row, final: val } : row
      );
      return { ...f, evaluaciones: next };
    });
  };

  /** 1) Guardar caso como PENDIENTE en localStorage */
  const guardarPendiente = () => {
    setOkMsg("");
    setErrMsg("");

    // Validación mínima: nombre + al menos una respuesta INICIAL
    const tieneInicial = form.evaluaciones.some((r) => r.inicial === "SI" || r.inicial === "NO");
    if (!form.nombre || !tieneInicial) {
      setErrMsg("Completa al menos el nombre y una respuesta de INICIAL para guardar el caso.");
      return;
    }

    const id = editingId || makeId();
    const entry = {
      id,
      savedAt: new Date().toISOString(),
      pctInicial: pctInicial,
      form,
    };

    let list = loadLS(LS_KEY, []);
    const ix = list.findIndex((x) => x.id === id);
    if (ix >= 0) list[ix] = entry;
    else list.push(entry);

    saveLS(LS_KEY, list);
    setPendientes(list);
    setEditingId(id);
    setOkMsg("Caso guardado localmente como pendiente.");
  };

  /** Reanudar un pendiente: carga su formulario */
  const reanudar = (id) => {
    setOkMsg("");
    setErrMsg("");
    const p = pendientes.find((x) => x.id === id);
    if (!p) return;
    setForm(p.form);
    setEditingId(p.id);
    setOkMsg(`Reanudando caso ${id}.`);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /** Borra un pendiente de la lista local */
  const borrarPendiente = (id) => {
    const list = pendientes.filter((x) => x.id !== id);
    saveLS(LS_KEY, list);
    setPendientes(list);
    if (editingId === id) {
      setEditingId(null);
      setForm(makeEmptyForm());
    }
  };

  /** 2) Enviar a Google Sheets (cuando ya se llenó FINAL) y limpiar pendiente */
  const enviarFinal = async () => {
    setOkMsg("");
    setErrMsg("");

    // Validación mínima final:
    const tieneFinal = form.evaluaciones.some((r) => r.final === "SI" || r.final === "NO");
    if (!tieneFinal) {
      setErrMsg("Completa al menos una respuesta FINAL antes de enviar.");
      return;
    }

    setSending(true);
    try {
      // 2.1 Enviar FASE INICIAL
      const inicialPayload = {
        fase: "INICIAL",
        ts: new Date().toISOString(),
        nombre: form.nombre,
        antiguedad: form.antiguedad,
        area: form.area,
        supervisor: form.supervisor,
        evaluaciones: form.evaluaciones.map((r, i) => ({
          idx: i,
          inicial: r.inicial || "",
        })),
        pct: pctInicial,
      };
      const r1 = await fetch(APPS_SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(inicialPayload),
      });
      const b1 = await r1.json();
      if (!b1?.ok || !b1?.id) throw new Error("No se pudo registrar FASE INICIAL");

      // 2.2 Enviar FASE FINAL (con el id devuelto)
      const finalPayload = {
        id: b1.id,
        fase: "FINAL",
        ts: new Date().toISOString(),
        evaluaciones: form.evaluaciones.map((r, i) => ({
          idx: i,
          final: r.final || "",
        })),
        pct: pctFinal,
      };
      const r2 = await fetch(APPS_SCRIPT_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(finalPayload),
      });
      const b2 = await r2.json();
      if (!b2?.ok) throw new Error("No se pudo registrar FASE FINAL");

      // 2.3 Limpiar de pendientes si estaba en edición
      if (editingId) {
        borrarPendiente(editingId);
      }

      setOkMsg("Registro enviado y cerrado correctamente.");
      setForm(makeEmptyForm());
      setEditingId(null);
    } catch (err) {
      setErrMsg(err.message || "Error al enviar.");
    } finally {
      setSending(false);
    }
  };

  /** UI */
  return (
    <div className="container" style={{ maxWidth: 1080, margin: "0 auto", padding: 16 }}>
      <header style={{ marginBottom: 12 }}>
        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
          <img src="/hengli.svg" alt="Hengli" style={{ height: 36 }} />
          <div>
            <h1 className="title" style={{ margin: 0 }}>SOC V3</h1>
            <div className="subtitle">Sistema de Observación de Comportamientos / 行为观察系统</div>
          </div>
        </div>
      </header>

      {/* Info del empleado */}
      <section>
        <h2 style={{ marginTop: 6 }}>Información del empleado / 员工信息</h2>
        {editingId && (
          <div className="draft-banner">
            Estás reanudando el caso <b>{editingId}</b>.
          </div>
        )}

        <div className="grid4">
          <div className="field">
            <label>Fecha y hora</label>
            <input
              type="datetime-local"
              value={form.fecha}
              onChange={(e) => onChangeField("fecha", e.target.value)}
            />
          </div>
          <div className="field">
            <label>Nombre</label>
            <input
              type="text"
              value={form.nombre}
              onChange={(e) => onChangeField("nombre", e.target.value)}
              placeholder="Nombre y apellido"
            />
          </div>
          <div className="field">
            <label>Antigüedad</label>
            <input
              type="text"
              value={form.antiguedad}
              onChange={(e) => onChangeField("antiguedad", e.target.value)}
              placeholder="Ej. 2 años"
            />
          </div>
          <div className="field">
            <label>Área</label>
            <input
              type="text"
              value={form.area}
              onChange={(e) => onChangeField("area", e.target.value)}
              placeholder="Área"
            />
          </div>
          <div className="field" style={{ gridColumn: "1 / span 4" }}>
            <label>Supervisor</label>
            <input
              type="text"
              value={form.supervisor}
              onChange={(e) => onChangeField("supervisor", e.target.value)}
              placeholder="Supervisor"
            />
          </div>
        </div>

        <div className="actions" style={{ display: "flex", gap: 10, marginTop: 8, flexWrap: "wrap" }}>
          <button type="button" onClick={guardarPendiente}>
            Guardar caso (pendiente)
          </button>
          <button
            type="button"
            onClick={() => {
              setForm(makeEmptyForm());
              setEditingId(null);
              setOkMsg("Formulario limpio.");
              setErrMsg("");
            }}
          >
            Limpiar formulario
          </button>
        </div>
      </section>

      {/* Tabla de evaluación */}
      <section style={{ marginTop: 22 }}>
        <h2>Evaluación / 评估</h2>
        <p style={{ marginTop: -6 }}>
          Marca solo <b>una</b> opción por columna (Inicial o Final) en cada fila.
        </p>

        <div className="table-wrap">
          <table className="eval-table">
            <thead>
              <tr>
                <th style={{ minWidth: 360 }}>Ítem / 项目</th>
                <th>Inicial Sí / 初始是</th>
                <th>Inicial No / 初始否</th>
                <th>Final Sí / 最终是</th>
                <th>Final No / 最终否</th>
              </tr>
            </thead>
            <tbody>
              {ITEMS.map((text, idx) => (
                <tr key={idx}>
                  <td className="eval-item">{text}</td>

                  {/* Inicial SI */}
                  <td className="eval-cell">
                    <input
                      type="radio"
                      name={`i-${idx}-inicial`}
                      checked={form.evaluaciones[idx].inicial === "SI"}
                      onChange={() => pickInicial(idx, "SI")}
                    />
                  </td>

                  {/* Inicial NO */}
                  <td className="eval-cell">
                    <input
                      type="radio"
                      name={`i-${idx}-inicial`}
                      checked={form.evaluaciones[idx].inicial === "NO"}
                      onChange={() => pickInicial(idx, "NO")}
                    />
                  </td>

                  {/* Final SI */}
                  <td className="eval-cell">
                    <input
                      type="radio"
                      name={`i-${idx}-final`}
                      checked={form.evaluaciones[idx].final === "SI"}
                      onChange={() => pickFinal(idx, "SI")}
                    />
                  </td>

                  {/* Final NO */}
                  <td className="eval-cell">
                    <input
                      type="radio"
                      name={`i-${idx}-final`}
                      checked={form.evaluaciones[idx].final === "NO"}
                      onChange={() => pickFinal(idx, "NO")}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td className="eval-item" style={{ fontWeight: 700 }}>
                  Porcentaje de cumplimiento inicial (%)
                </td>
                <td colSpan={4} style={{ textAlign: "left", paddingLeft: 12 }}>
                  {pctInicial}%
                </td>
              </tr>
              <tr>
                <td className="eval-item" style={{ fontWeight: 700 }}>
                  Porcentaje de cumplimiento final (%)
                </td>
                <td colSpan={4} style={{ textAlign: "left", paddingLeft: 12 }}>
                  {pctFinal}%
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div className="actions" style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
          <button type="button" disabled={sending} onClick={enviarFinal}>
            {sending ? "Enviando..." : "Enviar a Google Sheets (cerrar caso)"}
          </button>
        </div>

        {okMsg && <div className="ok">{okMsg}</div>}
        {errMsg && <div className="error">{errMsg}</div>}
      </section>

      {/* Lista de pendientes */}
      <section style={{ marginTop: 28 }}>
        <h2>Casos pendientes (guardados localmente)</h2>
        {pendientes.length === 0 ? (
          <div className="draft-banner">No hay pendientes.</div>
        ) : (
          <div className="table-wrap">
            <table className="eval-table">
              <thead>
                <tr>
                  <th style={{ minWidth: 140 }}>ID</th>
                  <th>Guardado</th>
                  <th>Nombre</th>
                  <th>Área</th>
                  <th>Supervisor</th>
                  <th>% Inicial</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {pendientes.map((p) => (
                  <tr key={p.id}>
                    <td>{p.id}</td>
                    <td>{new Date(p.savedAt).toLocaleString()}</td>
                    <td>{p.form?.nombre || ""}</td>
                    <td>{p.form?.area || ""}</td>
                    <td>{p.form?.supervisor || ""}</td>
                    <td>{p.pctInicial ?? 0}%</td>
                    <td>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button type="button" onClick={() => reanudar(p.id)}>
                          Reanudar
                        </button>
                        <button
                          type="button"
                          onClick={() => borrarPendiente(p.id)}
                          style={{ background: "#fff1f2", borderColor: "#fca5a5", color: "#991b1b" }}
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <footer style={{ marginTop: 24, opacity: 0.7 }}>
        <small>Hengli · SOC V3</small>
      </footer>
    </div>
  );
}
