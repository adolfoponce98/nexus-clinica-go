# Seguimientos por especialidad · versión 1

## Formularios y rutas

Las carpetas `general`, `gynecology`, `pediatrics`, `traumatologic`, `dermatology`, `dentist`, `nutrition`, `psychology`, `physiotherapy` y `oftamologic` contienen componentes y vistas de Nueva consulta. Los códigos son GEN, GINE, PED, TRAUM, DER, DENT, NUT, PSI, FIS y OFTA. Las nueve especialidades solicitadas se conservan junto con Oftalmología existente; Cardiología y Oncología permanecen en el catálogo y utilizan el formulario base si no tienen extensión específica.

`baseFollow` selecciona el componente desde la especialidad reconocida de Identidad y firma, con la especialidad de sesión como respaldo. Las especialidades del catálogo se sugieren también en ese formulario. `shared-followup` contiene el espacio de trabajo, formulario SOAP, controles comunes y renderizador de las extensiones. `baseFollowDetail` lee la especialidad guardada en la consulta, independientemente del perfil actual. Las secciones subjetivas, exploraciones y planes antiguos de Odontología/Traumatología siguen disponibles en la sección de registro anterior. Las notas históricas o cerradas no se editan. Un borrador puede abrirse con su mismo ID y revisión; la escritura exige que su autor coincida.

La base conserva motivo/evolución, resultados de estudios, signos vitales con IMC y saturación, CIE-10 con diagnóstico presuntivo/confirmado, indicaciones y pronósticos. Para la primera historia se recupera el borrador del expediente y se mantienen los campos iniciales y catálogos que ya exigía el cierre. Los signos vitales pueden omitirse con justificación en Psicología/Odontología; las especialidades médicas los requieren para firmar. Guardar un borrador permite completar la información por etapas.

Todas las especialidades conservan infografía 3D con los modelos existentes (ojos para OFTA, dentales para DENT y anatomía corporal para las demás), dictado de voz con pausa/continuación, texto manual, archivos, imágenes, videos y receta en PDF. Las recetas utilizan el editor y el almacenamiento firmado existentes. El archivo se sube antes del guardado de la consulta y luego se conserva su referencia con los demás adjuntos.

## Persistencia y compatibilidad

Se mantiene la ruta:

`follow-ups/{idDoctor}/consultorios/{idConsultorio}/patients/{idPatient}/expedientes/{expedienteId}/medical follow-ups/{followUpId}`

Dentro del contenido clínico cifrado se guardan `clinicalCore`, `specialtyCode`, `specialtySchemaVersion: 1` y `specialtyData`. Los esquemas están en `specialty-schemas.ts` (Angular) y `specialty-schemas-v1.js` (Node). La versión 1 se debe conservar al añadir nuevas versiones para que no cambie la interpretación de documentos anteriores.

`savePatientFollowUp` (archivo `newFollowUpPatient.js`) acepta la extensión y `persistFollowUp` valida el esquema, el expediente del paciente, el autor, la revisión esperada y el estado antes de escribir. El mismo requestId conserva la consulta y su consecutivo; cada guardado aceptado actualiza la revisión. Se rechazan campos desconocidos, versiones no soportadas, escalas/valores inválidos y piezas FDI fuera del catálogo de adultos/infantil. Los borradores pueden contener valores desconocidos o nulos; no se convierten automáticamente en normalidad.

`getPatientFollowUp` ya entrega el documento descifrado completo, por lo que entrega también la extensión. No necesita búsquedas por cada especialidad. El mecanismo existente de `sync-core` continúa actualizando las versiones de pacientes/seguimientos y sus notificaciones desde la misma transacción. No se añaden consultas where ni colecciones por especialidad. El formulario de detalle, revisión de cierre y exportación de nota incluyen los campos específicos. Las recetas continúan teniendo su propio snapshot independiente.

## Dictado e IA

`generateMedicalSummary` ahora recibe y devuelve el mismo sobre cifrado de los demás servicios, mediante ClinicApiService, con Bearer y firma de aplicación. Requiere el permiso de IA. Se despliega con los secretos existentes APP_ENCRYPTION_KEY, APP_SECRET_HEADER, JWT_SECRET y GEMINI_API_KEY. Los clientes que todavía envíen `{texto}` sin el sobre cifrado deben actualizarse al nuevo contrato.

El prompt y el JSON Schema cambian según la especialidad e incluyen los nombres, tipos y opciones de sus campos. La IA propone `summaryText`, `clinicalCore` y `specialtyData`. No se usan respuestas clínicas de relleno cuando el modelo falla. Una respuesta inválida produce un error y no modifica el formulario. Los valores ausentes permanecen sin registrar. Las escalas, percentiles y estimaciones se calculan en la aplicación, no se inventan por IA.

El profesional revisa la propuesta y la aplica. Por defecto se completan campos vacíos; para reemplazar información existente debe seleccionar esa opción. La transcripción de voz es independiente de los apuntes privados. No se envía el campo de notas privadas a la IA. La interpretación del modelo no constituye validación clínica ni firma de la nota.

## Psicología y privacidad

El campo `privatePsychotherapyNotes` del request de guardado se cifra por separado en:

`{rutaDeConsulta}/psychotherapy-private/{autorCodificado}`

No se guarda dentro de `clinicalCore`, `specialtyData`, el resumen del paciente ni el documento clínico exportable. La nueva Cloud Function `getPrivatePsychotherapyNotes` verifica el consultorio y el autor exacto de la nota, exige permisos clínicos y registra su lectura. La cuenta del doctor principal no recibe automáticamente notas privadas escritas por otro terapeuta. Este endpoint no participa en la caché compartida. La interfaz conserva sus datos solo en memoria y los limpia al cerrar/cambiar de consulta. Si falla la carga privada, guardar la nota oficial no sobrescribe los apuntes privados con una cadena vacía.

PHQ-9 y GAD-7 registran respuestas 0–3 y solo muestran total con todos los reactivos contestados. Los títulos breves de los campos son referencias para registrar respuestas del cuestionario oficial completo, disponible en [PHQ Screeners](https://www.phqscreeners.com/). No se presentan como una versión abreviada validada. Las respuestas y el puntaje no determinan por sí solos un diagnóstico ni el nivel de riesgo. Un indicador de riesgo moderado/alto o el reactivo 9 del PHQ-9 positivo muestra una alerta y requiere evaluación/intervenciones/plan documentados para cerrar la nota.

## Cálculos y fuentes

- OMS: tablas LMS oficiales diarias 0–60 meses completos, y referencia mensual de talla/IMC 5–19 años y peso 5–10 años. Están en `src/assets/clinical/who`; `sources.json` identifica las descargas y su SHA-256. No se extrapola peso/edad después de 10 años ni talla/IMC fuera de la referencia. Se requiere posición de medición para ajustar longitud/talla 0.7 cm cuando corresponda; con edema bilateral en pies no se calculan peso/edad ni IMC/edad. Se muestra Z y percentil, con curvas de referencia y el punto de la medición.
- FUM: semanas/días y fecha probable de parto a 280 días, sin sustituir la datación clínica/ultrasonográfica.
- Nutrición: Mifflin–St Jeor o Harris–Benedict revisada 1984 para adultos, factor de actividad ingresado por el profesional, cintura/cadera y gramos de macronutrientes a partir de las calorías objetivo y porcentajes capturados. No se asigna dieta/calorías automáticamente.
- Los cálculos de fecha usan el día clínico de America/Mexico_City. Las tablas/calculadoras complementan la revisión profesional; no certifican cumplimiento normativo ni validan la exactitud clínica de una transcripción.

Fuentes primarias:

- [OMS: peso/edad](https://www.who.int/tools/child-growth-standards/standards/weight-for-age).
- [OMS: longitud/talla](https://www.who.int/tools/child-growth-standards/standards/length-height-for-age).
- [OMS: IMC/edad](https://www.who.int/toolkits/child-growth-standards/standards/body-mass-index-for-age-bmi-for-age).
- [OMS: referencia 5–19 años](https://www.who.int/tools/growth-reference-data-for-5to19-years/indicators).
- [Mifflin et al., 1990](https://pubmed.ncbi.nlm.nih.gov/2305711/).
- [Roza y Shizgal, 1984](https://pubmed.ncbi.nlm.nih.gov/6741850/).
- [Google: salida estructurada](https://ai.google.dev/gemini-api/docs/structured-output).

## Despliegue

Desde `C:/Users/Adolfo/Documents/google_functions/nexus-clinq-go-functions`:

```powershell
firebase deploy --only "functions:savePatientFollowUp,functions:generateMedicalSummary,functions:finalizeClinicalNote,functions:getPrivatePsychotherapyNotes" --project clinq-go
```

La función nueva se exporta en `functions/src/index.js`. Las URLs se mantienen centralizadas con el sufijo `-o7vmreizjq-uc.a.run.app`. Después se publica Angular con su proceso habitual. No se desplegaron servicios remotos ni se usaron expedientes reales durante esta implementación.

La compilación mantiene el presupuesto CSS de 10 kB; se compactó el CSS del espacio de trabajo en vez de aumentar el límite. Las pruebas locales cubren las diez extensiones, cifrado/autor de notas privadas, aislamiento por consultorio, revisión concurrente, dictado, cálculos y preservación de datos capturados. Chrome con servicios simulados comprueba la carga, autollenado revisable, guardado y detalle por especialidad, así como adjuntos/receta y resolución de laptop. No se llamó a Gemini con datos de pacientes durante las pruebas.

Resultado final de validación local: 175 pruebas Angular y 137 Node aprobadas; compilación de producción correcta (CSS del espacio de trabajo 9.90 kB, límite 10 kB). Chrome comprobó las diez especialidades sin errores JavaScript, guardado con conservación de datos, dos archivos/receta cargados en la misma consulta y ausencia de desbordamiento a 1280 × 720.
