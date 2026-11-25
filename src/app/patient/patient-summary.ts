export function patientSummary(p: any) {
  const f = p.fichaDeIdentificacion || {},
    histories = new Map<string, any>();
  for (const h of p['follow-ups'] || [])
    histories.set(`${h.expedienteId || ''}|${h.followUpId}`, h);
  const notes = [...histories.values()].sort((a, b) =>
    String(b.createdAt || '').localeCompare(String(a.createdAt || '')),
  );
  const medical = notes.filter(
    (v) => !v.documentType || ['initial-history', 'evolution'].includes(v.documentType),
  );
  const count = medical.length || Number(p.consultationCount || 0),
    latest = medical[0];
  const text = (v: any, fallback: string) =>
    String(v ?? '').trim() && String(v).trim() !== '-' ? String(v).trim() : fallback;
  return {
    id: p.idPaciente || p.id || '',
    idPaciente: p.idPaciente || p.id || '',
    expedienteId: p.expedienteId || '',
    numeroDeExpediente: p.numeroDeExpediente || p.expedienteNum || '',
    nombre: text(f.nombreCompleto || p.nombre, 'Sin nombre'),
    telefono: text(f.telefono || p.telefono, 'Sin teléfono'),
    correo: text(f.correo || p.correo || p.generalIdentificationData?.email, 'Sin correo'),
    expedienteNum: text(p.numeroDeExpediente || p.expedienteNum, 'Sin expediente'),
    categoriaConsulta: '',
    ultimoMotivo: text(
      p.lastConsultationReason || latest?.consultationReason,
      'Sin motivo registrado',
    ),
    ultimaVisita: count
      ? String(p.lastConsultationDate || latest?.createdAt || '').split('T')[0]
      : '',
    numeroVisitas: count,
    esPrimeraVez: count === 0,
    edad: Number(f.edad) || 0,
    sexo: text(f.sexo, 'No especificado'),
  };
}
