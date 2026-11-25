# Autogestión de registro de pacientes

Implementación local del 20 de noviembre de 2026. No se desplegaron servicios, Hosting ni reglas ni se registraron pacientes reales durante las pruebas.

## Uso del doctor

En Pacientes, Enlace de registro abre primero un diálogo explicativo con el consultorio elegido, vigencia y condición de un solo uso. Abrir o cancelar no llama al servicio ni inicia el plazo. Generar enlace y QR crea la invitación. Después se puede copiar/compartir el enlace o guardar el QR como PNG. Generar para otro paciente vuelve a pedir confirmación.

El diálogo usa HTMLDialogElement.showModal y la capa superior del navegador: su fondo cubre el viewport aunque la tarjeta del directorio tenga backdrop-filter. Incluye cierre con Escape, botón y fondo; conserva colores, iconos Lucide y estilo del sistema.

El enlace es `ORIGEN/autogestion/TOKEN`. Se utiliza el origen actual validado; en producción debe generarse desde clinica-go.com o los dominios Firebase autorizados. Un enlace localhost solo sirve en ese entorno de pruebas y no es accesible desde el teléfono de otra persona. No se envían mensajes automáticamente: el doctor elige cómo compartirlo.

## Página del paciente

La ruta autogestion/:token es pública y separada del MainLayout, sin login, sidebar ni servicios de sesión. Su transporte omite cookies y Authorization. El formulario presenta:

- Nombre del doctor, consultorio e imagen/logo si existe una URL HTTPS guardada en el perfil.
- Datos personales y domicilio con los campos del formulario interno.
- Antecedentes heredofamiliares, patológicos y no patológicos; mismas opciones del formulario interno, detalles de parentesco/alergias/tratamientos y hábitos.
- Aviso de privacidad enlazado a la URL indicada por el usuario; aceptación obligatoria, preferencia independiente para fines secundarios y firma del paciente.
- Botón Firmar que abre un pad. El envío requiere datos obligatorios, aceptación y firma. La firma se valida en servidor como PNG con trazos, no como una imagen vacía.

El plazo se calcula respecto al reloj del servidor y se vuelve a comprobar al guardar. El paciente ve mensajes específicos de enlace vencido o ya utilizado. El éxito limpia los datos del formulario. No hay caché persistente del formulario ni de la firma en el navegador.

## Autorización de un solo uso

createPatientRegistrationLink exige la sesión normal y permiso patients:write para el consultorio. Crea un nonce aleatorio de 256 bits y una prueba HMAC con separación de propósito usando JWT_SECRET. La URL no contiene un JWT de sesión ni IDs del doctor o consultorio. Se guarda el hash de la invitación y su autorización limitada en Firestore.

getPatientRegistrationLink y submitPatientRegistration son endpoints públicos específicos. Validan la prueba de la invitación, el registro de autorización, estado y expiración. El cliente no decide doctor, consultorio ni ID del paciente. El token no permite consultar expedientes existentes ni obtener una sesión del doctor.

El guardado utiliza registerPatientData, extraído de registerNewPatient, para conservar folios diarios, identificación, antecedentes, réplicas del consultorio, conteos, métricas, auditoría y notificación/sincronización de pacientes. registerNewPatient continúa requiriendo Bearer y las validaciones internas anteriores; no se abrió al acceso anónimo.

La misma transacción que crea el paciente asigna el folio y marca la invitación USED. Dos envíos concurrentes solo pueden crear un paciente. Una validación fallida no consume el enlace. Si la respuesta se pierde después de confirmar, el siguiente intento muestra utilizado y no crea otro expediente.

Los antecedentes y el consentimiento con firma, fecha de servidor, preferencia de fines secundarios, versión/URL del aviso, hash de firma y evidencia IP/UA se guardan en el perfil clínico cifrado con CLINICAL_DATA_KEY. Los datos generales contienen únicamente identificación/contacto; los logs no copian el cuerpo clínico. La procedencia se marca patient-self-registration y no se presenta la captura del paciente como nota médica firmada por el doctor. El profesional debe revisarla al integrar su historia clínica.

El aviso usa exactamente la dirección proporcionada por el usuario. Se conserva URL/versión de referencia y aceptación; no se descargó ni se validó jurídicamente el texto del sitio externo ni se archivó su contenido. La firma es digitalizada, no una firma avanzada certificada. Verificar que el aviso corresponda al responsable y fines de la clínica antes de uso productivo.

## Datos y métricas

- `patient-registration-links/{hash}`: autorización, ámbito, creación, vencimiento, estado y referencia del paciente tras uso. No almacena el token original. No tiene TTL de borrado.
- `patient-registration/{idDoctor}/consultorios/{idConsultorio}/links/{hash}`: índice interno de estado y fechas.
- `patient-registration/{idDoctor}/consultorios/{idConsultorio}/metrics/{AAAA-MM}`: contadores created, used y expiredObserved.

El estado pasa de ACTIVE a USED al guardar. Un enlace vencido se rechaza siempre por expiresAt; al consultarlo vencido se marca EXPIRED y se incrementa expiredObserved una sola vez. Ese contador significa expiraciones observadas, no un barrido automático de todas las invitaciones sin visitar. Las invitaciones vencidas o utilizadas se conservan como pidió el usuario. No se eliminaron datos reales.

## Despliegue pendiente

Nuevas funciones exportadas en functions/src/index.js:

- createPatientRegistrationLink (autenticada).
- getPatientRegistrationLink (pública con invitación válida).
- submitPatientRegistration (pública, firma y uso único).

También cambió registerNewPatient para usar el guardado compartido. Las URLs están centralizadas en Angular con sufijo -o7vmreizjq-uc.a.run.app; confirmar las URLs reales al desplegar.

Desde C:/Users/Adolfo/Documents/google_functions/nexus-clinq-go-functions:

```powershell
firebase deploy --only functions --project clinq-go
```

Se usan los secretos existentes JWT_SECRET, APP_ENCRYPTION_KEY y APP_SECRET_HEADER; el guardado clínico requiere CLINICAL_DATA_KEY. No se introdujo otra clave para configurar. Rotar JWT_SECRET invalida invitaciones pendientes emitidas con su valor anterior.

Desde D:/GitHub/nexus-admin-nexo-salud:

```powershell
node node_modules/@angular/cli/bin/ng.js build
firebase deploy --only hosting --project clinq-go
```

Hosting conserva la reescritura al index de Angular y agrega para autogestion/** no-store, noindex, Referrer-Policy:no-referrer y protección frente a incrustación en frames. Proteger las colecciones con las reglas/IAM del proyecto; no deben ser legibles/escribibles directamente por clientes. El archivo de reglas deny-all preparado previamente no se desplegó de forma automática ni se sustituyeron permisos de otros clientes.

Orígenes permitidos: https://clinica-go.com, https://clinq-go.web.app, https://clinq-go.firebaseapp.com y http://localhost:4200. No se admiten dominios arbitrarios para construir invitaciones ni para el transporte web público.

## Validación

- 141 pruebas Angular aprobadas y compilación de producción correcta.
- 109 pruebas Node.js aprobadas, incluyendo expiración, firma vacía, consentimiento obligatorio, concurrencia y persistencia compartida del registro interno.
- Chrome aislado, servicios interceptados y datos ficticios: formulario público a 390 px sin sesión, sidebar, Bearer, cookies, errores JS o desbordamiento; firma dibujada; éxito y mensajes de utilizado/expirado.
- Chrome a 1280 px: diálogo en :modal, centrado, dentro del viewport y fuera del recorte del padre. Abrir/cancelar/reabrir produjo cero solicitudes; confirmar produjo una y generó el QR. Descarga disponible.
- Pendiente validar en el despliegue real: secretos/IAM, entrega de push, enlaces en los dominios publicados, contenido aplicable del aviso y dispositivos reales.
