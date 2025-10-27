import React, { useEffect, useMemo, useRef, useState } from "react";
import "./modern.css";

/* ========= Config ========= */
const DRAFT_KEY = "socv3/draft/v1";

/* ========= Ítems ========= */
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
  "Verifica el estado de sus herramientas / 工具设备点检完好"
];

const nuevaEvaluacion = () =>
  ITEMS.map(() => ({
    inicial: "", // "SI" | "NO" | ""
    final: ""    // "SI" | "NO" | ""
  }));

const calcularPct = (arr, campo) => {
  const total = arr.length;
  if (!total) return 0;
  const si = arr.filter((e) => e[campo] === "SI").length;
  return Math.round((si / total) * 100);
};

const nowIso = () => new Date().toISOString();

/* ========= App ========= */
export default function App() {
  const [formData, setFormData] = useState({
    fecha: "",
    nombre: "",
    antiguedad: "",
    area: "",
    supervisor: "",
    evaluaciones: nuevaEvaluacion()
  });

  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [okMsg, setOkMsg] = useState("");
  const [errMsg, setErrMsg] = useState("");
  const [draftInfo, setDraftInfo] = useState(null); // {savedAt: ISO}

  const pctInicial = useMemo(
    () => calcularPct(formData.evaluaciones, "inicial"),
    [formData.evaluaciones]
  );
  const pctFinal = useMemo(
    () => calcularPct(formData.evaluaciones, "final"),
    [formData.evaluaciones]
  );

  /* ====== Change handlers ====== */
  const handleField = (k) => (e) => {
    setFormData((s) => ({ ...s, [k]: e.target.value }));
  };
  const handleRadio = (idx, columna, valor) => {
    setFormData((s) => {
      const evals = s.evaluaciones.slice();
      evals[idx] = { ...evals[idx], [columna]: valor };
      return { ...s, evaluaciones: evals };
    });
  };

  /* ====== Validación mínima ====== */
  const validar = () => {
    const e = {};
    if (!formData.fecha) e.fecha = "Requerido";
    if (!formData.nombre) e.nombre = "Requerido";
    if (!formData.antiguedad) e.antiguedad = "Requerido";
    if (!formData.area) e.area = "Requerido";
    if (!formData.supervisor) e.supervisor = "Requerido";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  /* ====== Borradores (localStorage) ====== */

  // Cargar borrador (si existe) al abrir
  useEffect(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const draft = JSON.parse(raw);
        if (draft?.data) {
          setFormData(draft.data);
          setDraftInfo({ savedAt: draft.savedAt });
        }
      }
    } catch {}
  }, []);

  // Autoguardar con debounce
  const saveTimer = useRef(null);
  useEffect(() => {
    // No guardes mientras está enviando
    if (loading) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      try {
        const bundle = { data: formData, savedAt: nowIso() };
        localStorage.setItem(DRAFT_KEY, JSON.stringify(bundle));
        setDraftInfo({ savedAt: bundle.savedAt });
      } catch {}
    }, 800);
    return () => clearTimeout(saveTimer.current);
  }, [formData, loading]);

  const guardarBorradorManual = () => {
    try {
      const bundle = { data: formData, savedAt: nowIso() };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(bundle));
      setDraftInfo({ savedAt: bundle.savedAt });
      setOkMsg("Borrador guardado localmente.");
      setTimeout(() => setOkMsg(""), 2000);
    } catch {
      setErrMsg("No se pudo guardar el borrador en este navegador.");
    }
  };

  const borrarBorrador = () => {
    localStorage.removeItem(DRAFT_KEY);
    setDraftInfo(null);
    setOkMsg("Borrador eliminado.");
    setTimeout(() => setOkMsg(""), 2000);
  };

  const descargarBorrador = () => {
    const a = document.createElement("a");
    const payload = JSON.stringify({ data: formData, savedAt: nowIso() }, null, 2);
    const blob = new Blob([payload], { type: "application/json" });
    a.href = URL.createObjectURL(blob);
    a.download = "SOCV3-borrador.json";
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const cargarBorradorArchivo = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const json = JSON.parse(String(reader.result || "{}"));
        if (json?.data) {
          setFormData(json.data);
          setDraftInfo({ savedAt: json.savedAt || nowIso() });
          setOkMsg("Borrador importado.");
          setTimeout(() => setOkMsg(""), 2000);
        } else {
          setErrMsg("Archivo inválido.");
        }
      } catch {
        setErrMsg("Archivo inválido.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  /* ====== Submit ====== */
  const onSubmit = async (ev) => {
    ev.preventDefault();
    setOkMsg("");
    setErrMsg("");

    if (!validar()) {
      setErrMsg("Por favor, completa los campos obligatorios.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        fase: "FINAL",
        ts: new Date().toISOString(),
        nombre: formData.nombre,
        antiguedad: formData.antiguedad,
        area: formData.area,
        supervisor: formData.supervisor,
        fecha_local: formData.fecha,
        evaluaciones: formData.evaluaciones,
        pct_inicial: pctInicial,
        pct_final: pctFinal
      };

      const res = await fetch("/api/gsheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || data?.ok === false) {
        throw new Error(data?.error || "No se pudo guardar en la hoja.");
      }

      // limpiar formulario y borrador
      setFormData((s) => ({
        ...s,
        evaluaciones: nuevaEvaluacion()
      }));
      localStorage.removeItem(DRAFT_KEY);
      setDraftInfo(null);

      setOkMsg("¡Registro guardado correctamente!");
    } catch (err) {
      setErrMsg(String(err.message || err));
    } finally {
      setLoading(false);
      // limpiar mensajes después de un tiempo
      setTimeout(() => {
        setOkMsg("");
        setErrMsg("");
      }, 3000);
    }
  };

  /* ====== UI ====== */
  return (
    <div className="container">
      <header className="app-header">
        <img src="/hengli-logo.png" alt="Hengli" className="logo" />
        <h1>SOC V3</h1>
        <h2>Sistema de Observación de Comportamientos</h2>
        <p className="cn-sub">行为观察系统</p>
      </header>

      <form className="form" onSubmit={onSubmit}>
        <section className="employee">
          <h3>Información del empleado / 员工信息</h3>

          {draftInfo && (
            <div className="draft-banner">
              Borrador cargado — guardado el{" "}
              {new Date(draftInfo.savedAt).toLocaleString()}
            </div>
          )}

          <div className="grid-5">
            <div className="field">
              <label>Fecha y hora / 日期和时间:</label>
              <input
                type="datetime-local"
                value={formData.fecha}
                onChange={handleField("fecha")}
                className={errors.fecha ? "invalid" : ""}
              />
              {errors.fecha && <small className="err">{errors.fecha}</small>}
            </div>

            <div className="field">
              <label>Nombre del empleado / 员工姓名:</label>
              <input
                type="text"
                placeholder="Nombre y apellido"
                value={formData.nombre}
                onChange={handleField("nombre")}
                className={errors.nombre ? "invalid" : ""}
              />
              {errors.nombre && <small className="err">{errors.nombre}</small>}
            </div>

            <div className="field">
              <label>Antigüedad / 工龄:</label>
              <input
                type="text"
                placeholder="Ej. 2 años"
                value={formData.antiguedad}
                onChange={handleField("antiguedad")}
                className={errors.antiguedad ? "invalid" : ""}
              />
              {errors.antiguedad && (
                <small className="err">{errors.antiguedad}</small>
              )}
            </div>

            <div className="field">
              <label>Área / 区域:</label>
              <input
                type="text"
                placeholder="Área"
                value={formData.area}
                onChange={handleField("area")}
                className={errors.area ? "invalid" : ""}
              />
              {errors.area && <small className="err">{errors.area}</small>}
            </div>

            <div className="field">
              <label>Supervisor / 主管:</label>
              <input
                type="text"
                placeholder="Supervisor"
                value={formData.supervisor}
                onChange={handleField("supervisor")}
                className={errors.supervisor ? "invalid" : ""}
              />
              {errors.supervisor && (
                <small className="err">{errors.supervisor}</small>
              )}
            </div>
          </div>

          <div className="draft-actions">
            <button type="button" onClick={guardarBorradorManual}>
              Guardar borrador
            </button>
            <button type="button" onClick={borrarBorrador}>
              Borrar borrador
            </button>
            <button type="button" onClick={descargarBorrador}>
              Exportar borrador (.json)
            </button>
            <label className="btn-file">
              Importar borrador (.json)
              <input type="file" accept="application/json" onChange={cargarBorradorArchivo} />
            </label>
          </div>
        </section>

        <section className="eval">
          <h3>Evaluación / 评估</h3>
          <p className="help">
            Marca solo <b>una</b> opción por columna (Inicial o Final) en cada fila.
          </p>

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
                      name={`i${idx}-inicial`}
                      checked={formData.evaluaciones[idx].inicial === "SI"}
                      onChange={() => handleRadio(idx, "inicial", "SI")}
                    />
                  </td>
                  <td className="eval-cell">
                    <input
                      type="radio"
                      name={`i${idx}-inicial`}
                      checked={formData.evaluaciones[idx].inicial === "NO"}
                      onChange={() => handleRadio(idx, "inicial", "NO")}
                    />
                  </td>
                  <td className="eval-cell">
                    <input
                      type="radio"
                      name={`i${idx}-final`}
                      checked={formData.evaluaciones[idx].final === "SI"}
                      onChange={() => handleRadio(idx, "final", "SI")}
                    />
                  </td>
                  <td className="eval-cell">
                    <input
                      type="radio"
                      name={`i${idx}-final`}
                      checked={formData.evaluaciones[idx].final === "NO"}
                      onChange={() => handleRadio(idx, "final", "NO")}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="summary">
            <div className="sum-field">
              <label>Porcentaje de cumplimiento inicial (%):</label>
              <input value={pctInicial} readOnly />
            </div>
            <div className="sum-field">
              <label>Porcentaje de cumplimiento final (%):</label>
              <input value={pctFinal} readOnly />
            </div>
          </div>
        </section>

        {okMsg && <div className="ok">{okMsg}</div>}
        {errMsg && <div className="error">{errMsg}</div>}

        <div className="actions">
          <button type="submit" disabled={loading}>
            {loading ? "Enviando..." : "Enviar"}
          </button>
        </div>
      </form>
    </div>
  );
}
