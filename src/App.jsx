import React from "react";
import "./modern.css";

function App() {
  return (
    <div className="app-container">
      {/* Encabezado con logo y títulos */}
      <header className="app-header">
        <img src="/hengli-logo.png" alt="Hengli Logo" className="logo" />
        <div className="header-text">
          <h1>SOC V3</h1>
          <h2>Sistema de Observación de Comportamientos</h2>
          <h3>行为观察系统</h3>
        </div>
      </header>

      <main className="form-container">
        {/* Sección de información */}
        <section className="form-section">
          <h2>Información del empleado / 员工信息</h2>

          <label>
            Fecha y hora / 日期和时间:
            <input type="datetime-local" />
          </label>
          <label>
            Nombre del empleado / 员工姓名:
            <input type="text" placeholder="Nombre y apellido" />
          </label>
          <label>
            Antigüedad / 工龄:
            <input type="text" placeholder="Ej. 2 años" />
          </label>
          <label>
            Área / 区域:
            <input type="text" placeholder="Área" />
          </label>
          <label>
            Supervisor / 主管:
            <input type="text" placeholder="Supervisor" />
          </label>
        </section>

        {/* Sección de evaluación */}
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
              {[
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
              ].map((item, i) => (
                <tr key={i}>
                  <td>{item}</td>
                  {[1, 2, 3, 4].map((j) => (
                    <td key={j}>
                      <input type="radio" name={`${i}-${j}`} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </main>
    </div>
  );
}

export default App;
