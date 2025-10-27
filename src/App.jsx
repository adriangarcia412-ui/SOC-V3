{/* === Evaluación === */}
<h2>Evaluación / 评估</h2>

<table className="eval-table">
  <thead>
    <tr>
      <th style={{minWidth: '320px'}}>Ítem / 项目</th>
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
            name={`i${idx}-inicial`}             // <-- MISMO name para el par inicial (Sí/No)
            checked={formData.evaluaciones[idx].inicialSi === 'SI'}
            onChange={() => {
              const next = [...formData.evaluaciones];
              next[idx] = { ...next[idx], inicialSi: 'SI', inicialNo: 'NO' };
              setFormData({ ...formData, evaluaciones: next });
            }}
          />
        </td>

        {/* Inicial No */}
        <td className="eval-cell">
          <input
            type="radio"
            name={`i${idx}-inicial`}             // <-- comparte name con “Inicial Sí”
            checked={formData.evaluaciones[idx].inicialNo === 'NO' && formData.evaluaciones[idx].inicialSi !== 'SI'}
            onChange={() => {
              const next = [...formData.evaluaciones];
              next[idx] = { ...next[idx], inicialSi: '', inicialNo: 'NO' };
              setFormData({ ...formData, evaluaciones: next });
            }}
          />
        </td>

        {/* Final Sí */}
        <td className="eval-cell">
          <input
            type="radio"
            name={`i${idx}-final`}               // <-- MISMO name para el par final (Sí/No)
            checked={formData.evaluaciones[idx].finalSi === 'SI'}
            onChange={() => {
              const next = [...formData.evaluaciones];
              next[idx] = { ...next[idx], finalSi: 'SI', finalNo: 'NO' };
              setFormData({ ...formData, evaluaciones: next });
            }}
          />
        </td>

        {/* Final No */}
        <td className="eval-cell">
          <input
            type="radio"
            name={`i${idx}-final`}               // <-- comparte name con “Final Sí”
            checked={formData.evaluaciones[idx].finalNo === 'NO' && formData.evaluaciones[idx].finalSi !== 'SI'}
            onChange={() => {
              const next = [...formData.evaluaciones];
              next[idx] = { ...next[idx], finalSi: '', finalNo: 'NO' };
              setFormData({ ...formData, evaluaciones: next });
            }}
          />
        </td>
      </tr>
    ))}
  </tbody>
</table>
