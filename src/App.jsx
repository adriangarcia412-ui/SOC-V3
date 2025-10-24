import React, { useEffect, useMemo, useState } from "react";

/** =========================
 *  CONFIG
 *  ========================= */
const LS_KEY = "SOC_V3_REGISTROS";

// Opciones de ejemplo (puedes cambiarlas cuando quieras)
const CATEGORIAS = ["Academia", "Convivencia", "Higiene", "Puntualidad"];
const CONDUCTAS = [
  "Participa en clase",
  "Interrumpe",
  "Ayuda a un compañero/a",
  "Uso correcto de uniforme",
  "Llega tarde",
];
const INTENSIDAD = ["Baja", "Media", "Alta"];

/** =========================
 *  UTILS
 *  ========================= */
const hoyISO = () => new Date().toISOString().slice(0, 16); // YYYY-MM-DDTHH:mm

const toCSV = (rows) => {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const lines = [
    headers.join(","), // encabezados
    ...rows.map((r) =>
      headers
        .map((h) =>
          String(r[h] ?? "")
            .replaceAll('"', '""')
            .replaceAll("\n", " ")
        )
        .map((v) => `"${v}"`)
        .join(",")
    ),
  ];
  return lines.join("\n");
};

const download = (filename, content, mime = "text/plain;charset=utf-8") => {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
};

/** =========================
 *  APP
 *  ========================= */
export default function App() {
  const [registros, setRegistros] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [editId, setEditId] = useState(null);

  const [form, setForm] = useState({
    fecha: hoyISO(),
    estudiante: "",
    categoria: CATEGORIAS[0],
    conducta: CONDUCTAS[0],
    intensidad: INTENSIDAD[0],
    notas: "",
  });

  // Cargar desde localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) setRegistros(JSON.parse(raw));
    } catch {}
  }, []);

  // Guardar en localStorage
  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(registros));
  }, [registros]);

  const limpiar = () =>
    setForm({
      fecha: hoyISO(),
      estudiante: "",
      categoria: CATEGORIAS[0],
      conducta: CONDUCTAS[0],
      intensidad: INTENSIDAD[0],
      notas: "",
    });

  const onChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const onSubmit = (e) => {
    e.preventDefault();
    const payload = {
      id: editId ?? Date.now(),
      ...form,
    };
    if (editId) {
      // editar
      setRegistros((rs) => rs.map((r) => (r.id === editId ? payload : r)));
      setEditId(null);
    } else {
      // crear
      setRegistros((rs) => [payload, ...rs]);
    }
    limpiar();
  };

  const onEdit = (r) => {
    setEditId(r.id);
    setForm({
      fecha: r.fecha,
      estudiante: r.estudiante,
      categoria: r.categoria,
      conducta: r.conducta,
      intensidad: r.intensidad,
      notas: r.notas,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const onDelete = (id) => {
    if (!confirm("¿Eliminar este registro?")) return;
    setRegistros((rs) => rs.filter((r) => r.id !== id));
    if (editId === id) {
      setEditId(null);
      limpiar();
    }
  };

  const exportarCSV = () => {
    if (!registros.length) return alert("No hay registros para exportar.");
    const csv = toCSV(registros);
    download(`SOC-V3_${new Date().toISOString().slice(0, 10)}.csv`, csv, "text/csv;charset=utf-8");
  };

  const filtrados = useMemo(() => {
    if (!busqueda.trim()) return registros;
    const q = busqueda.toLowerCase();
    return registros.filter(
      (r) =>
        r.estudiante.toLowerCase().includes(q) ||
        r.conducta.toLowerCase().includes(q) ||
        r.categoria.toLowerCase().includes(q) ||
        r.intensidad.toLowerCase().includes(q) ||
        r.notas.toLowerCase().includes(q)
    );
  }, [busqueda, registros]);

  return (
    <div style={styles.wrap}>
      <h1 style={styles.title}>SOC V3</h1>
      <p style={{ marginTop: -10, color: "#666" }}>
        Nuevo Sistema de Observación de Comportamientos
      </p>

      {/* ===== FORM ===== */}
      <form onSubmit={onSubmit} style={styles.card}>
        <div style={styles.grid}>
          <div style={styles.field}>
            <label>Fecha y hora</label>
            <input
              type="datetime-local"
              name="fecha"
              value={form.fecha}
              onChange={onChange}
              required
            />
          </div>

          <div style={styles.field}>
            <label>Estudiante</label>
            <input
              type="text"
              name="estudiante"
              value={form.estudiante}
              onChange={onChange}
              placeholder="Nombre y apellido"
              required
            />
          </div>

          <div style={styles.field}>
            <label>Categoría</label>
            <select name="categoria" value={form.categoria} onChange={onChange}>
              {CATEGORIAS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.field}>
            <label>Conducta</label>
            <select name="conducta" value={form.conducta} onChange={onChange}>
              {CONDUCTAS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div style={styles.field}>
            <label>Intensidad</label>
            <div style={{ display: "flex", gap: 8 }}>
              {INTENSIDAD.map((i) => (
                <label key={i} style={styles.badgeOpt}>
                  <input
                    type="radio"
                    name="intensidad"
                    value={i}
                    checked={form.intensidad === i}
                    onChange={onChange}
                  />
                  <span>{i}</span>
                </label>
              ))}
            </div>
          </div>

          <div style={{ ...styles.field, gridColumn: "1 / -1" }}>
            <label>Notas (opcional)</label>
            <textarea
              name="notas"
              value={form.notas}
              onChange={onChange}
              rows={3}
              placeholder="Observaciones breves…"
            />
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 10 }}>
          <button type="submit" style={styles.btnPrimary}>
            {editId ? "Guardar cambios" : "Agregar registro"}
          </button>
          <button type="button" onClick={limpiar} style={styles.btnGhost}>
            Limpiar
          </button>
          <button type="button" onClick={exportarCSV} style={styles.btnCSV}>
            Exportar CSV
          </button>
        </div>
      </form>

      {/* ===== BUSCADOR ===== */}
      <div style={{ ...styles.card, marginTop: 16 }}>
        <input
          style={{ width: "100%", padding: 10, border: "1px solid #ddd", borderRadius: 8 }}
          placeholder="Buscar por estudiante, conducta, categoría, intensidad o notas…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
      </div>

      {/* ===== LISTA ===== */}
      <div style={{ ...styles.card, marginTop: 16, overflowX: "auto" }}>
        {!filtrados.length ? (
          <p style={{ color: "#777" }}>Sin registros (o sin coincidencias).</p>
        ) : (
          <table style={styles.table}>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Estudiante</th>
                <th>Categoría</th>
                <th>Conducta</th>
                <th>Intensidad</th>
                <th>Notas</th>
                <th style={{ width: 130 }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map((r) => (
                <tr key={r.id}>
                  <td>{r.fecha.replace("T", " ")}</td>
                  <td>{r.estudiante}</td>
                  <td>{r.categoria}</td>
                  <td>{r.conducta}</td>
                  <td>{r.intensidad}</td>
                  <td>{r.notas}</td>
                  <td>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => onEdit(r)} style={styles.btnSmall}>
                        Editar
                      </button>
                      <button onClick={() => onDelete(r.id)} style={styles.btnDanger}>
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

/** =========================
 *  STYLES (inline)
 *  ========================= */
const styles = {
  wrap: {
    maxWidth: 1100,
    margin: "30px auto 80px",
    padding: "0 16px",
    fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial",
  },
  title: { fontSize: 28, margin: 0 },
  card: {
    background: "#fff",
    border: "1px solid #eee",
    borderRadius: 12,
    padding: 16,
    boxShadow: "0 1px 2px rgba(0,0,0,.03)",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 12,
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
  badgeOpt: {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    border: "1px solid #ddd",
    padding: "6px 10px",
    borderRadius: 999,
    cursor: "pointer",
  },
  btnPrimary: {
    background: "#111827",
    color: "#fff",
    border: "1px solid #111827",
    padding: "10px 14px",
    borderRadius: 8,
    cursor: "pointer",
  },
  btnGhost: {
    background: "#fff",
    color: "#111",
    border: "1px solid #ddd",
    padding: "10px 14px",
    borderRadius: 8,
    cursor: "pointer",
  },
  btnCSV: {
    background: "#065f46",
    color: "#fff",
    border: "1px solid #065f46",
    padding: "10px 14px",
    borderRadius: 8,
    cursor: "pointer",
  },
  btnSmall: {
    background: "#2563eb",
    color: "#fff",
    border: "1px solid #2563eb",
    padding: "6px 10px",
    borderRadius: 6,
    cursor: "pointer",
    fontSize: 13,
  },
  btnDanger: {
    background: "#b91c1c",
    color: "#fff",
    border: "1px solid #b91c1c",
    padding: "6px 10px",
    borderRadius: 6,
    cursor: "pointer",
    fontSize: 13,
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
};

// Estilos básicos para inputs/select/textarea
const base = document.createElement("style");
base.innerHTML = `
  input[type="text"], input[type="datetime-local"], select, textarea {
    border: 1px solid #ddd; border-radius: 8px; padding: 10px; outline: none; font-size: 14px;
  }
  input[type="text"]:focus, input[type="datetime-local"]:focus, select:focus, textarea:focus { border-color: #111827; }
  table thead th { text-align: left; padding: 10px; background: #fafafa; border-bottom: 1px solid #eee; font-weight: 600; }
  table tbody td { padding: 10px; border-bottom: 1px solid #f1f1f1; vertical-align: top; }
`;
document.head.appendChild(base);
