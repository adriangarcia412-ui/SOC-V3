import React, { useState } from "react";
import "./modern.css";

function App() {
  const [formData, setFormData] = useState({
    fecha: "",
    nombre: "",
    antiguedad: "",
    area: "",
    supervisor: "",
    cumplimientoInicial: "",
    cumplimientoFinal: "",
    pulsoSeguridad: "",
    indiceCorreccion: "",
    // Guardamos por ítem: { inicialSi, inicialNo, finalSi, finalNo }
    evaluaciones: Array(13).fill(null).map(() => ({
      inicialSi: "",
      inicialNo: "",
      finalSi: "",
      finalNo: ""
    })),
  });

  // Lista de ítems traducidos
  const items = [
    "Usa herramientas adecuadas para la tarea / 使用合适的工具完成任务",
    "Se usan los equipos de manera segura, sin improvisaciones / 安全使用设备，无即兴操作",
    "Usa correctamente el EPP (colocado y ajustado) / 正确使用并佩戴防护装备",
    "El área está limpia y libre de materiales fuera de lugar / 区域干净，无杂物",
    "Realiza correctamente la manipulación de las cargas / 正确进行搬运操作",
    "No presenta distracciones por celular durante la ejecución / 作业中无手机分心行为",
    "Los equipos se encuentran en buen estado y funcionales / 设备状况良好，功能正常",
    "Ejecuta sus actividades conforme a la instrucción de trabajo / 按作业指导执行工作",
    "Levanta objetos realizando la técnica de cargas correctamente / 正确使用抬举技术",
    "Se asegura que sus equipos o herramientas se encuentren en buen estado / 确保工具处于良好状态",
    "Evita introducir manos y herramientas en maquinaria en movimiento / 避免将手或工具伸入运行的机械",
    "Evita transporta cargas por encima de otros trabajadores / 避免在他人上方搬运物品",
    "Retira rebabas o virutas con herramienta, no con la mano / 使用工具清理毛刺，不用手清理",
  ];

  // === Handlers ===
  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData((s) => ({ ...s, [id]: value }));
  };

  const handleEvalChange = (idx, fase, valor) => {
    setFormData((s) => {
      const next = [...s.evaluaciones];
      // Reset pares para exclusividad
      if (fase === "inicialSi") { next[idx].inicialSi = valor; next[idx].inicialNo = valor ? "" : next[idx].inicialNo; }
      if (fase === "inicialNo") { next[idx].inicialNo = valor; next[idx].inicialSi = valor ? "" : next[idx].inicialSi; }
      if (fase === "finalSi")   { next[idx].finalSi   = valor; next[idx].finalNo   = valor ? "" : next[idx].finalNo; }
      if (fase === "finalNo")   { next[idx].finalNo   = valor; next[idx].finalSi   = valor ? "" : next[idx].finalSi; }
      return { ...s, evaluaciones: next };
    });
  };

  // Cálculo % a partir de evaluaciones
  const computePct = (faseKey) => {
    const total = formData.evaluaciones.length;
    if (total === 0) return 0;
    const siCount = formData.evaluaciones.reduce((acc, it) => acc + (it[faseKey] === "SI" ? 1 : 0), 0);
    return Math.round((siCount / total) * 100);
  };

  // Envío a proxy (INICIAL y opcional FINAL)
  const handleSubmit = async (e) => {
    e.preventDefault();

    // 1) Construir INICIAL
    const pctInicial = computePct("inicialSi");
    const payloadInicial = {
      fase: "INICIAL",
      ts: new Date().toISOString(),
      nombre: formData.nombre,
      antiguedad: formData.antiguedad,
      area: formData.area,
      supervisor: formData.supervisor,
      evaluaciones: formData.evaluaciones.map((it, i) => ({
        item: i + 1,
        inicialSi: it.inicialSi || "",
        inicialNo: it.inicialNo || ""
      })),
      pct: pctInicial
    };

    // Enviar INICIAL
    const r1 = await fetch("/api/gsheet", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payloadInicial),
    });
    const b1 = await r1.json();
    console.log("INICIAL ->", b1);

    if (!b1.ok || !b1.id) {
      alert("Error guardando INICIAL. Revisa la consola.");
      return;
    }

    // 2) Si hay alguna marca final, enviamos FINAL con el id de INICIAL
    const hayFinal = formData.evaluaciones.some(it => it.finalSi || it.finalNo);
    if (hayFinal) {
      const pctFinal = computePct("finalSi");
      const payloadFinal = {
        id: b1.id,          // MUY IMPORTANTE: mismo id
        fase: "FINAL",
        ts: new Date().toISOString(),
        evaluaciones: formData.evaluaciones.map((it, i) => ({
          item: i + 1,
          finalSi: it.finalSi || "",
          finalNo: it.finalNo || ""
        })),
        pct: pctFinal
      };

      const r2 = await fetch("/api/gsheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadFinal),
      });
      const b2 = await r2.json();
      console.log("FINAL ->", b2);

      if (!b2.ok) {
        alert("INICIAL guardado, pero hubo error en FINAL. Revisa consola.");
        return;
      }
    }

    alert("Registro enviado correctamente ✅");
  };

  return (
    <div className="container">
      <h1>SOC V3</h1>
      <h2>Sistema de Observación de Comportamientos</h2>
      <h3>行为观察系统</h3>

      <h4>Información del empleado / 员工信息</h4>
      <form onSubmit={handleSubmit}>
        <label>Fecha y hora / 日期和时间:</label>
        <input type="datetime-local" id="fecha" value={formData.fecha} onChange={handleChange} />

        <label>Nombre del empleado / 员工姓名:</label>
        <input type="text" id="nombre" value={formData.nombre} onChange={handleChange} placeholder="Nombre y apellido" />

        <label>Antigüedad / 工龄:</label>
        <input type="text" id="antiguedad" value={formData.antiguedad} onChange={handleChange} placeholder="Ej. 2 años" />

        <label>Área / 区域:</label>
        <input type="text" id="area" value={formData.area} onChange={handleChange} placeholder="Área" />

        <label>Supervisor / 主管:</label>
        <input type="text" id="supervisor" value={formData.supervisor} onChange={handleChange} placeholder="Supervisor" />

        <h4>Evaluación / 评估</h4>
        {items.map((item, index) => (
          <div key={index} className="item">
            <p>{item}</p>
            <div className="options">
              <label>Inicial Sí / 初始是</label>
              <input
                type="radio"
                name={`i${index}_inicial`}
                onChange={() => handleEvalChange(index, "inicialSi", "SI")}
                checked={formData.evaluaciones[index].inicialSi === "SI"}
              />
              <label>Inicial No / 初始否</label>
              <input
                type="radio"
                name={`i${index}_inicial`}
                onChange={() => handleEvalChange(index, "inicialNo", "NO")}
                checked={formData.evaluaciones[index].inicialNo === "NO"}
              />

              <label>Final Sí / 最终是</label>
              <input
                type="radio"
                name={`i${index}_final`}
                onChange={() => handleEvalChange(index, "finalSi", "SI")}
                checked={formData.evaluaciones[index].finalSi === "SI"}
              />
              <label>Final No / 最终否</label>
              <input
                type="radio"
                name={`i${index}_final`}
                onChange={() => handleEvalChange(index, "finalNo", "NO")}
                checked={formData.evaluaciones[index].finalNo === "NO"}
              />
            </div>
          </div>
        ))}

        <h4>Resumen de resultados / 结果汇总</h4>
        <label>Porcentaje de cumplimiento inicial (%):</label>
        <input
          type="number"
          id="cumplimientoInicial"
          value={computePct("inicialSi")}
          onChange={() => {}}
          readOnly
        />

        <label>Porcentaje de cumplimiento final (%):</label>
        <input
          type="number"
          id="cumplimientoFinal"
          value={computePct("finalSi")}
          onChange={() => {}}
          readOnly
        />

        <label>Pulso de Seguridad (PS):</label>
        <input type="number" id="pulsoSeguridad" value={formData.pulsoSeguridad} onChange={handleChange} />

        <label>Índice de Corrección (IC):</label>
        <input type="number" id="indiceCorreccion" value={formData.indiceCorreccion} onChange={handleChange} />

        <button type="submit">Enviar</button>
      </form>
    </div>
  );
}

export default App;
