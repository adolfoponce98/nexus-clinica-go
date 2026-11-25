# Sincronización por versiones y dispositivos conectados

Cambios locales en `D:\GitHub\nexus-admin-nexo-salud` y `C:\Users\Adolfo\Documents\google_functions\nexus-clinq-go-functions`. Este trabajo cubre Angular y Cloud Functions. No se modificó Android ni se enviaron notificaciones productivas durante las pruebas.

## Consultas

Las consultas reciben `clientLastUpdate` dentro del request cifrado. El cliente guarda exclusivamente `lastUpdated` devuelto por el servidor junto con la copia completa de esa consulta. No genera fechas con el reloj del equipo.

```json
{"idConsultorio":"office-a","clientLastUpdate":"2026-11-18T18:00:00.001Z"}
```

Cuando la copia está vigente (fecha igual o mayor), la respuesta cifrada contiene:

```json
{"success":true,"notModified":true,"lastUpdated":"2026-11-18T18:00:00.001Z","version":1795024800001}
```

No se consulta la colección de datos ni se devuelve su lista en ese caso. Sí se mantienen las lecturas necesarias para autenticar/revisar la sesión y leer el documento pequeño de versión. En consultas de un solo seguimiento, esto ahorra transferencia de contenido; el ahorro de lecturas se concentra en las listas de múltiples documentos.

Las versiones `syncVersion` y `lastUpdated` se guardan en los documentos padre de los datos:

| Recurso | Documento con versión |
|---|---|
| Pacientes y detalle de paciente | `patients/{idDoctor}/consultorios/{idConsultorio}` |
| Citas e historial por rango | `appointments/{idDoctor}/doctorsOffice/{idConsultorio}` |
| Consultorios | `doctorsOffice/{idDoctor}` |
| Notificaciones | `notifications/{idDoctor}/consultorios/{idConsultorio}` |
| Seguimientos | `follow-ups/{idDoctor}/consultorios/{idConsultorio}` |

Las primeras consultas inicializan la versión para colecciones antiguas que todavía no la tengan. Las escrituras principales actualizan datos, versión y evento de salida en una transacción. Los triggers cubren escrituras realizadas por otros servicios/administración. Esa cobertura por trigger es eventual: la push llega después de que el evento actualiza la versión.

Funciones de lectura adaptadas: `getPatients`, `getPatientExpedient`, `getPatientFollowUp`, `getDoctorsOffice`, `getNotifications`, `getAppointments` y `syncFollowingAppointments`.

`centerNotifications` envía WhatsApp/correo, por lo que es un comando y no se cachea ni se suprime por fecha. Ahora exige sesión JWT válida. Consultar `getNotifications` ya no mueve ni elimina notificaciones para que todos los dispositivos puedan obtenerlas. También conserva acceso a las notificaciones antiguas del historial; leído/no leído continúa siendo local.

`syncFollowingAppointments` devuelve una copia de reemplazo cuando cambia la versión. Así se reflejan modificaciones y eliminaciones, que no quedaban cubiertas por el antiguo filtro `startAfter(syncId)`.

En Angular, `sync-cache.ts` integra el protocolo tanto con fetch como con HttpClient y reconstruye la respuesta desde la copia local cuando llega `notModified`. Las claves aíslan cuenta, doctor, consultorio, paciente y filtros/rangos de fechas. Si la copia no pudo guardarse por falta de espacio, no se guarda una fecha independiente que pudiera ocultar datos. El logout limpia las cachés de consulta y visualización. Las lecturas y actualizaciones locales del estado de notificaciones mantienen su comportamiento previo.

## Dispositivos

Cada navegador genera un UUID persistente. Un perfil de navegador por origen cuenta como un dispositivo: otro navegador, modo incógnito o un dominio diferente puede ocupar otra plaza. Se capturan nombre descriptivo, plataforma, sistema y navegador. Marca/modelo se muestran como no disponibles cuando el navegador no permite conocerlos; no se inventan datos de hardware.

El payload cifrado de login incluye:

```json
{"email":"doctor@example.com","password":"...","device":{"id":"UUID-del-dispositivo","name":"Chrome en Windows","os":"Windows","browser":"Chrome","platform":"web","model":"Win32","brand":"No disponible","tokenFirebase":"token-FCM-si-existe"}}
```

El registro inicial de cuenta también envía esos metadatos; se conservan como `registrationDevice`. Como el registro no crea una sesión, el dispositivo se considera conectado y consume plaza al iniciar sesión.

La cuenta puede tener hasta **3 sesiones de dispositivos**, entre todos sus consultorios y plataformas. El límite se comprueba dentro de la misma transacción de creación de sesión, incluso ante logins simultáneos. Un cuarto dispositivo recibe HTTP 409 cifrado, código `DEVICE_LIMIT_REACHED`, con el mensaje para cerrar una sesión existente. Volver a entrar desde el mismo UUID reemplaza su sesión anterior sin ocupar otra plaza.

Colecciones internas:

```text
connected-devices/{sha256(email)}
  email
  devices: { deviceId: {sessionId, idDoctor, offices[], expiresAt, tokenFirebase, name, os, browser, model, brand, ...} }

devices-in-offices/{idDoctor}/consultorios/{idConsultorio}/devices/{sha256(email)}
  userId
  devices: { deviceId: {tokenFirebase, sessionId, expiresAt, ...} }

office-push-outbox/{eventId}
  type, idDoctor, idConsultorio, version, title, body, deliveredAt, deleteAfter
```

La ruta usa una colección intermedia `consultorios` para respetar la alternancia colección/documento de Firestore. El documento de usuario contiene hasta tres dispositivos; agregar uno no sustituye los tokens de los demás. La cuenta global evita saltarse el límite eligiendo otro consultorio.

Los doctores se vinculan a sus consultorios existentes y los empleados solamente al doctor/consultorio firmados en su sesión. El endpoint de registro posterior valida ese alcance; no confía en el doctor que pudiera enviar el cliente.

Si el navegador no autoriza notificaciones, se registra la sesión sin token FCM y sigue ocupando una plaza. Al habilitar push se actualiza la misma entrada. Los tokens FCM inválidos se limpian sin liberar una sesión que sigue activa.

## Push y actualización del portal

Los eventos no contienen nombres, teléfonos, diagnósticos ni otros datos de pacientes. Incluyen tipo, alcance y versión. Los mensajes de creación son “Nuevos pacientes agregados”, “Nueva cita agregada” y “Nuevo consultorio agregado”.

`deliverOfficeUpdates` consume la cola persistida y consulta el índice del consultorio para enviar a todos sus dispositivos activos, en lotes de hasta 500 tokens. El identificador de evento permite deduplicar recepciones; como FCM/eventos tienen entrega al menos una vez, no se promete exactamente una entrega física. La cola reintenta fallos temporales.

`office-sync.service.ts` es el coordinador de Angular. Al recibir una push, actualiza solo el recurso y consultorio correspondientes, conserva el aislamiento de cachés y notifica a los componentes. Pacientes y calendario reflejan los cambios mediante señales/observables. El aviso local dura **10 segundos** y el temporizador de un aviso anterior no cierra uno más reciente. El service worker entrega los eventos de segundo plano a las ventanas abiertas.

Las push dependen del permiso, conexión y soporte del navegador. Al recuperar el foco se reconcilian las versiones. El portal también valida la sesión cada 45 segundos mientras está visible; los permisos del servidor se revocan inmediatamente aunque no llegue una push.

## Cierre de sesión y panel

Se amplió `logoutSession`, que ya existía, para recibir el payload cifrado con `idDoctor`, `idConsultorio` y `deviceId`, además de la cookie web. Valida la identidad firmada; no acepta cerrar otro dispositivo mediante datos manipulados. Devuelve respuesta cifrada.

El cierre local o remoto quita la entrada de los índices, libera la plaza y revoca la familia de sesión. Se borran los documentos de sus tokens de acceso/refresh actuales; los tokens anteriores quedan inutilizables por la revocación de la familia y se eliminan conforme a su expiración/TTL.

Configuración → **Dispositivos conectados** muestra exclusivamente los dispositivos de la propia cuenta, sin exponer tokens FCM ni tokens de sesión. Permite cerrar cualquiera de ellos, incluido el actual, con confirmación. El dispositivo remoto recibe `session-revoked` y sale; si no recibe FCM, sale al comprobar su sesión o realizar una petición. Los eventos atrasados de una sesión anterior no cierran una sesión nueva del mismo navegador.

Funciones HTTP nuevas:

- `getConnectedDevices`
- `revokeConnectedDevice`
- `registerOfficeDevice`
- `checkDeviceSession`

Triggers nuevos:

- `deliverOfficeUpdates`
- `notifyPatientUpdates`
- `notifyAppointmentUpdates`
- `notifyOfficeUpdates`
- `notifyNotificationUpdates`
- `notifyFollowUpUpdates`

Todos están exportados en `functions/src/index.js`. Las URLs HTTP nuevas en Angular usan `-o7vmreizjq-uc.a.run.app`. `updateFCMToken` se conserva como entrada compatible con el registro por dispositivo, y ya no sustituye un token global del usuario.

## Despliegue y migración

Publica Functions desde su carpeta:

```powershell
firebase deploy --only functions --project clinq-go
```

Después publica Angular desde su carpeta:

```powershell
npm run build
firebase deploy --only hosting --project clinq-go
```

Los JWT anteriores sin identificador de dispositivo se rechazan: los usuarios deberán iniciar sesión de nuevo. Publica ambos proyectos en la misma ventana. Para localhost se mantiene el proxy a las funciones de Cloud Run; reinicia `ng serve` al cambiar configuración.

Como se solicitó, no se adaptó la app móvil en este trabajo. Cualquier cliente móvil que posteriormente use estos logins tendrá que enviar `device` y actualizar su registro FCM; no basta con desplegar las funciones para que una app sin Firebase Messaging empiece a recibir push.

No se modificaron reglas ni IAM productivos. Verifica que clientes sin Admin SDK no puedan acceder a `connected-devices`, `devices-in-offices`, `office-push-outbox`, `auth_sessions` ni `session_tokens`, ni manipular las versiones de los documentos padre. Los endpoints del portal usan sus JWT propios; las funciones usan Admin SDK. Una regla permisiva más amplia no queda anulada por otra que diga `if false`.

La cola incluye `deleteAfter`, compatible con TTL. Conviene habilitar esa política en el grupo `office-push-outbox`; su eliminación automática no sustituye las comprobaciones de entrega o sesión.

Las pruebas usan bases simuladas y capturan los envíos FCM sin enviar mensajes reales. Para la aceptación productiva, prueba dos navegadores y dos cuentas del mismo consultorio, una tercera sesión de la misma cuenta y el rechazo de la cuarta; después verifica una alta de paciente/cita y un cierre remoto.


## Correcciones de agendamiento y push propias

- Las citas canceladas (`status: 2`) no bloquean horarios en los diálogos del calendario ni en Nueva cita.
- El motivo es obligatorio en ambos clientes y al crear la cita en el servidor. El switch “No lo sé aún” asigna “Sin definir” y quita la selección de servicio para no inferir un precio incorrecto.
- Una reserva nueva que reutiliza exactamente un inicio cancelado tiene su propia identidad y no hereda costo, pago ni datos del paciente anterior. Se conserva el registro cancelado en `appointment-history/{idDoctor}/consultorios/{idConsultorio}/appointments/{appointmentId}`, junto con sus métricas y réplica históricas. Esa colección también debe quedar protegida contra acceso directo de clientes.
- Las operaciones sobre una tarjeta anterior verifican su identidad para evitar modificar la cita que ahora ocupa ese horario.
- La push de citas incluye `originDeviceId` tomado de la sesión firmada. El mismo dispositivo no muestra el aviso ni descarga de nuevo la agenda por esa push, porque ya incorporó la respuesta del guardado. Otros dispositivos, incluso de la misma cuenta, sí se actualizan.
- La caché unifica la copia local y la del servidor por identidad canónica y alias, sin mezclar la cita cancelada con otra reserva nueva del mismo horario.
- Estos cambios requieren desplegar nuevamente Functions y Angular. No hay funciones HTTP nuevas para esta corrección; se modifican las existentes y el trigger de métricas.
