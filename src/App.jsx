import React, { useMemo, useState, useEffect } from "react";

/** ===============================
 *   CONFIGURACIÓN
 *  =============================== */
const LS_KEY = "SOC_V3_REGISTROS_SOCFORM";

// Ítems exactamente como tu formato
const ITEMS = [
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
  "Mantiene atención constante a su entorno durante la operación",
  "Evita colocarse en la línea de fuego o zonas de riesgo",
  "El personal ha sido entrenado previamente para realizar esta actividad",
];

/** ==========================================
 *   Helpers de cálculo y utilidades
 *  ========================================== */
function siCount(obj) {
  return Object.values(obj).filter((v) => v === "SI").length;
}
function totalCount(obj) {
  return Object.keys(obj).length;
}
function pct(si, total) {
  if (!total) return 0;
  return Math.round((si / total) * 100);
}

function todayLocalISO() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const y = d.getFullYear();
  const m = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mm = pad(d.getMinutes());
  return `${y}-${m}-${dd}T${hh}:${mm}`;
}

/** ==========================================
 *   Componente principal
 *  ========================================== */
export default function App() {
  const [fecha, setFecha] = useState(todayLocalISO());

  const [empleado, setEmpleado] = useState({
    nombre: "",
    antiguedad: "",
    area: "",
    supervisor: "",
  });

  // Respuestas INICIAL y FINAL → "SI" | "NO" | ""
  const emptyAnswers = useMemo(
    () =>
      ITEMS.reduce(
        (acc, _label, idx) => {
          acc[idx] = ""; // sin respuesta por defecto
          return acc;
        },
        /** @type {Record<number,""|"SI"|"NO">} */ ({})
      ),
    []
  );

  const [inicial, setInicial] = useState(emptyAnswers);
  const [finalEval, setFinalEval] = useState(emptyAnswers);

  const [notas, setNotas] = useState("");

  const [registros, setRegistros] = useState(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // Persistencia
  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(registros));
  }, [registros]);

  // Cálculos
  const siInicial = siCount(inicial);
  const siFinal = siCount(finalEval);
  const total = ITEMS.length;

  const pctInicial = pct(siInicial, total);
  const pctFinal = pct(siFinal, total);

  // Definiciones (puedes ajustarlas después):
  // PS  = % cumplimiento final
  // IC  = % final - % inicial (mejora)
  const PS = pctFinal;
  const IC = pctFinal - pctInicial;

  const completarInicial = (idx, val) =>
    setInicial((prev) => ({ ...prev, [idx]: val }));
  const completarFinal = (idx, val) =>
    setFinalEval((prev) => ({ ...prev, [idx]: val }));

  function limpiar() {
    setFecha(todayLocalISO());
    setEmpleado({ nombre: "", antiguedad: "", area: "", supervisor: "" });
    setInicial(emptyAnswers);
    setFinalEval(emptyAnswers);
    setNotas("");
  }

  function agregarRegistro() {
    const registro = {
      fecha,
      empleado,
      respuestas: {
        inicial,
        final: finalEval,
      },
      metrics: {
        pctInicial,
        pctFinal,
        PS,
        IC,
      },
      notas: notas.trim(),
      createdAt: new Date().toISOString(),
    };
    setRegistros((r) => [registro, ...r]);
    alert("✓ Registro guardado localmente (navegador).");
  }

  function exportarCSV() {
    if (!registros.length) {
      alert("No hay registros para exportar.");
      return;
    }

    // Encabezados base
    const headers = [
      "Fecha",
      "Empleado",
      "Antigüedad",
      "Área",
      "Supervisor",
      ...ITEMS.map((t, i) => `Inicial: ${t}`),
      ...ITEMS.map((t, i) => `Final: ${t}`),
      "% Inicial",
      "% Final",
      "PS",
      "IC",
      "Notas",
      "Creado (ISO)",
    ];

    const rows = registros.map((r) => [
      r.fecha,
      r.empleado?.nombre ?? "",
      r.empleado?.antiguedad ?? "",
      r.empleado?.area ?? "",
      r.empleado?.supervisor ?? "",
      ...ITEMS.map((_t, i) => r.respuestas.inicial[i] ?? ""),
      ...ITEMS.map((_t, i) => r.respuestas.final[i] ?? ""),
      r.metrics?.pctInicial ?? "",
      r.metrics?.pctFinal ?? "",
      r.metrics?.PS ?? "",
      r.metrics?.IC ?? "",
      r.notas ?? "",
      r.createdAt ?? "",
    ]);

    const all = [headers, ...rows];
    const csv = all.map((row) =>
      row
        .map((cell) => {
          const str = String(cell ?? "");
          // escape básico CSV
          if (str.includes(",") || str.includes('"') || str.includes("\n")) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        })
        .join(",")
    );

    const blob = new Blob([csv.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `SOC_V3_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="mx-auto w-full max-w-6xl px-4">
        <header className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">SOC V3</h1>
          <p className="text-gray-600">
            Sistema de Observación de Comportamientos (SOC)
          </p>
        </header>

        {/* Datos generales */}
        <section className="rounded-xl bg-white p-6 shadow">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Fecha y hora
              </label>
              <input
                type="datetime-local"
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Nombre del empleado
              </label>
              <input
                type="text"
                placeholder="Nombre y apellido"
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                value={empleado.nombre}
                onChange={(e) =>
                  setEmpleado((p) => ({ ...p, nombre: e.target.value }))
                }
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Antigüedad
              </label>
              <input
                type="text"
                placeholder="Ej. 2 años"
                className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                value={empleado.antiguedad}
                onChange={(e) =>
                  setEmpleado((p) => ({ ...p, antiguedad: e.target.value }))
                }
              />
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Área
                </label>
                <input
                  type="text"
                  placeholder="Área"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                  value={empleado.area}
                  onChange={(e) =>
                    setEmpleado((p) => ({ ...p, area: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Supervisor
                </label>
                <input
                  type="text"
                  placeholder="Supervisor"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                  value={empleado.supervisor}
                  onChange={(e) =>
                    setEmpleado((p) => ({ ...p, supervisor: e.target.value }))
                  }
                />
              </div>
            </div>
          </div>
        </section>

        {/* Tabla de evaluación */}
        <section className="mt-6 rounded-xl bg-white p-6 shadow">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">Evaluación</h2>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-3 py-2 text-left text-sm font-semibold text-gray-700">
                    Ítem
                  </th>
                  <th className="px-3 py-2 text-center text-sm font-semibold text-gray-700">
                    INICIAL<br />SI
                  </th>
                  <th className="px-3 py-2 text-center text-sm font-semibold text-gray-700">
                    INICIAL<br />NO
                  </th>
                  <th className="px-3 py-2 text-center text-sm font-semibold text-gray-700">
                    FINAL<br />SI
                  </th>
                  <th className="px-3 py-2 text-center text-sm font-semibold text-gray-700">
                    FINAL<br />NO
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {ITEMS.map((label, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-3 py-2 text-sm text-gray-800">{label}</td>

                    {/* INICIAL SI */}
                    <td className="px-3 py-2 text-center">
                      <input
                        type="radio"
                        name={`ini-${idx}`}
                        className="h-4 w-4"
                        checked={inicial[idx] === "SI"}
                        onChange={() => completarInicial(idx, "SI")}
                      />
                    </td>
                    {/* INICIAL NO */}
                    <td className="px-3 py-2 text-center">
                      <input
                        type="radio"
                        name={`ini-${idx}`}
                        className="h-4 w-4"
                        checked={inicial[idx] === "NO"}
                        onChange={() => completarInicial(idx, "NO")}
                      />
                    </td>

                    {/* FINAL SI */}
                    <td className="px-3 py-2 text-center">
                      <input
                        type="radio"
                        name={`fin-${idx}`}
                        className="h-4 w-4"
                        checked={finalEval[idx] === "SI"}
                        onChange={() => completarFinal(idx, "SI")}
                      />
                    </td>
                    {/* FINAL NO */}
                    <td className="px-3 py-2 text-center">
                      <input
                        type="radio"
                        name={`fin-${idx}`}
                        className="h-4 w-4"
                        checked={finalEval[idx] === "NO"}
                        onChange={() => completarFinal(idx, "NO")}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Métricas en vivo */}
          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Metric label="Porcentaje de cumplimiento inicial (%)" value={pctInicial} />
            <Metric label="Porcentaje de cumplimiento final (%)" value={pctFinal} />
            <Metric label="Pulso de Seguridad (PS)" value={PS} />
            <Metric label="Índice de Corrección (IC)" value={IC} />
          </div>

          {/* Notas */}
          <div className="mt-6">
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Notas (opcional)
            </label>
            <textarea
              className="h-28 w-full resize-y rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
              placeholder="Observaciones breves…"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
            />
          </div>

          {/* Botones */}
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <button
              onClick={agregarRegistro}
              className="rounded-lg bg-black px-4 py-2 text-white hover:bg-gray-800"
            >
              Agregar registro
            </button>
            <button
              onClick={limpiar}
              className="rounded-lg bg-gray-200 px-4 py-2 text-gray-800 hover:bg-gray-300"
            >
              Limpiar
            </button>
            <button
              onClick={exportarCSV}
              className="rounded-lg bg-emerald-700 px-4 py-2 text-white hover:bg-emerald-800"
            >
              Exportar CSV
            </button>
          </div>
        </section>

        {/* Historial simple */}
        <section className="mt-6 rounded-xl bg-white p-6 shadow">
          <h3 className="mb-3 text-lg font-semibold text-gray-900">Registros guardados</h3>
          {!registros.length ? (
            <p className="text-gray-600">Aún no hay registros.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {registros.map((r, i) => (
                <li key={i} className="rounded-md border border-gray-200 p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <strong>{r.empleado?.nombre || "Sin nombre"}</strong>{" "}
                      <span className="text-gray-600">• {r.empleado?.area || "Área"}</span>
                    </div>
                    <div className="text-gray-500">{new Date(r.createdAt).toLocaleString()}</div>
                  </div>
                  <div className="mt-1 text-gray-700">
                    %Inicial: {r.metrics?.pctInicial ?? 0} • %Final: {r.metrics?.pctFinal ?? 0} • PS:{" "}
                    {r.metrics?.PS ?? 0} • IC: {r.metrics?.IC ?? 0}
                  </div>
                  {r.notas ? <div className="mt-1 text-gray-600">Notas: {r.notas}</div> : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="rounded-lg border border-gray-200 p-3">
      <div className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</div>
      <div className="text-2xl font-semibold text-gray-900">{value}</div>
    </div>
  );
}
