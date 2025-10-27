import React, { useEffect, useMemo, useState } from "react";
import "./modern.css";

/**
 * SOC V3 - App.jsx
 * - Rediseño del bloque "Información del empleado": grid 2 columnas, 1 en móviles
 * - Inputs con id/label claros y selector de fecha/hora (datetime-local)
 * - Mantiene evaluaciones, borradores y envío
 */

// ========= CONFIG =========
const GAS_URL =
  "https://script.google.com/macros/s/AKfycbz2jHR--ztUyX-PE78lvjG4GXKbtdDJ5e3jJDgPtRaFcCDh258hu9slB4SAxgFkMPmIOg/exec";

// Ítems (es-zh)
const items = [
  "Usa herramientas adecuadas para la tarea / 使用适当的工具完成任务",
  "Se usan los equipos de manera segura, sin improvisaciones / 安全使用设备，无即兴操作",
  "Usa correctamente el EPP (colocado y ajustado) / 正确使用并佩戴好PPE防护装备",
  "El área está limpia y libre de materiales fuera de lugar / 区域干净、 无杂物",
  "Realiza correctamente la manipulación de las cargas / 正确进行搬运操作",
  "No presenta distracciones por celular durante la ejecución / 作业中无手机分心行为",
  "Los equipos se encuentran en buen estado y funcionales / 设备状况良好、 功能正常",
  "Ejecuta sus actividades conforme a la instrucción de trabajo / 按作业指导执行工作",
  "Levanta objetos con técnica correcta / 正确使用抬举技巧",
  "Verifica el estado de sus herramientas / 工具设备点检完好",
];

// ========= APP =========
export default function App() {
  // --------- Estado principal
  const [formData, setFormData] = useState({
    fecha: "",        // datetime-local ISO (YYYY-MM-DDTHH:mm)
    nombre: "",
    antiguedad: "",
    area: "",
    supervisor: "",
    evaluaciones: Array(items.length).fill({
      inicialSi: "",
      inicialNo: "",
      finalSi: "",
      finalNo: "",
    }),
    pctInicial: 0,
    pctFinal: 0,
  });

  // Banner de borrador
  const [draftInfo, setDraftInfo] = useState(null);
  // Mensajes
  const [msgOk, setMsgOk] = useState("");
  const [msgError, setMsgError] = useState("");
  // Envío
  const [sending, setSending] = useState(false);

  // --------- Cálculo de % en memoria
  useEffect(() => {
    const tot = items.length;
    const iniOk = formData.evaluaciones.filter((e) => e.inicialSi === "SI").length;
    const finOk = formData.evaluaciones.filter((e) => e.finalSi === "SI").length;
    const pctInicial = Math.round((iniOk / tot) * 100);
    const pctFinal = Math.round((finOk / tot) * 100);
    setFormData((p) => ({ ...p, pctInicial, pctFinal }));
  }, [formData.evaluaciones]);

  // --------- Manejo de radios (una opción por columna y fila)
  const setRadio = (idx, columna, valor) => {
    setFormData((prev) => {
      const nuevo = [...prev.evaluaciones];
      const fila = { ...nuevo[idx], [columna]: valor };

      // Reglas: en "inicial" sólo una (Si/No); en "final" sólo una (Si/No).
      if (columna === "inicialSi" && valor === "SI") fila.inicialNo = "";
      if (columna === "inicialNo" && valor === "NO") fila.inicialSi = "";
      if (columna === "finalSi" && valor === "SI") fila.finalNo = "";
      if (columna === "finalNo" && valor === "NO") fila.finalSi = "";

      nuevo[idx] = fila;
      return { ...prev, evaluaciones: nuevo };
    });
  };

  // --------- Borradores
  const saveDraft = () => {
    try {
      localStorage.setItem("soc_v3_draft", JSON.stringify(formData));
      const ts = new Date().toLocaleString();
      setDraftInfo(`Borrador guardado el ${ts}.`);
      setMsgOk("Borrador guardado.");
      setMsgError("");
    } catch (e) {
      setMsgError("No se pudo guardar el borrador.");
    }
  };
  const clearDraft = () => {
    localStorage.removeItem("soc_v3_draft");
    setDraftInfo(null);
    setMsgOk("Borrador limpiado.");
    setMsgError("");
  };
  const loadDraftIfExists = () => {
    try {
      const raw = localStorage.getItem("soc_v3_draft");
      if (raw) {
        const data = JSON.parse(raw);
        setFormData(data);
        const ts = new Date().toLocaleString();
        setDraftInfo(`Borrador cargado — guardado el ${ts}.`);
      }
    } catch {
      // ignore
    }
  };
  useEffect(loadDraftIfExists, []);

  const exportDraft = () => {
    const blob = new Blob([JSON.stringify(formData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "SOC_V3_borrador.json";
    a.click();
    URL.revokeObjectURL(url);
  };
  const importDraft = (file) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        setFormData(data);
        setMsgOk("Borrador importado.");
        setMsgError("");
      } catch {
        setMsgError("Archivo inválido.");
      }
    };
    reader.readAsText(file);
  };

  // --------- Envío
  const submitForm = async () => {
    try {
      setSending(true);
      setMsgOk("");
      setMsgError("");

      // Validación mínima
      if (!formData.fecha || !formData.nombre) {
        setMsgError("Fecha y nombre son obligatorios.");
        setSending(false);
        return;
      }

      const payload = {
        fase: "FINAL", // o "INICIAL" si deseas manejar fases
        ts: new Date().toISOString(),
        empleado: {
          fecha: formData.fecha,
          nombre: formData.nombre,
          antiguedad: formData.antiguedad,
          area: formData.area,
          supervisor: formData.supervisor,
        },
        evaluaciones: formData.evaluaciones,
        pctInicial: formData.pctInicial,
        pctFinal: formData.pctFinal,
      };

      const res = await fetch(GAS_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const r = await res.text();
      setMsgOk("Envío realizado correctamente.");
      setSending(false);
    } catch (e) {
      setMsgError("No se pudo enviar. Verifica la conexión.");
      setSending(false);
    }
  };

  // --------- Render
  return (
    <div className="container">
      {/* Encabezado */}
      <header className="app-header">
        <img className="app-logo" src="/logo-hengli.png" alt="Hengli" />
        <h1 className="app-title">SOC V3</h1>
        <h2 className="app-subtitle">Sistema de Observación de Comportamientos</h2>
        <p className="app-subtitle-cn">行为观察系统</p>
      </header>

      {/* Banner borrador si existe */}
      {draftInfo && <div className="draft-banner">{draftInfo}</div>}

      {/* ============ INFORMACIÓN DEL EMPLEADO ============ */}
      <section className="card">
        <h2>Información del empleado / 员工信息</h2>

        <div className="emp-grid">
          {/* Fecha y hora */}
          <div className="emp-col">
            <label htmlFor="fecha">Fecha y hora / 日期和时间:</label>
            <input
              id="fecha"
              type="datetime-local"
              value={formData.fecha}
              onChange={(e) => setFormData({ ...formData, fecha: e.target.value })}
              placeholder="YYYY-MM-DD HH:mm"
            />
          </div>

          {/* Nombre */}
          <div className="emp-col">
            <label htmlFor="nombre">Nombre del empleado / 员工姓名:</label>
            <input
              id="nombre"
              type="text"
              value={formData.nombre}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              placeholder="Nombre y apellido"
            />
          </div>

          {/* Antigüedad */}
          <div className="emp-col">
            <label htmlFor="antiguedad">Antigüedad / 工龄:</label>
            <input
              id="antiguedad"
              type="text"
              value={formData.antiguedad}
              onChange={(e) => setFormData({ ...formData, antiguedad: e.target.value })}
              placeholder="Ej. 2 años"
            />
          </div>

          {/* Área */}
          <div className="emp-col">
            <label htmlFor="area">Área / 区域:</label>
            <input
              id="area"
              type="text"
              value={formData.area}
              onChange={(e) => setFormData({ ...formData, area: e.target.value })}
              placeholder="Área"
            />
          </div>

          {/* Supervisor */}
          <div className="emp-col">
            <label htmlFor="supervisor">Supervisor / 主管:</label>
            <input
              id="supervisor"
              type="text"
              value={formData.supervisor}
              onChange={(e) => setFormData({ ...formData, supervisor: e.target.value })}
              placeholder="Supervisor"
            />
          </div>
        </div>

        {/* Acciones de borrador */}
        <div className="actions">
          <button type="button" className="btn secondary" onClick={saveDraft}>
            Guardar borrador
          </button>
          <button type="button" className="btn secondary" onClick={clearDraft}>
            Borrar borrador
          </button>

          <button type="button" className="btn secondary" onClick={exportDraft}>
            Exportar borrador (.json)
          </button>

          <label className="btn secondary btn-file">
            Importar borrador (.json)
            <input
              type="file"
              accept="application/json"
              onChange={(e) => {
                if (e.target.files?.[0]) importDraft(e.target.files[0]);
                e.target.value = "";
              }}
            />
          </label>
        </div>
      </section>

      {/* ============ EVALUACIÓN ============ */}
      <section className="card">
        <h2>Evaluación / 评估</h2>
        <p className="muted">Marca solo <b>una</b> opción por columna (Inicial o Final) en cada fila.</p>

        <div className="eval-wrapper">
          <table className="eval-table">
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
              {items.map((txt, idx) => (
                <tr key={idx}>
                  <td className="eval-item">{txt}</td>

                  {/* Inicial Sí */}
                  <td className="eval-cell">
                    <input
                      type="radio"
                      name={`ini-${idx}`}
                      checked={formData.evaluaciones[idx]?.inicialSi === "SI"}
                      onChange={() => setRadio(idx, "inicialSi", "SI")}
                    />
                  </td>

                  {/* Inicial No */}
                  <td className="eval-cell">
                    <input
                      type="radio"
                      name={`ini-${idx}`}
                      checked={formData.evaluaciones[idx]?.inicialNo === "NO"}
                      onChange={() => setRadio(idx, "inicialNo", "NO")}
                    />
                  </td>

                  {/* Final Sí */}
                  <td className="eval-cell">
                    <input
                      type="radio"
                      name={`fin-${idx}`}
                      checked={formData.evaluaciones[idx]?.finalSi === "SI"}
                      onChange={() => setRadio(idx, "finalSi", "SI")}
                    />
                  </td>

                  {/* Final No */}
                  <td className="eval-cell">
                    <input
                      type="radio"
                      name={`fin-${idx}`}
                      checked={formData.evaluaciones[idx]?.finalNo === "NO"}
                      onChange={() => setRadio(idx, "finalNo", "NO")}
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
            <input value={formData.pctInicial} readOnly />
          </div>
          <div>
            <label>Porcentaje de cumplimiento final (%):</label>
            <input value={formData.pctFinal} readOnly />
          </div>
        </div>

        {/* Envío */}
        <div className="actions">
          <button className="btn" onClick={submitForm} disabled={sending}>
            {sending ? "Enviando..." : "Enviar"}
          </button>
        </div>

        {msgOk && <div className="ok">{msgOk}</div>}
        {msgError && <div className="error">{msgError}</div>}
      </section>
    </div>
  );
}

