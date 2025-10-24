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
        <section className="form-section">
          <h2>Información del empleado</h2>

          <label>
            Fecha y hora:
            <input type="datetime-local" />
          </label>
          <label>
            Nombre del empleado:
            <input type="text" placeholder="Nombre y apellido" />
          </label>
          <label>
            Antigüedad:
            <input type="text" placeholder="Ej. 2 años" />
          </label>
          <label>
            Área:
            <input type="text" placeholder="Área" />
          </label>
          <label>
            Supervisor:
            <input type="text" placeholder="Supervisor" />
          </label>
        </section>

        <section className="evaluation-section">
          <h2>Evaluación / 评估</h2>
          <table>
            <thead>
              <tr>
                <th>Ítem / 项目</th>
                <th>Inicial Sí</th>
                <th>Inicial No</th>
                <th>Final Sí</th>
                <th>Final No</th>
              </tr>
            </thead>
            <tbody>
              {[
                "Usa herramientas adecuadas para la tarea",
                "Se usan los equipos de manera segura, sin improvisaciones",
                "Usa correctamente el EPP (colocado y ajustado)",
                "El área está limpia y libre de materiales fuera de lugar",
                "Realiza correctamente la manipulación de las cargas",
                "No presenta distracciones por celular durante la ejecución de las actividades",
                "Los equipos se encuentran en buen estado y funcionales",
                "Ejecuta sus actividades conforme a la instrucción de trabajo",
                "Levanta objetos realizando la técnica de cargas correctamente",
                "Se asegura que sus equipos o herramientas se encuentren en buen estado",
                "No introduce manos ni herramientas en maquinaria en movimiento",
                "No transporta cargas por encima de otros trabajadores",
                "Retira rebabas o virutas con herramienta, no con la mano",
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
