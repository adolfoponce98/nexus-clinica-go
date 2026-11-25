export const SPECIALTY_SCHEMAS: Record<string, any> = {
  GEN: {
    code: 'GEN',
    name: 'Medicina General',
    folder: 'general',
    version: 1,
    optionalVitals: false,
    groups: [
      {
        title: 'Interrogatorio por aparatos y sistemas',
        fields: [
          {
            key: 'cardiovascularStatus',
            label: 'Cardiovascular',
            type: 'select',
            options: ['Normal', 'Hallazgo'],
          },
          {
            key: 'cardiovascularFinding',
            label: 'Hallazgo · Cardiovascular',
            type: 'textarea',
          },
          {
            key: 'respiratoryStatus',
            label: 'Respiratorio',
            type: 'select',
            options: ['Normal', 'Hallazgo'],
          },
          {
            key: 'respiratoryFinding',
            label: 'Hallazgo · Respiratorio',
            type: 'textarea',
          },
          {
            key: 'digestiveStatus',
            label: 'Digestivo',
            type: 'select',
            options: ['Normal', 'Hallazgo'],
          },
          {
            key: 'digestiveFinding',
            label: 'Hallazgo · Digestivo',
            type: 'textarea',
          },
          {
            key: 'urinaryStatus',
            label: 'Urinario',
            type: 'select',
            options: ['Normal', 'Hallazgo'],
          },
          {
            key: 'urinaryFinding',
            label: 'Hallazgo · Urinario',
            type: 'textarea',
          },
          {
            key: 'neurologicStatus',
            label: 'Neurológico',
            type: 'select',
            options: ['Normal', 'Hallazgo'],
          },
          {
            key: 'neurologicFinding',
            label: 'Hallazgo · Neurológico',
            type: 'textarea',
          },
        ],
      },
      {
        title: 'Control de enfermedades crónicas',
        fields: [
          {
            key: 'capillaryGlucose',
            label: 'Glucemia capilar · mg/dL',
            type: 'number',
            min: 0,
            max: 1500,
          },
          {
            key: 'hba1c',
            label: 'HbA1c · %',
            type: 'number',
            min: 0,
            max: 30,
          },
          {
            key: 'cardiovascularRisk',
            label: 'Riesgo cardiovascular · evaluación clínica',
            type: 'textarea',
          },
          {
            key: 'chronicControl',
            label: 'Control y adherencia de enfermedades crónicas',
            type: 'textarea',
          },
        ],
      },
    ],
    widgets: [],
    extraFields: [],
  },
  GINE: {
    code: 'GINE',
    name: 'Ginecología y Obstetricia',
    folder: 'gynecology',
    version: 1,
    optionalVitals: false,
    groups: [
      {
        title: 'Seguimiento ginecológico',
        fields: [
          {
            key: 'lastMenstruation',
            label: 'Fecha de última menstruación',
            type: 'date',
          },
          {
            key: 'bleedingPattern',
            label: 'Características del sangrado',
            type: 'textarea',
          },
          {
            key: 'contraception',
            label: 'Método anticonceptivo actual',
            type: 'text',
          },
          {
            key: 'lastPap',
            label: 'Fecha de último Papanicolaou',
            type: 'date',
          },
          {
            key: 'lastMammogram',
            label: 'Fecha de última mastografía',
            type: 'date',
          },
          {
            key: 'pregnant',
            label: 'Paciente embarazada',
            type: 'checkbox',
          },
        ],
      },
      {
        title: 'Control prenatal',
        fields: [
          {
            key: 'fundalHeight',
            label: 'Fondo uterino · cm',
            type: 'number',
            min: 0,
            max: 60,
          },
          {
            key: 'fetalHeartRate',
            label: 'Frecuencia cardiaca fetal · lpm',
            type: 'number',
            min: 0,
            max: 300,
          },
          {
            key: 'fetalMovements',
            label: 'Movimientos fetales',
            type: 'select',
            options: ['Presentes', 'Ausentes', 'No valorables'],
          },
          {
            key: 'fetalPresentation',
            label: 'Presentación fetal',
            type: 'text',
          },
          {
            key: 'legEdema',
            label: 'Edema en miembros inferiores',
            type: 'select',
            options: ['Ausente', 'Presente'],
          },
          {
            key: 'proteinuria',
            label: 'Proteinuria · tira reactiva',
            type: 'text',
          },
          {
            key: 'prenatalObservations',
            label: 'Observaciones del control prenatal',
            type: 'textarea',
          },
        ],
        when: 'pregnant',
      },
    ],
    widgets: ['pregnancy'],
    extraFields: [],
  },
  PED: {
    code: 'PED',
    name: 'Pediatría',
    folder: 'pediatrics',
    version: 1,
    optionalVitals: false,
    groups: [
      {
        title: 'Somatometría y alimentación',
        fields: [
          {
            key: 'headCircumference',
            label: 'Perímetro cefálico · cm',
            type: 'number',
            min: 0,
            max: 100,
          },
          {
            key: 'abdominalCircumference',
            label: 'Perímetro abdominal · cm',
            type: 'number',
            min: 0,
            max: 200,
          },
          {
            key: 'armCircumference',
            label: 'Perímetro braquial · cm',
            type: 'number',
            min: 0,
            max: 100,
          },
          {
            key: 'measurementPosition',
            label: 'Medición de talla/longitud',
            type: 'select',
            options: ['Acostado', 'De pie'],
          },
          {
            key: 'growthReferenceSex',
            label: 'Sexo de referencia OMS',
            type: 'select',
            options: ['Femenino', 'Masculino'],
          },
          {
            key: 'bilateralEdema',
            label: 'Edema bilateral en pies',
            type: 'checkbox',
          },
          {
            key: 'feeding',
            label: 'Tipo de alimentación',
            type: 'select',
            options: [
              'Lactancia materna exclusiva',
              'Mixta',
              'Fórmula',
              'Alimentación complementaria',
              'Dieta familiar',
            ],
          },
          {
            key: 'feedingDetails',
            label: 'Detalle de alimentación',
            type: 'textarea',
          },
        ],
      },
      {
        title: 'Desarrollo psicomotor',
        fields: [
          {
            key: 'headControl',
            label: 'Sostén cefálico',
            type: 'select',
            options: ['Alcanzado', 'En desarrollo', 'No alcanzado', 'No valorado'],
          },
          {
            key: 'sitting',
            label: 'Sedestación',
            type: 'select',
            options: ['Alcanzado', 'En desarrollo', 'No alcanzado', 'No valorado'],
          },
          {
            key: 'crawling',
            label: 'Gateo',
            type: 'select',
            options: ['Alcanzado', 'En desarrollo', 'No alcanzado', 'No valorado'],
          },
          {
            key: 'standing',
            label: 'Bipedestación',
            type: 'select',
            options: ['Alcanzado', 'En desarrollo', 'No alcanzado', 'No valorado'],
          },
          {
            key: 'language',
            label: 'Lenguaje acorde a la edad',
            type: 'select',
            options: ['Alcanzado', 'En desarrollo', 'No alcanzado', 'No valorado'],
          },
          {
            key: 'developmentNotes',
            label: 'Observaciones del desarrollo',
            type: 'textarea',
          },
        ],
      },
      {
        title: 'Cartilla de vacunación',
        fields: [
          {
            key: 'vaccines',
            label: 'Registro de vacunas',
            type: 'table',
            columns: [
              {
                key: 'vaccine',
                label: 'Vacuna',
                type: 'select',
                options: [
                  'BCG',
                  'Hepatitis B',
                  'Hexavalente',
                  'Rotavirus',
                  'Neumococo',
                  'Influenza',
                  'SRP',
                  'DPT',
                  'VPH',
                  'Td',
                  'Otra',
                ],
              },
              {
                key: 'dose',
                label: 'Dosis',
                type: 'text',
              },
              {
                key: 'date',
                label: 'Fecha de aplicación',
                type: 'date',
              },
              {
                key: 'status',
                label: 'Registro',
                type: 'select',
                options: ['Aplicada', 'Pendiente', 'No documentada'],
              },
              {
                key: 'notes',
                label: 'Observación',
                type: 'text',
              },
            ],
          },
        ],
      },
    ],
    widgets: ['growth'],
    extraFields: [],
  },
  TRAUM: {
    code: 'TRAUM',
    name: 'Traumatología y Ortopedia',
    folder: 'traumatologic',
    version: 1,
    optionalVitals: false,
    groups: [
      {
        title: 'Exploración musculoesquelética',
        fields: [
          {
            key: 'painEva',
            label: 'Dolor · EVA (0–10)',
            type: 'number',
            min: 0,
            max: 10,
          },
          {
            key: 'rangeOfMotion',
            label: 'Arcos de movilidad · ROM',
            type: 'textarea',
          },
          {
            key: 'muscleStrength',
            label: 'Fuerza muscular',
            type: 'textarea',
          },
          {
            key: 'osteotendinousReflexes',
            label: 'Reflejos osteotendinosos',
            type: 'textarea',
          },
          {
            key: 'distalNeurovascular',
            label: 'Estado neurovascular distal · llenado, pulsos y sensibilidad',
            type: 'textarea',
          },
          {
            key: 'softTissues',
            label: 'Estado de tejidos blandos',
            type: 'textarea',
          },
          {
            key: 'functionalActivities',
            label: 'Actividades funcionales',
            type: 'textarea',
          },
          {
            key: 'supportDevices',
            label: 'Dispositivos de apoyo',
            type: 'textarea',
          },
        ],
      },
      {
        title: 'Valoración prequirúrgica y plan',
        fields: [
          {
            key: 'laterality',
            label: 'Lateralidad',
            type: 'select',
            options: ['Derecha', 'Izquierda', 'Bilateral', 'No aplica'],
          },
          {
            key: 'asa',
            label: 'Clasificación ASA',
            type: 'select',
            options: ['I', 'II', 'III', 'IV', 'V', 'VI', 'No valorada'],
          },
          {
            key: 'implants',
            label: 'Implantes o material de osteosíntesis',
            type: 'textarea',
          },
          {
            key: 'pharmacologicalModification',
            label: 'Modificación farmacológica',
            type: 'textarea',
          },
          {
            key: 'rehabilitationProgression',
            label: 'Progresión de rehabilitación',
            type: 'textarea',
          },
          {
            key: 'nextAppointment',
            label: 'Retiro de puntos, dispositivos y próxima cita',
            type: 'textarea',
          },
          {
            key: 'redFlags',
            label: 'Banderas rojas',
            type: 'textarea',
          },
        ],
      },
    ],
    widgets: ['bodyMap'],
    extraFields: [
      {
        key: 'bodyMarks',
        label: 'Mapa anatómico',
        type: 'table',
        columns: [
          {
            key: 'view',
            label: 'Vista',
            type: 'select',
            options: ['Anterior', 'Posterior'],
          },
          {
            key: 'zone',
            label: 'Zona anatómica',
            type: 'text',
          },
          {
            key: 'kind',
            label: 'Hallazgo',
            type: 'select',
            options: ['Dolor', 'Fractura', 'Inflamación', 'Herida', 'Lesión', 'Irradiación'],
          },
          {
            key: 'x',
            label: 'Coordenada X',
            type: 'number',
            min: 0,
            max: 100,
          },
          {
            key: 'y',
            label: 'Coordenada Y',
            type: 'number',
            min: 0,
            max: 100,
          },
          {
            key: 'notes',
            label: 'Descripción',
            type: 'text',
          },
        ],
      },
    ],
  },
  DER: {
    code: 'DER',
    name: 'Dermatología',
    folder: 'dermatology',
    version: 1,
    optionalVitals: false,
    groups: [
      {
        title: 'Evaluación de lesiones',
        fields: [
          {
            key: 'elementalLesion',
            label: 'Lesión elemental',
            type: 'select',
            options: [
              'Mácula',
              'Pápula',
              'Placa',
              'Nódulo',
              'Vesícula',
              'Pústula',
              'Úlcera',
              'Escama',
              'Otra',
            ],
          },
          {
            key: 'fitzpatrick',
            label: 'Fototipo · Fitzpatrick',
            type: 'select',
            options: ['I', 'II', 'III', 'IV', 'V', 'VI'],
          },
          {
            key: 'distribution',
            label: 'Distribución',
            type: 'select',
            options: ['Localizada', 'Diseminada', 'Generalizada'],
          },
          {
            key: 'borders',
            label: 'Bordes',
            type: 'textarea',
          },
          {
            key: 'color',
            label: 'Coloración',
            type: 'text',
          },
          {
            key: 'dermoscopy',
            label: 'Dermatoscopia',
            type: 'textarea',
          },
          {
            key: 'evolution',
            label: 'Evolución de las lesiones',
            type: 'textarea',
          },
        ],
      },
      {
        title: 'Procedimientos dermatológicos',
        fields: [
          {
            key: 'procedures',
            label: 'Bitácora de procedimientos',
            type: 'table',
            columns: [
              {
                key: 'procedure',
                label: 'Procedimiento',
                type: 'select',
                options: ['Crioterapia', 'Biopsia', 'Resección', 'Peeling', 'Láser', 'Otro'],
              },
              {
                key: 'zone',
                label: 'Zona',
                type: 'text',
              },
              {
                key: 'parameters',
                label: 'Parámetros',
                type: 'text',
              },
              {
                key: 'product',
                label: 'Producto aplicado',
                type: 'text',
              },
              {
                key: 'findings',
                label: 'Hallazgos y evolución',
                type: 'textarea',
              },
            ],
          },
        ],
      },
    ],
    widgets: ['bodyMap', 'photoComparison'],
    extraFields: [
      {
        key: 'bodyMarks',
        label: 'Mapa anatómico',
        type: 'table',
        columns: [
          {
            key: 'view',
            label: 'Vista',
            type: 'select',
            options: ['Anterior', 'Posterior'],
          },
          {
            key: 'zone',
            label: 'Zona anatómica',
            type: 'text',
          },
          {
            key: 'kind',
            label: 'Hallazgo',
            type: 'select',
            options: [
              'Dolor',
              'Fractura',
              'Inflamación',
              'Herida',
              'Lesión',
              'Irradiación',
              'Mácula',
              'Pápula',
              'Placa',
              'Nódulo',
              'Vesícula',
              'Pústula',
              'Úlcera',
              'Escama',
              'Otra',
            ],
          },
          {
            key: 'x',
            label: 'Coordenada X',
            type: 'number',
            min: 0,
            max: 100,
          },
          {
            key: 'y',
            label: 'Coordenada Y',
            type: 'number',
            min: 0,
            max: 100,
          },
          {
            key: 'notes',
            label: 'Descripción',
            type: 'text',
          },
        ],
      },
      {
        key: 'beforePhoto',
        label: 'Fotografía anterior',
        type: 'text',
      },
      {
        key: 'afterPhoto',
        label: 'Fotografía actual',
        type: 'text',
      },
    ],
  },
  DENT: {
    code: 'DENT',
    name: 'Odontología',
    folder: 'dentist',
    version: 1,
    optionalVitals: true,
    groups: [
      {
        title: 'Evaluación dental y periodontal',
        fields: [
          {
            key: 'painEva',
            label: 'Dolor dental · EVA (0–10)',
            type: 'number',
            min: 0,
            max: 10,
          },
          {
            key: 'gingivalState',
            label: 'Estado gingival y periodontal',
            type: 'textarea',
          },
          {
            key: 'applianceStatus',
            label: 'Aparatos, brackets y arcos',
            type: 'textarea',
          },
          {
            key: 'restorations',
            label: 'Esmalte y restauraciones',
            type: 'textarea',
          },
          {
            key: 'occlusion',
            label: 'Oclusión y mordida',
            type: 'textarea',
          },
          {
            key: 'hygiene',
            label: 'Higiene y hábitos',
            type: 'textarea',
          },
          {
            key: 'newSymptoms',
            label: 'Síntomas nuevos',
            type: 'textarea',
          },
          {
            key: 'periodontal',
            label: 'Periodontograma básico',
            type: 'table',
            columns: [
              {
                key: 'tooth',
                label: 'Pieza FDI',
                type: 'text',
              },
              {
                key: 'bleeding',
                label: 'Sangrado al sondaje',
                type: 'select',
                options: ['Sí', 'No', 'No valorado'],
              },
              {
                key: 'mobility',
                label: 'Movilidad',
                type: 'select',
                options: ['0', 'I', 'II', 'III', 'No valorada'],
              },
              {
                key: 'plaque',
                label: 'Placa',
                type: 'select',
                options: ['Sí', 'No', 'No valorada'],
              },
              {
                key: 'tartar',
                label: 'Sarro',
                type: 'select',
                options: ['Sí', 'No', 'No valorado'],
              },
            ],
          },
        ],
      },
      {
        title: 'Procedimientos de la sesión',
        fields: [
          {
            key: 'procedures',
            label: 'Tratamientos por pieza',
            type: 'table',
            columns: [
              {
                key: 'procedure',
                label: 'Procedimiento',
                type: 'text',
              },
              {
                key: 'tooth',
                label: 'Pieza FDI',
                type: 'text',
              },
              {
                key: 'material',
                label: 'Material utilizado',
                type: 'text',
              },
              {
                key: 'anesthetic',
                label: 'Anestésico aplicado',
                type: 'text',
              },
              {
                key: 'budget',
                label: 'Presupuesto · MXN',
                type: 'number',
                min: 0,
                max: 1000000,
              },
              {
                key: 'paid',
                label: 'Pago reportado · MXN',
                type: 'number',
                min: 0,
                max: 1000000,
              },
              {
                key: 'paymentReference',
                label: 'Referencia del cobro',
                type: 'text',
              },
            ],
          },
          {
            key: 'surgicalTechnique',
            label: 'Técnica quirúrgica y sutura',
            type: 'textarea',
          },
          {
            key: 'healing',
            label: 'Alvéolo, cicatrización y evolución postquirúrgica',
            type: 'textarea',
          },
          {
            key: 'nextAppointment',
            label: 'Indicaciones y próxima cita',
            type: 'textarea',
          },
        ],
      },
    ],
    widgets: ['odontogram'],
    extraFields: [
      {
        key: 'dentalChart',
        label: 'Odontograma FDI',
        type: 'table',
        columns: [
          {
            key: 'tooth',
            label: 'Pieza FDI',
            type: 'text',
          },
          {
            key: 'surface',
            label: 'Cara',
            type: 'select',
            options: ['Vestibular', 'Lingual/Palatino', 'Mesial', 'Distal', 'Oclusal/Incisal'],
          },
          {
            key: 'condition',
            label: 'Condición',
            type: 'select',
            options: ['Sano', 'Caries', 'Resina', 'Amalgama', 'Corona', 'Ausencia', 'Endodoncia'],
          },
        ],
      },
    ],
  },
  NUT: {
    code: 'NUT',
    name: 'Nutrición',
    folder: 'nutrition',
    version: 1,
    optionalVitals: false,
    groups: [
      {
        title: 'Antropometría y composición corporal',
        fields: [
          {
            key: 'bodyFat',
            label: 'Grasa corporal · %',
            type: 'number',
            min: 0,
            max: 100,
          },
          {
            key: 'muscleMass',
            label: 'Masa muscular · %',
            type: 'number',
            min: 0,
            max: 100,
          },
          {
            key: 'visceralFat',
            label: 'Grasa visceral',
            type: 'number',
            min: 0,
            max: 100,
          },
          {
            key: 'bodyWater',
            label: 'Agua corporal · %',
            type: 'number',
            min: 0,
            max: 100,
          },
          {
            key: 'waist',
            label: 'Cintura · cm',
            type: 'number',
            min: 0,
            max: 300,
          },
          {
            key: 'hip',
            label: 'Cadera · cm',
            type: 'number',
            min: 0,
            max: 300,
          },
          {
            key: 'tricepsFold',
            label: 'Pliegue tricipital · mm',
            type: 'number',
            min: 0,
            max: 100,
          },
          {
            key: 'bicepsFold',
            label: 'Pliegue bicipital · mm',
            type: 'number',
            min: 0,
            max: 100,
          },
          {
            key: 'subscapularFold',
            label: 'Pliegue subescapular · mm',
            type: 'number',
            min: 0,
            max: 100,
          },
          {
            key: 'suprailiacFold',
            label: 'Pliegue suprailíaco · mm',
            type: 'number',
            min: 0,
            max: 100,
          },
        ],
      },
      {
        title: 'Evaluación dietética',
        fields: [
          {
            key: 'recall24h',
            label: 'Recordatorio de 24 horas',
            type: 'textarea',
          },
          {
            key: 'foodFrequency',
            label: 'Frecuencia de consumo de alimentos',
            type: 'textarea',
          },
          {
            key: 'waterIntake',
            label: 'Ingesta de agua · L/día',
            type: 'number',
            min: 0,
            max: 20,
          },
          {
            key: 'intolerances',
            label: 'Tolerancias e intolerancias',
            type: 'textarea',
          },
          {
            key: 'adherence',
            label: 'Apego al plan anterior · %',
            type: 'number',
            min: 0,
            max: 100,
          },
        ],
      },
      {
        title: 'Requerimientos y distribución',
        fields: [
          {
            key: 'energyEquation',
            label: 'Ecuación energética',
            type: 'select',
            options: ['Mifflin-St Jeor', 'Harris-Benedict (revisada 1984)'],
          },
          {
            key: 'equationSex',
            label: 'Parámetro de sexo para la ecuación',
            type: 'select',
            options: ['Femenino', 'Masculino'],
          },
          {
            key: 'activityFactor',
            label: 'Factor de actividad física',
            type: 'number',
            min: 1,
            max: 3,
          },
          {
            key: 'targetCalories',
            label: 'Calorías objetivo · kcal/día',
            type: 'number',
            min: 0,
            max: 15000,
          },
          {
            key: 'proteinPercent',
            label: 'Proteínas · %',
            type: 'number',
            min: 0,
            max: 100,
          },
          {
            key: 'carbohydratePercent',
            label: 'Carbohidratos · %',
            type: 'number',
            min: 0,
            max: 100,
          },
          {
            key: 'fatPercent',
            label: 'Lípidos · %',
            type: 'number',
            min: 0,
            max: 100,
          },
        ],
      },
    ],
    widgets: ['nutrition'],
    extraFields: [],
  },
  PSI: {
    code: 'PSI',
    name: 'Psicología',
    folder: 'psychology',
    version: 1,
    optionalVitals: true,
    groups: [
      {
        title: 'Examen del estado mental',
        fields: [
          {
            key: 'appearance',
            label: 'Apariencia y actitud',
            type: 'textarea',
          },
          {
            key: 'mood',
            label: 'Estado de ánimo y afecto',
            type: 'textarea',
          },
          {
            key: 'language',
            label: 'Lenguaje',
            type: 'textarea',
          },
          {
            key: 'thoughtProcess',
            label: 'Curso del pensamiento',
            type: 'textarea',
          },
          {
            key: 'thoughtContent',
            label: 'Contenido del pensamiento',
            type: 'textarea',
          },
          {
            key: 'perception',
            label: 'Sensopercepción',
            type: 'textarea',
          },
          {
            key: 'memory',
            label: 'Memoria',
            type: 'textarea',
          },
          {
            key: 'orientation',
            label: 'Orientación',
            type: 'textarea',
          },
          {
            key: 'judgment',
            label: 'Juicio',
            type: 'textarea',
          },
        ],
      },
      {
        title: 'Evaluación de riesgo',
        fields: [
          {
            key: 'suicideRisk',
            label: 'Ideación suicida · riesgo',
            type: 'select',
            options: ['Nulo', 'Bajo', 'Moderado', 'Alto'],
          },
          {
            key: 'selfHarmRisk',
            label: 'Autolesiones · riesgo',
            type: 'select',
            options: ['Nulo', 'Bajo', 'Moderado', 'Alto'],
          },
          {
            key: 'thirdPartyRisk',
            label: 'Riesgo hacia terceros',
            type: 'select',
            options: ['Nulo', 'Bajo', 'Moderado', 'Alto'],
          },
          {
            key: 'riskAssessment',
            label: 'Evaluación y sustento clínico del riesgo',
            type: 'textarea',
          },
          {
            key: 'safetyPlan',
            label: 'Intervenciones, plan de seguridad y seguimiento',
            type: 'textarea',
          },
        ],
      },
    ],
    widgets: ['psychometrics', 'privateNotes'],
    extraFields: [
      {
        key: 'phq9',
        label: 'PHQ-9',
        type: 'scores',
        count: 9,
      },
      {
        key: 'gad7',
        label: 'GAD-7',
        type: 'scores',
        count: 7,
      },
    ],
  },
  FIS: {
    code: 'FIS',
    name: 'Terapia Física y Rehabilitación',
    folder: 'physiotherapy',
    version: 1,
    optionalVitals: false,
    groups: [
      {
        title: 'Dolor y fuerza muscular',
        fields: [
          {
            key: 'restPainEva',
            label: 'Dolor en reposo · EVA (0–10)',
            type: 'number',
            min: 0,
            max: 10,
          },
          {
            key: 'movementPainEva',
            label: 'Dolor en movimiento · EVA (0–10)',
            type: 'number',
            min: 0,
            max: 10,
          },
          {
            key: 'radiation',
            label: 'Diagrama descriptivo de irradiación',
            type: 'textarea',
          },
          {
            key: 'daniels',
            label: 'Escala de Daniels por grupo muscular',
            type: 'table',
            columns: [
              {
                key: 'muscleGroup',
                label: 'Grupo muscular',
                type: 'text',
              },
              {
                key: 'side',
                label: 'Lado',
                type: 'select',
                options: ['Derecho', 'Izquierdo', 'Bilateral'],
              },
              {
                key: 'score',
                label: 'Daniels (0–5)',
                type: 'select',
                options: ['0', '1', '2', '3', '4', '5'],
              },
            ],
          },
        ],
      },
      {
        title: 'Goniometría comparativa',
        fields: [
          {
            key: 'goniometry',
            label: 'Rangos articulares · grados',
            type: 'table',
            columns: [
              {
                key: 'joint',
                label: 'Articulación',
                type: 'text',
              },
              {
                key: 'movement',
                label: 'Movimiento',
                type: 'select',
                options: [
                  'Flexión',
                  'Extensión',
                  'Abducción',
                  'Aducción',
                  'Rotación interna',
                  'Rotación externa',
                  'Otro',
                ],
              },
              {
                key: 'side',
                label: 'Lado afectado',
                type: 'select',
                options: ['Derecho', 'Izquierdo', 'Bilateral'],
              },
              {
                key: 'healthy',
                label: 'Lado sano · °',
                type: 'number',
                min: 0,
                max: 360,
              },
              {
                key: 'initial',
                label: 'Inicial · °',
                type: 'number',
                min: 0,
                max: 360,
              },
              {
                key: 'current',
                label: 'Actual · °',
                type: 'number',
                min: 0,
                max: 360,
              },
            ],
          },
        ],
      },
      {
        title: 'Bitácora terapéutica',
        fields: [
          {
            key: 'modalities',
            label: 'Modalidades aplicadas',
            type: 'table',
            columns: [
              {
                key: 'modality',
                label: 'Modalidad',
                type: 'select',
                options: [
                  'Electroterapia/TENS',
                  'Ultrasonido',
                  'Termoterapia',
                  'Crioterapia',
                  'Láser',
                  'Terapia manual',
                  'Otra',
                ],
              },
              {
                key: 'zone',
                label: 'Zona',
                type: 'text',
              },
              {
                key: 'minutes',
                label: 'Duración · minutos',
                type: 'number',
                min: 0,
                max: 300,
              },
              {
                key: 'intensity',
                label: 'Intensidad y unidades',
                type: 'text',
              },
              {
                key: 'parameters',
                label: 'Parámetros',
                type: 'text',
              },
            ],
          },
          {
            key: 'homeExercises',
            label: 'Ejercicios terapéuticos para casa',
            type: 'textarea',
          },
          {
            key: 'functionalProgress',
            label: 'Evolución funcional',
            type: 'textarea',
          },
        ],
      },
    ],
    widgets: ['bodyMap'],
    extraFields: [
      {
        key: 'bodyMarks',
        label: 'Mapa anatómico',
        type: 'table',
        columns: [
          {
            key: 'view',
            label: 'Vista',
            type: 'select',
            options: ['Anterior', 'Posterior'],
          },
          {
            key: 'zone',
            label: 'Zona anatómica',
            type: 'text',
          },
          {
            key: 'kind',
            label: 'Hallazgo',
            type: 'select',
            options: ['Dolor', 'Fractura', 'Inflamación', 'Herida', 'Lesión', 'Irradiación'],
          },
          {
            key: 'x',
            label: 'Coordenada X',
            type: 'number',
            min: 0,
            max: 100,
          },
          {
            key: 'y',
            label: 'Coordenada Y',
            type: 'number',
            min: 0,
            max: 100,
          },
          {
            key: 'notes',
            label: 'Descripción',
            type: 'text',
          },
        ],
      },
    ],
  },
  OFTA: {
    code: 'OFTA',
    name: 'Oftalmología',
    folder: 'oftamologic',
    version: 1,
    optionalVitals: false,
    groups: [
      {
        title: 'Exploración oftalmológica',
        fields: [
          {
            key: 'acuityRight',
            label: 'Agudeza visual · OD',
            type: 'text',
          },
          {
            key: 'acuityLeft',
            label: 'Agudeza visual · OI',
            type: 'text',
          },
          {
            key: 'iopRight',
            label: 'Presión intraocular · OD (mmHg)',
            type: 'number',
            min: 0,
            max: 100,
          },
          {
            key: 'iopLeft',
            label: 'Presión intraocular · OI (mmHg)',
            type: 'number',
            min: 0,
            max: 100,
          },
          {
            key: 'anteriorSegment',
            label: 'Segmento anterior',
            type: 'textarea',
          },
          {
            key: 'fundus',
            label: 'Fondo de ojo',
            type: 'textarea',
          },
          {
            key: 'refraction',
            label: 'Refracción y corrección óptica',
            type: 'textarea',
          },
          {
            key: 'eyeMovement',
            label: 'Motilidad y alineación ocular',
            type: 'textarea',
          },
          {
            key: 'imaging',
            label: 'OCT, campimetría y estudios',
            type: 'textarea',
          },
          {
            key: 'procedures',
            label: 'Procedimientos realizados',
            type: 'textarea',
          },
          {
            key: 'followUp',
            label: 'Tratamiento ocular y seguimiento',
            type: 'textarea',
          },
        ],
      },
    ],
    widgets: [],
    extraFields: [],
  },
};
