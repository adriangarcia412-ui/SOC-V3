import React, { useEffect, useMemo, useState } from "react";
import "./modern.css";

/* ========= CONFIG ========= */
const API_URL =
  "https://script.google.com/macros/s/AKfycbz2jHR--ztUyX-PE78lvjG4GXKbtdDJ5e3jJDgPtRaFcCDh258hu9slB4SAxgFkMPmIOg/exec";

/* Ítems de evaluación (ES / 中文) */
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

/* ========= HELPERS ========= */
function nowISO() {
  return new Date().toISOString();
}
function pctFromEval(array, which /* "inicial" | "final" */) {
  const total = array.length;
  if (total === 0) return 0;
  const yes = array.filter((r) => r[which] === "SI").length;
  return Math.round((yes / total) * 100);
}
function toJSONSerie(array, which) {
  return array.map((r, idx) => ({
    [`i${String(idx + 1).padStart(2, "0")}`]:
      r[which] === "SI" ? "SI" : r[which] === "NO" ? "NO" : "",
  }));
}

/* ========= COMPONENT ========= */
export default function App() {
  const [form, setForm] = useState(() => ({
    fecha: "",
    nombre: "",
    antiguedad: "",
    area: "",
    supervisor: "",
    evaluaciones: ITEMS.map(() => ({ inicial: "", final: "" })),
  }));

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null); // {type:"ok"|"error", text:"..."}

  const pctInicial = useMemo(
    () => pctFromEval(form.evaluaciones, "inicial"),
    [form.evaluaciones]
  );
  const pctFinal = useMemo(
    () => pctFromEval(form.evaluaciones, "final"),
    [form.evaluaciones]
  );

  /* ====== Drafts (borradores) ====== */
  const DRAFT_KEY = "socv3_draft";
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        setForm(parsed);
        setMsg({
          type: "ok",
          text: `Borrador cargado — guardado el ${new Date(
            parsed.__savedAt || Date.now()
          ).toLocaleString()}.`,
        });
      }
    } catch (_) {}
  }, []);

  function saveDraft() {
    const payload = { ...form, __savedAt: Date.now() };
    localStorage.setItem(DRAFT_KEY, JSON.stringify(payload));
    setMsg({ type: "ok", text: "Borrador guardado en este dispositivo." });
  }
  function clearDraft() {
    localStorage.removeItem(DRAFT_KEY);
    setMsg({ type: "ok", text: "Borrador eliminado de este dispositivo." });
  }
  function exportDraft() {
    const blob = new Blob([JSON.stringify(form, null, 2)], {
      type: "application/json",
    });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `SOCV3-borrador-${new Date()
      .toISOString()
      .replace(/[:.]/g, "-")}.json`;
    a.click();
  }
  function importDraft(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const json = JSON.parse(reader.result);
        setForm(json);
        setMsg({ type: "ok", text: "Borrador importado correctamente." });
      } catch {
        setMsg({ type: "error", text: "Archivo inválido." });
      }
    };
    reader.readAsText(file);
  }

  /* ====== Handlers ====== */
  function setField(k, v) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  // Validación por fila: en cada ítem, solo se permite INICIAL o FINAL.
  function selectRadio(idx, which /* "inicial"|"final" */, val /* "SI"|"NO" */) {
    setForm((p) => {
      const next = p.evaluaciones.map((row, i) => {
        if (i !== idx) return row;
        if (which === "inicial") {
          return { inicial: val, final: "" };
        } else {
          return { inicial: "", final: val };
        }
      });
      return { ...p, evaluaciones: next };
    });
  }

  function validateBeforeSend() {
    if (!form.nombre?.trim()) return "Falta 'Nombre del empleado'.";
    if (!form.area?.trim()) return "Falta 'Área'.";
    if (!form.supervisor?.trim()) return "Falta 'Supervisor'.";
    const any =
      form.evaluaciones.some((r) => r.inicial) ||
      form.evaluaciones.some((r) => r.final);
    if (!any) return "Selecciona al menos una respuesta Inicial o Final.";
    return null;
  }

  async function handleSend() {
    setMsg(null);
    const err = validateBeforeSend();
    if (err) {
      setMsg({ type: "error", text: err });
      return;
    }
    setSaving(true);

    try {
      const hasInicial = form.evaluaciones.some((r) => !!r.inicial);
      let regId = null;

      if (hasInicial) {
        const bodyInicial = {
          fase: "INICIAL",
          ts: nowISO(),
          nombre: form.nombre,
          antiguedad: form.antiguedad,
          area: form.area,
          supervisor: form.supervisor,
          data_inicial_json: toJSONSerie(form.evaluaciones, "inicial"),
          pct_inicial: pctInicial,
        };

        const r1 = await fetch(API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(bodyInicial),
        });
        const b1 = await r1.json();
        if (!b1.ok) throw new Error("Falló INICIAL");
        regId = b1.id;
      }

      const hasFinal = form.evaluaciones.some((r) => !!r.final);
      if (hasFinal) {
        const bodyFinal = {
          id: regId || `REG-${crypto.randomUUID()}`,
          fase: "FINAL",
          ts: nowISO(),
          nombre: form.nombre,
          antiguedad: form.antiguedad,
          area: form.area,
          supervisor: form.supervisor,
          data_final_json: toJSONSerie(form.evaluaciones, "final"),
          pct_final: pctFinal,
        };

        const r2 = await fetch(API_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(bodyFinal),
        });
        const b2 = await r2.json();
        if (!b2.ok) throw new Error("Falló FINAL");
      }

      setMsg({ type: "ok", text: "¡Datos enviados a Google Sheets!" });
      localStorage.removeItem(DRAFT_KEY);
    } catch {
      setMsg({
        type: "error",
        text: "No se pudo enviar. Revisa tu conexión o permisos del Apps Script.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="container">
      {/* HEADER */}
      <header className="app-header">
        <img className="app-logo" src="/hengli.png" alt="Hengli" />
        <h1 className="app-title">SOC V3</h1>
        <p className="app-subtitle">Sistema de Observación de Comportamientos</p>
        <p className="app-subtitle-cn">行为观察系统</p>
      </header>

      {/* EMPLEADO */}
      <section className="card">
        <h2>Información del empleado / 员工信息</h2>

        {msg && <div className={msg.type === "ok" ? "ok" : "error"}>{msg.text}</div>}

        <div className="emp-grid" style={{ marginTop: 12 }}>
          <div className="emp-col">
            <label>Fecha y hora / 日期和时间:</label>
            <input
              type="datetime-local"
              value={form.fecha}
              onChange={(e) => setField("fecha", e.target.value)}
            />
          </div>
          <div className="emp-col">
            <label>Nombre del empleado / 员工姓名:</label>
            <input
              value={form.nombre}
              onChange={(e) => setField("nombre", e.target.value)}
              placeholder="Nombre y apellido"
            />
          </div>
          <div className="emp-col">
            <label>Antigüedad / 工龄:</label>
            <input
              value={form.antiguedad}
              onChange={(e) => setField("antiguedad", e.target.value)}
              placeholder="Ej. 2 años"
            />
          </div>
          <div className="emp-col">
            <label>Área / 区域:</label>
            <input
              value={form.area}
              onChange={(e) => setField("area", e.target.value)}
              placeholder="Área"
            />
          </div>
          <div className="emp-col">
            <label>Supervisor / 主管:</label>
            <input
              value={form.supervisor}
              onChange={(e) => setField("supervisor", e.target.value)}
              placeholder="Supervisor"
            />
          </div>
        </div>

        {/* Borradores */}
        <div className="actions" style={{ marginTop: 12 }}>
          <button className="btn secondary" onClick={saveDraft}>
            Guardar borrador
          </button>
          <button className="btn secondary" onClick={clearDraft}>
            Borrar borrador
          </button>
          <button className="btn secondary" onClick={exportDraft}>
            Exportar borrador (.json)
          </button>
          <label className="btn secondary btn-file">
            Importar borrador (.json)
            <input type="file" accept="application/json" onChange={importDraft} />
          </label>
        </div>
      </section>

      {/* EVALUACIÓN */}
      <section className="card">
        <p className="muted">
          Marca solo <strong>una</strong> columna por fila (Inicial o Final).
        </p>

        <div className="eval-wrapper">
          <table className="eval-table">
            <thead>
              <tr>
                <th style={{ minWidth: "320px" }}>Ítem / 项目</th>
                <th>Inicial Sí / 初始是</th>
                <th>Inicial No / 初始否</th>
                <th>Final Sí / 最终是</th>
                <th>Final No / 最终否</th>
              </tr>
            </thead>
            <tbody>
              {ITEMS.map((txt, idx) => (
                <tr key={idx}>
                  <td className="eval-item">{txt}</td>

                  <td className="eval-cell">
                    <input
                      type="radio"
                      name={`row-${idx}-inicial`}
                      checked={form.evaluaciones[idx].inicial === "SI"}
                      onChange={() => selectRadio(idx, "inicial", "SI")}
                    />
                  </td>
                  <td className="eval-cell">
                    <input
                      type="radio"
                      name={`row-${idx}-inicial`}
                      checked={form.evaluaciones[idx].inicial === "NO"}
                      onChange={() => selectRadio(idx, "inicial", "NO")}
                    />
                  </td>

                  <td className="eval-cell">
                    <input
                      type="radio"
                      name={`row-${idx}-final`}
                      checked={form.evaluaciones[idx].final === "SI"}
                      onChange={() => selectRadio(idx, "final", "SI")}
                    />
                  </td>
                  <td className="eval-cell">
                    <input
                      type="radio"
                      name={`row-${idx}-final`}
                      checked={form.evaluaciones[idx].final === "NO"}
                      onChange={() => selectRadio(idx, "final", "NO")}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Resumen */}
        <div className="resume-grid">
          <div>
            <label>Porcentaje de cumplimiento inicial (%):</label>
            <input value={pctInicial} readOnly />
          </div>
          <div>
            <label>Porcentaje de cumplimiento final (%):</label>
            <input value={pctFinal} readOnly />
          </div>
        </div>

        <div className="actions">
          <button className="btn" onClick={handleSend} disabled={saving}>
            {saving ? "Enviando…" : "Enviar a Google Sheets"}
          </button>
        </div>
      </section>
    </div>
  );
}
