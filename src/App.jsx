import React, { useState } from "react";
import "./modern.css";

function App() {
  const [formData, setFormData] = useState({
    fecha: "",
    nombre: "",
    antiguedad: "",
    area: "",
    supervisor: "",
    evaluaciones: Array(13).fill({ inicialSi: "", inicialNo: "", finalSi: "", finalNo: "" }),
  });

  // Lista de ítems traducidos
  const items = [
    "Usa herramientas adecuadas para la tarea / 使用适当的工具完成任务",
    "Se usan los equipos de manera segura, sin improvisaciones / 安全使用设备，无即兴操作",
    "Usa correctamente el EPP (colocado y ajustado) / 正确使用并佩戴防护装备",
    "El área está limpia y libre de materiales fuera de lugar / 区域干净，无杂物",
    "Realiza correctamente la manipulación de las cargas / 正确进行搬运操作",
    "No presenta distracciones por celular durante la ejecución / 作业中无手机分心行为",
    "Los equipos se encuentran en buen estado y funcionales / 设备状况良好，功能正常",
    "Ejecuta sus actividades conforme a la instrucción de trabajo / 按作业指导执行工作",
    "Levanta objetos realizando la técnica de cargas correctamente / 正确使用提举技巧搬运物品",
    "Se asegura que sus equipos o herramientas se encuentren en buen estado / 确认设备与工具状况良好",
    "No introduce manos ni herramientas en maquinaria en movimiento / 不将手或工具伸入运转中的机器",
    "No transporta cargas por encima de otros trabajadores / 不在他人头顶搬运物品",
    "Retira rebabas o virutas con herramienta, no con la mano / 用工具清理毛刺，不用手",
  ];

  // Manejo de cambio de campos
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Manejo de cambio de evaluación
  const handleRadioChange = (index, tipo, valor) => {
    const updated = [...formData.evaluaciones];
    updated[index] = { ...updated[index], [tipo]: valor };
    setFormData({ ...formData, evaluaciones: updated });
  };

  // Exportar a CSV
  const handleExport = () => {
    let csv = "Fecha,Nombre,Antigüedad,Área,Supervisor,Ítem,Inicial Sí,Inicial No,Final Sí,Final No\n";
    formData.evaluaciones.forEach((ev, i) => {
      csv += `"${formData.fecha}","${formData.nombre}","${formData.antiguedad}","${formData.area}","${formData.supervisor}","${items[i]}","${ev.inicialSi}","${ev.inicialNo}","${ev.finalSi}","${ev.finalNo}"\n`;
    });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `SOC_${formData.nombre || "empleado"}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Reiniciar formulario
  const handleReset = () => {
    setFormData({
      fecha: "",
      nombre: "",
      antiguedad: "",
      area: "",
      supervisor: "",
      evaluaciones: Array(13).fill({ inicialSi: "", inicialNo: "", finalSi: "", finalNo: "" }),
    });
  };

  return (
    <div className="app-container">
      {/* Encabezado */}
      <header className="app-header">
        <img src="/hengli-logo.png" alt="Hengli Logo" className="logo" />
        <div className="header-text">
          <h1>SOC V3</h1>
          <h2>Sistema de Observación de Comportamientos</h2>
          <h3>行为观察系统</h3>
        </div>
      </header>

      <main className="form-container">
        {/* Información del empleado */}
        <section className="form-section">
          <h2>Información del empleado / 员工信息</h2>
          <label>
            Fecha y hora / 日期和时间:
            <input type="datetime-local" name="fecha" value={formData.fecha} onChange={handleChange} />
          </label>
          <label>
            Nombre del empleado / 员工姓名:
            <input type="text" name="nombre" value={formData.nombre} onChange={handleChange} placeholder="Nombre y apellido" />
          </label>
          <label>
            Antigüedad / 工龄:
            <input type="text" name="antiguedad" value={formData.antiguedad} onChange={handleChange} placeholder="Ej. 2 años" />
          </label>
          <label>
            Área / 区域:
            <input type="text" name="area" value={formData.area} onChange={handleChange} placeholder="Área" />
          </label>
          <label>
            Supervisor / 主管:
            <input type="text" name="supervisor" value={formData.supervisor} onChange={handleChange} placeholder="Supervisor" />
          </label>
        </section>

        {/* Evaluación */}
        <section className="evaluation-section">
          <h2>Evaluación / 评估</h2>
          <table>
            <thead>
              <tr>
                <th>Ítem / 项目</th>
                <th>Inicial Sí / 初始 是</th>
                <th>Inicial No / 初始 否</th>
                <th>Final Sí / 最终 是</th>
                <th>Final No / 最终 否</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={i}>
                  <td>{item}</td>
                  <td>
                    <input type="radio" name={`inicialSi-${i}`} checked={formData.evaluaciones[i].inicialSi === "Sí"} onChange={() => handleRadioChange(i, "inicialSi", "Sí")} />
                  </td>
                  <td>
                    <input type="radio" name={`inicialNo-${i}`} checked={formData.evaluaciones[i].inicialNo === "No"} onChange={() => handleRadioChange(i, "inicialNo", "No")} />
                  </td>
                  <td>
                    <input type="radio" name={`finalSi-${i}`} checked={formData.evaluaciones[i].finalSi === "Sí"} onChange={() => handleRadioChange(i, "finalSi", "Sí")} />
                  </td>
                  <td>
                    <input type="radio" name={`finalNo-${i}`} checked={formData.evaluaciones[i].finalNo === "No"} onChange={() => handleRadioChange(i, "finalNo", "No")} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* Botones */}
        <div className="button-container">
          <button onClick={handleExport} className="save-btn">
            💾 Guardar evaluación / 保存
          </button>
          <button onClick={handleReset} className="reset-btn">
            ♻️ Reiniciar formulario / 重置
          </button>
        </div>
      </main>
    </div>
  );
}

export default App;
