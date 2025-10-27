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
    evaluaciones: Array(13).fill({
      inicialSi: "",
      inicialNo: "",
      finalSi: "",
      finalNo: ""
    }),
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

  // Manejo de cambios
  const handleChange = (e) => {
    const { id, value } = e.target;
    setFormData({ ...formData, [id]: value });
  };

  // Envío simulado (puede reemplazarse por POST real)
  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Datos del formulario:", formData);
    alert("Formulario enviado correctamente ✅");
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
              <input type="radio" name={`i${index}_inicial`} value="Sí" onChange={handleChange} />
              <label>Inicial No / 初始否</label>
              <input type="radio" name={`i${index}_inicial`} value="No" onChange={handleChange} />
              <label>Final Sí / 最终是</label>
              <input type="radio" name={`i${index}_final`} value="Sí" onChange={handleChange} />
              <label>Final No / 最终否</label>
              <input type="radio" name={`i${index}_final`} value="No" onChange={handleChange} />
            </div>
          </div>
        ))}

        <h4>Resumen de resultados / 结果汇总</h4>
        <label>Porcentaje de cumplimiento inicial (%):</label>
        <input type="number" id="cumplimientoInicial" value={formData.cumplimientoInicial} onChange={handleChange} />

        <label>Porcentaje de cumplimiento final (%):</label>
        <input type="number" id="cumplimientoFinal" value={formData.cumplimientoFinal} onChange={handleChange} />

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

