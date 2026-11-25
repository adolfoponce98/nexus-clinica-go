# Empleados, permisos y consultas

## Accesos

- Índice del doctor: `usersEmployes/{idDoctor}/employees/{emailNormalizado}`.
- Réplicas de acceso por consultorio: `usersEmployes/{idDoctor}/consultorios/{idConsultorio}/employes/{emailNormalizado}`.
- `consultorioCodes/{codigo}` determina el doctor y consultorio del login. Se conserva lectura del nombre antiguo `consultoriosCodes` como compatibilidad.
- La primera consulta de empleados migra las réplicas existentes al índice del doctor. No usa `where` y conserva la unión de consultorios asignados.
- La contraseña inicial visible es `ClinicaGo202#`; el servidor guarda exclusivamente un hash Argon2id.
- La cuenta del propietario tiene acceso a sus datos; el empleado obtiene sus permisos y consultorios desde su registro actual en Firestore, no desde los parámetros del cliente.

## Permisos

El catálogo compartido conceptualmente entre Angular y Node contiene inicio, calendario, pacientes, expedientes, seguimientos, recetas, consultorios, servicios, planes, finanzas, reportes, empleados, configuración, dispositivos, IA, usuarios del sistema y personal.

Cada módulo usa `read`, `write` y `delete`. La lectura debe concederse explícitamente; sin ella se oculta el menú y se deniega también escritura o eliminación, aunque sus casillas estén marcadas. Dispositivos conectados dispone de acceso lateral independiente de Configuración. Un permiso nuevo ausente se interpreta como denegado para empleados. Revisar y guardar los empleados existentes para conceder los módulos recién añadidos que necesiten.

Angular protege rutas y navegación y deshabilita controles de edición, conservando la búsqueda y los filtros. Las funciones clínicas verifican los permisos y el consultorio antes de leer o modificar datos. La lista de pacientes de un empleado sin lectura de expedientes omite las notas clínicas completas.

Un empleado con administración de empleados tampoco puede conceder permisos que no posee, asignar consultorios ajenos o administrar empleados con acceso fuera de su propio conjunto de consultorios. Los nuevos consultorios los crea el propietario; empleados autorizados pueden actualizar los consultorios que ya tienen asignados.

## Deshabilitar y eliminar

`deleteEmploye` (también exportada como `setEmployeeStatus`) recibe `email` o `id` y `action`:

- `disable` (predeterminada): conserva el empleado con `active:false` y `status:0`.
- `reactivate`: vuelve a habilitar su acceso.
- `permanent`: elimina el índice y sus réplicas de acceso. Conserva expedientes, pacientes y datos de auditoría relacionados.

Deshabilitar, eliminar o cambiar permisos, contraseña, rol o consultorios incrementa `accessVersion` y revoca los dispositivos de ese empleado para el doctor. La verificación de acceso y renovación consulta el registro vigente. El siguiente uso de un token revocado falla aunque no llegue la push.

## Dispositivos y aviso al propietario

El login de empleados crea en la misma transacción de la sesión un evento `employee-login` con `audience:owner`. El trabajador de push toma exclusivamente los tokens de la cuenta del doctor para ese evento.

El panel del doctor reúne sus propios dispositivos y los de empleados mediante el índice por consultorio. Muestra nombre, correo, teléfono, información del dispositivo y actividad reciente. No devuelve tokens FCM ni identificadores internos de sesión.

El navegador visible actualiza actividad cada 45 segundos. “En línea” significa actividad dentro de los últimos 150 segundos; no es una conexión permanente. El panel consulta cambios cada 45 segundos mientras está visible y al recibir el aviso de empleado conectado. El propietario puede cerrar sesiones de empleados; un empleado autorizado solo puede cerrar dispositivos de su propia cuenta. Sigue vigente el máximo de tres dispositivos por cuenta.

## Pacientes

Según la opción elegida, las consultas se cuentan por seguimientos clínicos únicos, no por citas con estatus 3. El resumen del paciente contiene `consultationCount`, `lastConsultationDate` y `lastConsultationReason`, y mantiene los campos antiguos de conteo y última visita para compatibilidad.

Guardar de nuevo un mismo seguimiento reemplaza su resumen y conserva su fecha original. La transacción actualiza el documento del paciente, la copia del consultorio y las versiones de sincronización. Para documentos antiguos, el listado deriva el resumen del arreglo `follow-ups` ya incluido en el paciente, sin consultar cada subcolección.

Sin seguimientos se muestra “Primera vez”. La lista elimina categorías de especialidad, permite filtrar por última consulta y ordenar por motivo, fecha, nombre o cantidad; teléfonos y correos vacíos o `-` se muestran como faltantes. La caché de pacientes usa una versión nueva para descartar las fechas y conteos ficticios anteriores.

## Validación y despliegue

Pruebas locales: `npm test` en `functions`; `npm test -- --watch=false` y `npm run build` en Angular. Las pruebas de backend usan una base en memoria, no Firestore de producción.

Publicar primero las funciones desde el proyecto real `C:\Users\Adolfo\Documents\google_functions\nexus-clinq-go-functions` con `firebase deploy --only functions`, y después Angular con su procedimiento habitual. La exportación nueva `setEmployeeStatus` ya está incluida en `functions/src/index.js`; Angular conserva la URL de `deleteEmploye`. Las funciones de IA ahora requieren `JWT_SECRET`, además de sus secretos anteriores. Este trabajo no realiza el despliegue.

Validar con dos navegadores y cuentas de prueba: login de empleado mediante código de consultorio, aviso exclusivo al propietario, permisos de lectura, deshabilitación, reactivación y cierre remoto. Las pushes reales dependen de permisos del navegador, un token FCM válido y el despliegue del trabajador existente `deliverOfficeUpdates`.


## Carga y preferencia de consultorio

Las vistas Consultorios y Configuración / Consultorios consultan `getDoctorsOffice` mediante POST con cuerpo cifrado. Los errores de carga se muestran con una acción para reintentar.

Al iniciar sesión una empleada se selecciona su primer consultorio asignado cuando todavía no tiene preferencia. Al cambiar de consultorio se guarda solo su identificador como preferencia local, separada por correo de la empleada y doctor. Se conserva al recargar o cerrar sesión en el mismo navegador. Al recibir la lista autorizada se actualizan los datos completos del consultorio seleccionado; si ya no tiene acceso, se elige el primer consultorio disponible. Esta preferencia no concede permisos y no sustituye la validación del servidor.


## Lectura de datos en sesiones de empleados

Antes de activar una vista autorizada se resuelve la lista real de consultorios y su selección vigente. Pacientes y calendario esperan un identificador real y se vuelven a cargar al cambiar de consultorio. Las respuestas tardías de otro consultorio o sesión se descartan y los errores de consulta se muestran con una opción para reintentar.

La sincronización de pacientes, citas y notificaciones funciona aunque falle el registro de presencia del dispositivo o el navegador no admita notificaciones push. La carga respeta `read` y no exige `write`. Las notificaciones consultan el `idDoctor` propietario, mientras su estado local de lectura continúa separado por cuenta de empleado. Servicios actualiza su listado al cambiar el consultorio o recibir sus datos actualizados.

La prueba `functions/test/employee-read-api.test.js` comprueba los endpoints cifrados reales contra una base en memoria: lectura de pacientes y citas del propietario desde un segundo consultorio asignado, rechazo de un consultorio ajeno y rechazo de escritura para una sesión de solo lectura.
