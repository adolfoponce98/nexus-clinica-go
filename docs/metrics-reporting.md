# Métricas, reportes, costos y check-in

Base de datos: **Firestore `nexus-cliniq-dev`**. Las nuevas colecciones se crean cuando las funciones desplegadas escriben sus primeros documentos. La implementación local y las pruebas no crean ni modifican datos del proyecto Firebase.

## Estructura desnormalizada

Todas las rutas incluyen el médico propietario y el consultorio:

```text
metrics-patients/{idDoctor}/consultorios/{idConsultorio}
  patients/{idPaciente}                         # perfil y totales
    months/{YYYY-MM}                            # actividad mensual del paciente
    appointments/{appointmentId}                # referencias para vincular reservas provisionales
  months/{YYYY-MM}/patients/{idPaciente}         # lista mensual preparada para reportes
  identities/{hashNombreContacto}               # resolución directa del ID, sin where

metrics-appointments/{idDoctor}/consultorios/{idConsultorio}
  months/{YYYY-MM}                              # contadores del mes
    appointments/{appointmentId}                # citas listas para servir
  contributions/{appointmentId}                 # última contribución aplicada

metrics-offices/{idDoctor}/consultorios/{idConsultorio}
  months/{YYYY-MM}                              # pacientes únicos, citas, asistencias e ingresos
    patients/{idPaciente}                       # membresía del periodo para contar únicos
  weeks/{YYYY-MM-DD-del-lunes}                   # resumen semanal independiente
    patients/{idPaciente}
  patients/{idPaciente}                         # membresía acumulada del consultorio
  coverage/{YYYY-MM}                            # estado de preparación histórica

metrics-services/{idDoctor}/consultorios/{idConsultorio}
  services/{serviceId}                          # catálogo/motivo y totales
    months/{YYYY-MM}
  months/{YYYY-MM}/services/{serviceId}          # lista mensual preparada
```

Los reportes leen estas colecciones; no recorren pacientes, citas o expedientes operativos para reconstruir los resultados. La consulta de perfiles de métricas permite mostrar también pacientes registrados y servicios de catálogo con cero actividad en los meses seleccionados.

Una reserva sin ID de paciente usa un identificador provisional determinista de nombre y contacto. Cuando se registra el paciente, el índice de identidad y las referencias preparadas vinculan sus reservas al ID real, trasladando las contribuciones sin duplicar los totales. Seleccionar un paciente existente en Angular envía su ID real desde el principio.

Los motivos fuera del catálogo reciben un ID `custom_...`; conservan su descripción y sus métricas. No se les inventa un precio.

## Actualización e idempotencia

`metrics-core.js` concentra las escrituras de citas, su réplica de sincronización y las proyecciones. Cada transacción lee el documento actual y su última contribución antes de escribir. Aplica la diferencia a las cuatro familias de métricas y guarda la nueva contribución en el mismo commit.

Esto evita duplicar contadores por reintentos o entregas repetidas de eventos. Un cambio de paciente, motivo o estado retira la contribución anterior antes de aplicar la nueva. Los pacientes únicos se calculan con membresías por paciente, semana y mes; dos visitas de una persona cuentan como dos citas y un paciente único. Los únicos semanales no se suman para obtener únicos mensuales: cada periodo tiene su propio contador.

Se integraron las escrituras de creación/modificación de citas, confirmaciones de WhatsApp, registro de pacientes, actualización de consultorios y edición de servicios. Los servicios se reemplazan por ID dentro de su consultorio, evitando entradas duplicadas al editar su precio.

Los triggers de Firestore cubren también escrituras de otros clientes en los documentos operativos. Siempre vuelven a leer el documento actual dentro de una transacción, para que un evento retrasado no restaure un estado anterior. El registro de auditoría y los contadores anteriores del inicio se conservan.

## Estados y contadores

| Estado | Significado |
| --- | --- |
| 0 | Sin confirmar |
| 1 | Confirmada |
| 2 | Cancelada |
| 3 | Asistió |
| 4 | No asistió |

En `modifyOrDeleteAppointment`, **`actionType: 3` continúa significando eliminar**, por compatibilidad. Para registrar asistencia se usa `recordAppointmentVisit` con `operation: "attendance"` y `status: 3` o `4`.

Los resúmenes incluyen reservas, pendientes, confirmadas actuales, cancelaciones actuales, asistencias, ausencias, reservas que se confirmó/canceló al menos una vez, importes y consultas sin precio definido. `confirmedBookings` y `cancelledBookings` cuentan citas distintas, evitando contar repetidos reintentos de la misma decisión.

Los meses son `YYYY-MM` y las semanas completas van de lunes a domingo. Un reporte semanal puede incluir días de los meses adyacentes; la cobertura histórica comprueba esos meses también.

## Costos y dinero recibido

- `quotedCost`: precio de catálogo al reservar, si existe; no equivale a un pago.
- `finalCost`: costo final asignado por el usuario.
- `amountPaid`: **total pagado hasta ese momento**, separado del costo; no es un abono que deba sumarse cada vez.
- Los agregados monetarios usan enteros en centavos (`paidCents`, `chargeCents`); los valores mostrados y los formularios usan MXN.
- Los ingresos se obtienen de los pagos registrados, incluso si hay un pago previo a la asistencia. Una cancelación no supone automáticamente que se reembolsó un pago.
- Los importes se agrupan por **mes de la cita**. Esta vista es un reporte de consultas; no reconstruye flujo de caja por la fecha de cada abono.
- Se puede corregir el monto pagado y el motor aplica solo la diferencia. Las versiones de la cita impiden sobrescribir un pago desde un detalle desactualizado.
- No se elimina mediante la API una cita con pagos registrados. Los cambios quedan identificados en los movimientos de auditoría.
- Un costo final explícito de cero es una consulta gratuita; un costo desconocido permanece pendiente.

## Servicios HTTP nuevos

Los tres conservan el protocolo existente: POST, JWT de acceso, sesión activa, firma de aplicación y cuerpo/respuesta cifrados. El médico se obtiene del token, no de un ID arbitrario del cuerpo. Los empleados quedan limitados al consultorio firmado en su token; su alcance se conserva al renovar la sesión.

### getMetricsReport

Contenido descifrado:

```json
{
  "type": "patients",
  "startMonth": "2026-11",
  "endMonth": "2026-11",
  "idsConsultorios": ["consultorio-a"],
  "officePeriod": "month"
}
```

`type` admite `patients`, `appointments`, `office` y `services`. Para consultorios, `officePeriod` admite `month` y `week`. El arreglo permite uno o varios consultorios; un arreglo vacío solicita todos los consultorios presentes en `metrics-offices` del médico. Se admiten hasta 12 meses, 20 consultorios y 10,000 filas. Si se supera el límite de filas, se pide reducir el periodo; no se entrega una exportación recortada.

Devuelve `rows`, `totals`, `coverage`, `currency`, periodo, consultorios y fecha de generación. Los pacientes se ordenan alfabéticamente con comparación de nombres en español. Las citas se ordenan por fecha y hora.

### recordAppointmentVisit

Asistencia:

```json
{ "idConsultorio": "consultorio-a", "date": "2026-11-17", "time": "13:00", "operation": "attendance", "status": 3, "expectedStatus": 1 }
```

Costo y pago separados:

```json
{ "idConsultorio": "consultorio-a", "date": "2026-11-17", "time": "13:00", "operation": "billing", "finalCost": 600, "amountPaid": 400, "expectedVersion": 2 }
```

Devuelve la cita completa actualizada. Una decisión de asistencia desactualizada se rechaza, para no pisar la confirmación de otro usuario.

### rebuildMetrics

```json
{ "idConsultorio": "consultorio-a", "month": "2026-11", "after": null }
```

Prepara un consultorio y mes históricos, en lotes de hasta 50 perfiles o citas. El cliente repite la solicitud con el cursor opaco `next` hasta recibir `null`. Solo el médico propietario puede ejecutarlo. Se puede interrumpir y volver a comenzar: las contribuciones son idempotentes. No modifica las citas.

Se importa el estado que realmente existe en el origen. No es posible recuperar cambios de estado anteriores que el sistema nunca almacenó, ni reconstruir pagos desconocidos. No se usa el precio actual del catálogo para inventar el costo de una cita histórica. La cobertura marca meses importados, no certifica que hubiera un historial de transiciones previo a esta implementación.

## Angular

- Los cuatro botones de **Reportes rápidos** abren `/reportes/:type`.
- Se seleccionan meses y uno o varios consultorios. Los consultorios se pueden agrupar por semana o mes.
- La tabla pagina en pantalla; PDF y Excel incluyen todas las filas del resultado consultado.
- Excel es `.xlsx` real, con importes numéricos, teléfonos conservados como texto, cabecera fija y filtros. Los textos se exportan como texto, no como fórmulas.
- El PDF incluye título, filtros, fecha de generación, moneda, encabezados repetidos y paginación, con ajuste de textos largos.
- El detalle de cita del encabezado y del calendario incluye **Asignar costo**, costo final y monto pagado separado.
- Los diálogos de nueva cita aprovechan el ancho, con teléfono y correo en la misma fila. Se validaron ambos a 1280 × 720 sin scroll vertical exterior.

## Recordatorios de check-in

- Se consideran únicamente citas con estado 0 o 1 cuando llega su hora de inicio.
- Se muestran las más recientes primero. Permanecen pendientes tras terminar la cita y sobreviven a recargas en el mismo navegador, separadas por médico/consultorio.
- Suena una sola campanita por intervalo de diez minutos mientras el horario de la cita sigue vigente. Al llegar la hora de fin deja de sonar; el pendiente continúa visible.
- Se revisa el reloj cada 15 segundos y se consulta la agenda cada 60 segundos y al regresar a la ventana, para reflejar decisiones del médico o de recepción.
- **Sí asistió** guarda estado 3; **No asistió**, estado 4. El pendiente solo se retira tras el guardado correcto, o cuando la agenda ya refleja un estado terminal/cancelación.
- Si el navegador bloquea el audio, se ofrece **Activar sonido de recordatorios**. No se necesitan permisos de notificaciones del sistema para el panel local.
- Al activar la función no se generan recordatorios masivos de años anteriores: se parte del día actual y se conservan los pendientes que se hayan originado desde su uso.

## Despliegue y activación

Se añadieron y exportaron en `functions/src/index.js`:

- `getMetricsReport`
- `recordAppointmentVisit`
- `rebuildMetrics`
- `projectAppointmentMetrics`
- `projectOfficeMetrics`
- `projectPatientMetrics`

También deben desplegarse las funciones existentes modificadas:

- `saveAppointment`
- `modifyOrDeleteAppointment`
- `whatsappWebhook`
- `saveOrUpdateConsultorio`
- `registerNewPatient`
- `saveDoctorService`
- `newDoctorService`
- `refreshToken`
- `getAppointments` (actualización del trabajo anterior, necesaria para leer horarios sin documento padre).

Con el proyecto Firebase correcto seleccionado, desde la raíz del proyecto de funciones:

```shell
firebase deploy --only "functions:getMetricsReport,functions:recordAppointmentVisit,functions:rebuildMetrics,functions:projectAppointmentMetrics,functions:projectOfficeMetrics,functions:projectPatientMetrics,functions:saveAppointment,functions:modifyOrDeleteAppointment,functions:whatsappWebhook,functions:saveOrUpdateConsultorio,functions:registerNewPatient,functions:saveDoctorService,functions:newDoctorService,functions:refreshToken,functions:getAppointments"
```

Las URLs nuevas están centralizadas en `src/app/config/api-urls.ts` con los nombres exportados en minúsculas como prefijo del host. Se deben contrastar con las URLs que entregue el despliegue antes de publicar Angular.

Después de desplegar, consultar los reportes y usar **Preparar históricos del mes seleccionado** para cada mes/consultorio que deba importarse. Los meses pendientes se indican en la pantalla. Para reportes semanales, preparar también los meses adyacentes indicados.

**No se ha ejecutado el despliegue ni una preparación sobre Firestore real.**

## Comprobaciones realizadas

```shell
# Angular
npm test -- --watch=false
npm run build

# Desde functions
npm test
```

40 pruebas de Angular y 23 de backend. Las pruebas usan Firestore simulado y datos ficticios. Incluyen idempotencia, costos/pagos, cambios de estado, contadores de pacientes únicos, separación por consultorio, vinculación de pacientes, históricos sin precio, versiones de pago, persistencia de check-in, sonido por horario y Excel completo.

Se probó en navegador el flujo check-in → detalle/costo/pago → cuatro reportes → PDF/XLSX, usando el motor real de métricas con Firestore en memoria. Los archivos descargados se abrieron para verificar estructura, valores numéricos, teléfonos y contenido; el PDF se renderizó para revisar su presentación.
