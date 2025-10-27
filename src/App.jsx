// src/App.jsx
import React, { useState } from "react";
import "./modern.css";

function App() {
  // ====== Estado del formulario ======
  const [formData, setFormData] = useState({
    fecha: "",
    nombre: "",
    antiguedad: "",
    area: "",
    supervisor: "",
    evaluaciones: Array(13).fill({
      inicialSi: "",
      inicialNo: "",
      finalSi: "",
      finalNo: "",
    }),
    pctInicial: 0,
    pctFinal: 0,
    ps: "",
    ic: "",
  });

  // ====== Lista de ítems ======
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
    "No introduce manos/herramientas en partes en movimiento / 禁止将手/工具伸入运动部位",
    "No transporta cargas por encima de personas / 禁止越人搬运/吊装",
    "Retira rebabas o virutas con herramienta, no con la mano / 使用工具清理毛刺，不用手清理",
  ];

  // ====== Cambios de texto ======
  const onChangeText = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // ====== Cambios en radios ======
  const onChangeRadio = (idx, fase, valor) => {
    setFormData((prev) => {
      const next = [...prev.evaluaciones];
      const actual = next[idx] || {
        inicialSi: "",
        inicialNo: "",
        finalSi: "",
        finalNo: "",
      };

      if (fase === "inicial") {
        if (valor === "SI") {
          actual.inicialSi = "SI";
          actual.inicialNo = "";
        } else {
          actual.inicialSi = "";
          actual.inicialNo = "NO";
        }
      } else {
        if (valor === "SI") {
          actual.finalSi = "SI";
          actual.finalNo = "";
        } else {
          actual.finalSi = "";
          actual.finalNo = "NO";
        }
      }

      next[idx] = actual;
      return { ...prev, evaluaciones: next };
    });
  };

  // ====== Cálculo de porcentajes ======
  const calcularPct = () => {
    const total = items.length;
    let iniSi = 0;
    let finSi = 0;

    formData.evaluaciones.forEach((ev) => {
      if (ev.inicialSi === "SI") iniSi++;
      if (ev.finalSi === "SI") finSi++;
    });

    const pctInicial = Math.round((iniSi / total) * 100) || 0;
    const pctFinal = Math.round((finSi / total) * 100) || 0;

    setFormData((prev) => ({ ...prev, pctInicial, pctFinal }));
  };

  // ====== Envío ======
  const onSubmit = async (e) => {
    e.preventDefault();
    calcularPct();

    try {
      const payload = {
        fase: "FINAL",
        ts: new Date().toISOString(),
        nombre: formData.nombre,
        antiguedad: formData.antiguedad,
        area: formData.area,
        supervisor: formData.supervisor,
        evaluaciones: formData.evaluaciones,
        pct: formData.pctFinal,
        ps: formData.ps,
        ic: formData.ic,
      };

      const res = await fetch("/api/gsheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      console.log("Guardar:", data);
      alert(data.ok ? "Registro guardado" : `Error: ${data.error || "desconocido"}`);
    } catch (err) {
      console.error(err);
      alert("Error de red");
    }
  };

  // ====== Render ======
  return (
    <div className="container">
      <h1 className="title">SOC V3</h1>
      <h2 className="subtitle">Sistema de Observación de Comportamientos</h2>
      <h3 className="subtitle-zh">行为观察系统</h3>

      <h2>Información del empleado / 员工信息</h2>
      <form onSubmit={onSubmit}>
        <div className="grid">
          <input
            id="fecha"
            name="fecha"
            type="text"
            placeholder="dd/mm/aaaa --:-- ----"
            value={formData.fecha}
            onChange={onChangeText}
          />
          <input
            id="nombre"
            name="nombre"
            type="text"
            placeholder="Nombre y apellido"
            value={formData.nombre}
            onChange={onChangeText}
          />
          <input
            id="antiguedad"
            name="antiguedad"
            type="text"
            placeholder="Ej. 2 años"
            value={formData.antiguedad}
            onChange={onChangeText}
          />
          <input
            id="area"
            name="area"
            type="text"
            placeholder="Área"
            value={formData.area}
            onChange={onChangeText}
          />
          <input
            id="supervisor"
            name="supervisor"
            type="text"
            placeholder="Supervisor"
            value={formData.supervisor}
            onChange={onChangeText}
          />
        </div>

        {/* ====== Evaluación ====== */}
        <h2>Evaluación / 评估</h2>
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
            {items.map((txt, idx) => (
              <tr key={idx}>
                <td className="eval-item">{txt}</td>

                <td className="eval-cell">
                  <input
                    type="radio"
                    name={`i${idx}-inicial`}
                    value="SI"
                    checked={formData.evaluaciones[idx]?.inicialSi === "SI"}
                    onChange={() => onChangeRadio(idx, "inicial", "SI")}
                  />
                </td>

                <td className="eval-cell">
                  <input
                    type="radio"
                    name={`i${idx}-inicial`}
                    value="NO"
                    checked={formData.evaluaciones[idx]?.inicialNo === "NO"}
                    onChange={() => onChangeRadio(idx, "inicial", "NO")}
                  />
                </td>

                <td className="eval-cell">
                  <input
                    type="radio"
                    name={`i${idx}-final`}
                    value="SI"
                    checked={formData.evaluaciones[idx]?.finalSi === "SI"}
                    onChange={() => onChangeRadio(idx, "final", "SI")}
                  />
                </td>

                <td className="eval-cell">
                  <input
                    type="radio"
                    name={`i${idx}-final`}
                    value="NO"
                    checked={formData.evaluaciones[idx]?.finalNo === "NO"}
                    onChange={() => onChangeRadio(idx, "final", "NO")}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* ====== Resumen ====== */}
        <h3>Resumen de resultados / 结果汇总</h3>
        <div className="summary">
          <input
            id="pct-inicial"
            name="pctInicial"
            type="number"
            placeholder="Porcentaje de cumplimiento inicial (%)"
            value={formData.pctInicial}
            onChange={onChangeText}
            onBlur={calcularPct}
          />
          <input
            id="pct-final"
            name="pctFinal"
            type="number"
            placeholder="Porcentaje de cumplimiento final (%)"
            value={formData.pctFinal}
            onChange={onChangeText}
            onBlur={calcularPct}
          />
          <input
            id="ps"
            name="ps"
            type="text"
            placeholder="Pulso de Seguridad (PS)"
            value={formData.ps}
            onChange={onChangeText}
          />
          <input
            id="ic"
            name="ic"
            type="text"
            placeholder="Índice de Corrección (IC)"
            value={formData.ic}
            onChange={onChangeText}
          />
        </div>

        <button type="submit" className="btn">Enviar</button>
      </form>
    </div>
  );
}

export default App;
