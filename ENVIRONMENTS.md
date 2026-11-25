# Entornos de Clínica Go

| Compilación | Proyecto Firebase | Firestore             | Hosting                      |
| ----------- | ----------------- | --------------------- | ---------------------------- |
| development | clinq-go-dev      | clinica-go-desarrollo | https://clinq-go-dev.web.app |
| production  | clinq-go          | nexus-cliniq-dev      | https://clinica-go.com       |

Son dos proyectos independientes. Desarrollo se usa para pruebas/QA; no se creó un tercer proyecto. No se copian usuarios, pacientes, archivos, planes ni credenciales entre ellos.

## Angular

Desde D:\GitHub\nexus-admin-nexo-salud:

```powershell
npm run start:dev
npm run build:dev
npm run build:prod
```

`npm start` usa development y `npm run build` usa production, como los valores predeterminados del CLI.
Para probar el frontend contra servicios productivos desde localhost: `npm run start:prod`.

Desplegar Hosting, recompilando primero para el proyecto elegido:

```powershell
npm run deploy:dev
npm run deploy:prod
```

`src/environments/environment.ts` contiene desarrollo; `environment.production.ts` se reemplaza al compilar producción. Incluyen Firebase, base Firestore, endpoint base, VAPID y valores públicos del protocolo cifrado. JWT_SECRET, claves Stripe, Twilio y Gemini pertenecen exclusivamente al backend/Secret Manager.

Las URLs de funciones se construyen con el nombre exportado en minúsculas y `functionsUrlSuffix`: desarrollo usa `-r5d3nvgypq-uc.a.run.app` y producción `-o7vmreizjq-uc.a.run.app`. Las cuatro rutas /api/auth/\* siguen siendo del mismo origen para conservar cookies HttpOnly: Hosting las reescribe a funciones del proyecto desplegado y ng serve usa un proxy distinto por entorno.

El service worker es compartido e importa /firebase-environment.js, cuyo contenido se copia desde src/environments/development o production según la compilación. No editarlo manualmente en dist.
Al cambiar de proyecto en el mismo origen (localhost), se descartan la sesión y cachés clínicas anteriores para no mezclar información.

## Cloud Functions

Desde C:\Users\Adolfo\Documents\google_functions\nexus-clinq-go-functions:

```powershell
firebase deploy --only functions --project clinq-go-dev
firebase deploy --only functions --project clinq-go
```

functions/.env.clinq-go-dev:
FIRESTORE_DATABASE_ID=clinica-go-desarrollo
APP_BASE_URL=https://clinq-go-dev.web.app

functions/.env.clinq-go:
FIRESTORE_DATABASE_ID=nexus-cliniq-dev
APP_BASE_URL=https://clinica-go.com

Estos valores controlan lecturas, escrituras, triggers, respaldos y enlaces públicos. El módulo functions/domains/bookings/src/config/runtime.js es la fuente central. Se añadieron alias dev/prod en ambos proyectos locales; los comandos anteriores llevan proyecto explícito.

## Preparación del proyecto de desarrollo antes de usarlo

- La base clinica-go-desarrollo y su bucket deben existir en clinq-go-dev, con sus permisos/reglas. No se crearon recursos remotos.
- Configurar en Secret Manager de clinq-go-dev los mismos nombres de secretos que exige cada función, con credenciales de pruebas. JWT_SECRET debe ser propio de desarrollo; no copiar tokens de sesión. APP_ENCRYPTION_KEY y APP_SECRET_HEADER deben coincidir con apiSecurity del environment de desarrollo.
- Stripe: configurar STRIPE_SECRET_KEY de pruebas y STRIPE_WEBHOOK_SECRET del webhook de desarrollo. Dar de alta catálogo/precios de pruebas en Firestore de desarrollo. El selector test/live ya depende de la clave Stripe del backend.
- Google Calendar: cliente OAuth de desarrollo con URI autorizada https://us-central1-clinq-go-dev.cloudfunctions.net/googleCalendarCallback y dominios dev. Las variables de callback de desarrollo ya apuntan a ese proyecto.
- WhatsApp: configurar remitente y credenciales de pruebas; el webhook de pruebas es https://us-central1-clinq-go-dev.cloudfunctions.net/whatsappWebhook. Un mismo remitente Twilio solo puede tener un webhook de entrada; no sustituir el productivo para probar.
- FCM web: generar el par de claves web push en Firebase > Configuración del proyecto > Cloud Messaging de clinq-go-dev y colocar la clave pública en environment.ts > vapidKey. Está vacía para no reutilizar la productiva; mientras tanto el SDK utiliza su clave predeterminada si el navegador la admite.
- CLINICAL_BACKUP_BUCKET de desarrollo debe ser un bucket privado de respaldo propio, en región distinta al operativo. Revisar su valor antes del primer despliegue; no se creó ni cambió un bucket remoto.
- Los scripts de migración/TTL anteriores son tareas operativas independientes; al usarlos en desarrollo indicar --project=clinq-go-dev y --database=clinica-go-desarrollo (en PowerShell, -Project y -Database). Sus valores predeterminados siguen siendo producción por compatibilidad.

No se ha desplegado ni modificado ningún recurso remoto con este cambio.
