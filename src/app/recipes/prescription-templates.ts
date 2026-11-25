export interface PrescriptionTemplate {
  id: string;
  name: string;
  description: string;
  color: string;
  accent: string;
  layout: string;
  officeLogo: boolean;
  watermark: boolean;
  footerReference: boolean;
}
export const PRESCRIPTION_TEMPLATES: readonly PrescriptionTemplate[] = [
  {
    id: 'ocean',
    name: 'Océano clínico',
    description: 'Membrete institucional, dos logos y pie clásico.',
    color: '#075985',
    accent: '#06b6d4',
    layout: 'wave',
    officeLogo: true,
    watermark: true,
    footerReference: false,
  },
  {
    id: 'emerald',
    name: 'Esmeralda',
    description: 'Identidad lateral, fecha adelantada y firma a la derecha.',
    color: '#047857',
    accent: '#34d399',
    layout: 'rail',
    officeLogo: false,
    watermark: true,
    footerReference: false,
  },
  {
    id: 'editorial',
    name: 'Editorial',
    description: 'Cabecera centrada y firma sobre el QR. Sin marca de agua.',
    color: '#6d472f',
    accent: '#c4a484',
    layout: 'serif',
    officeLogo: false,
    watermark: false,
    footerReference: false,
  },
  {
    id: 'indigo',
    name: 'Índigo moderno',
    description: 'Datos de emisión al inicio, cabecera dividida y contacto al pie.',
    color: '#4338ca',
    accent: '#a78bfa',
    layout: 'split',
    officeLogo: true,
    watermark: true,
    footerReference: true,
  },
  {
    id: 'terracotta',
    name: 'Terracota',
    description: 'Logo a la derecha del nombre y pie asimétrico.',
    color: '#a3412b',
    accent: '#fb923c',
    layout: 'edge',
    officeLogo: false,
    watermark: true,
    footerReference: false,
  },
  {
    id: 'graphite',
    name: 'Grafito',
    description: 'Cabecera sobria en bloque y folio al final. Sin marca de agua.',
    color: '#1f2937',
    accent: '#94a3b8',
    layout: 'dark',
    officeLogo: false,
    watermark: false,
    footerReference: true,
  },
  {
    id: 'botanical',
    name: 'Botánica',
    description: 'Marco institucional, dos logos y verificación enmarcada.',
    color: '#426b45',
    accent: '#a3b18a',
    layout: 'frame',
    officeLogo: true,
    watermark: true,
    footerReference: false,
  },
  {
    id: 'rose',
    name: 'Rosa cuarzo',
    description: 'Cabecera suave, paciente destacado y firma en tarjeta.',
    color: '#a12d57',
    accent: '#f4a7bd',
    layout: 'soft',
    officeLogo: false,
    watermark: true,
    footerReference: false,
  },
  {
    id: 'sapphire',
    name: 'Zafiro',
    description: 'Emisión en franja superior y QR a la izquierda del pie.',
    color: '#1d4ed8',
    accent: '#60a5fa',
    layout: 'band',
    officeLogo: false,
    watermark: true,
    footerReference: true,
  },
  {
    id: 'amber',
    name: 'Ámbar',
    description: 'Membrete abierto, contacto al final y firma minimalista.',
    color: '#92400e',
    accent: '#fbbf24',
    layout: 'minimal',
    officeLogo: false,
    watermark: true,
    footerReference: false,
  },
];
export const PHYSICAL_TEMPLATE: PrescriptionTemplate = {
  id: 'physical-custom',
  name: 'PLANTILLA FÍSICA PERSONALIZADA',
  description: 'Tu recetario físico convertido en una plantilla digital.',
  color: '#075985',
  accent: '#06b6d4',
  layout: 'custom',
  officeLogo: true,
  watermark: false,
  footerReference: false,
};
export const prescriptionTemplate = (id: string) =>
  id === PHYSICAL_TEMPLATE.id
    ? PHYSICAL_TEMPLATE
    : PRESCRIPTION_TEMPLATES.find((t) => t.id === id) || PRESCRIPTION_TEMPLATES[0];
export function examplePrescription(
  doctor: any,
  office: any,
  templateId: string,
  orientation: string = 'portrait',
) {
  return {
    templateId,
    orientation,
    example: true,
    folio: 'EJEMPLO · SIN FOLIO EMITIDO',
    createdAt: new Date().toISOString(),
    header: {
      author: doctor,
      office,
      patient: { fullName: 'Paciente de ejemplo', age: '35', birthDate: '' },
    },
    medications: [
      {
        genericName: 'Sustancia genérica de ejemplo A',
        pharmaceuticalForm: 'Tabletas',
        concentration: '500 mg · ejemplo',
        presentation: 'Caja de 10 tabletas · ejemplo',
        dose: 'Una tableta · ejemplo',
        route: 'Vía oral · ejemplo',
        frequency: 'Cada 8 horas · ejemplo',
        duration: '3 días · ejemplo',
      },
    ],
    instructions:
      'Estos medicamentos e indicaciones son únicamente una demostración del diseño. No constituyen una recomendación de tratamiento.',
  };
}
