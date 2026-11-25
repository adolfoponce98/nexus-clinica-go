# Sesiones seguras de Clínica Go

Actualización: el registro obligatorio de dispositivos, los cambios de logout y la migración vigente se describen en [SYNC-DEVICES.md](SYNC-DEVICES.md). Ese documento sustituye las indicaciones de compatibilidad de login anteriores.

Implementación local en Angular (`D:\GitHub\nexus-admin-nexo-salud`) y Cloud Functions (`C:\Users\Adolfo\Documents\google_functions\nexus-clinq-go-functions`). Estos cambios requieren desplegar ambos proyectos; no se publican automáticamente.

## Comportamiento

- Access token JWT de hasta 15 minutos, exclusivamente en memoria de Angular. Al recargar, se obtiene otro mediante la cookie. Se conserva en localStorage únicamente la información de perfil necesaria para la interfaz y las cachés existentes.
- Refresh token JWT de hasta 7 días, en cookie de host `__session`, `HttpOnly; Secure; SameSite=Strict; Path=/`. Cada renovación cambia el token y mantiene la fecha de expiración absoluta de la sesión: no se extiende indefinidamente.
- `__session` es el nombre que Firebase Hosting permite reenviar a las funciones. Las rutas `/api/auth/*` comparten el dominio de Angular. No deben sustituirse por las URLs independientes de Cloud Run para el flujo web.
- Las respuestas de autenticación son privadas y no se almacenan en caché.
- Los JWT incluyen tipo, issuer, audience, identificador de sesión y un identificador aleatorio único. Los servicios protegidos con JWT aceptan exclusivamente access tokens del formato nuevo.
- Firestore guarda hashes de tokens en `session_tokens`, y una sesión por dispositivo/login en `auth_sessions`. No se guardan los nuevos tokens completos. Los tokens consumidos se conservan hasta después de expirar la sesión para detectar reutilización.
- La rotación es una transacción: reutilizar un refresh token consumido revoca toda su sesión, incluidos sus access tokens. Las otras sesiones del usuario siguen activas.
- Login, refresh y logout se serializan en Angular. Las llamadas concurrentes comparten una renovación. Web Locks coordina las pestañas del mismo origen en navegadores compatibles; en navegadores sin esa API se conserva la coordinación dentro de cada pestaña. La reutilización concurrente entre pestañas no coordinadas se rechaza de forma segura y puede requerir volver a iniciar sesión.
- Logout revoca la sesión en el servidor, elimina la cookie y limpia los datos locales. Si no hay conexión o el servidor falla, se informa del error y se limpia la sesión local; la revocación remota no se considera confirmada.
- Tanto fetch como HttpClient renuevan automáticamente las peticiones autenticadas que reciben 401. Los permisos denegados con 403 no disparan renovación. Las URLs firmadas de Storage no reciben credenciales adicionales.
- Se quitaron logs de tokens y respuestas de autenticación. Login limita los intentos por IP y por combinación de IP/cuenta en `auth_rate_limits`.

## Dominios permitidos y CSRF

Por defecto, los endpoints de autenticación aceptan exactamente:

- `https://clinica-go.com`
- `https://clinq-go.web.app`
- `https://clinq-go.firebaseapp.com`
- `http://localhost:4200`

Las peticiones web requieren Origin permitido y `x-session-request: 1`, además de la cookie durante refresh/logout. Las solicitudes de clientes móviles no aceptan Origin de navegador y no leen cookies. `AUTH_ALLOWED_ORIGINS`, si se configura como variable de entorno de Functions, reemplaza la lista completa (valores separados por comas).

`x-app-signature`, `x-client-source` y la clave AES de Angular son datos públicos del cliente; no sustituyen la autenticación ni la autorización del servidor. Se conserva el formato AES existente para compatibilidad con los demás servicios. La firma JWT usa exclusivamente `JWT_SECRET` del servidor y HTTPS protege el transporte.

## Despliegue

1. Verifica que los secretos existentes de Functions `JWT_SECRET`, `APP_ENCRYPTION_KEY` y `APP_SECRET_HEADER` estén disponibles en `clinq-go`. `JWT_SECRET` debe tener al menos 32 bytes y ser aleatorio. Ya no existe una clave alternativa fija. No copies ese secreto a Angular.
2. Desde `C:\Users\Adolfo\Documents\google_functions\nexus-clinq-go-functions`, ejecuta:

   ```powershell
   firebase deploy --only functions --project clinq-go
   ```

   Es necesario publicar todos los servicios afectados, no solo `refreshToken`: los validadores y los endpoints de reportes comparten la nueva política. La nueva función pública es `logoutSession`; sigue exportada desde `functions/src/index.js`. `loginUser`, `loginEmployes` y `refreshToken` conservan sus nombres.

3. Desde `D:\GitHub\nexus-admin-nexo-salud`, ejecuta:

   ```powershell
   npm run build
   firebase deploy --only hosting --project clinq-go
   ```

   `firebase.json` añade antes de la ruta de Angular las reescrituras:

   | Ruta | Cloud Function | Región |
   | --- | --- | --- |
   | `/api/auth/login` | `loginUser` | `us-central1` |
   | `/api/auth/employee-login` | `loginEmployes` | `us-central1` |
   | `/api/auth/refresh` | `refreshToken` | `us-central1` |
   | `/api/auth/logout` | `logoutSession` | `us-central1` |

   Se corrigió `.firebaserc` de Angular: apuntaba a `bookings-spinnings` y ahora apunta a `clinq-go`, de acuerdo con `environment.ts` y los dominios productivos indicados.

4. El despliegue invalida las sesiones del formato anterior, tanto de web como de móvil: todos deben iniciar sesión otra vez. Realiza ambos despliegues en una misma ventana; entre ellos, el frontend anterior no puede renovar con el nuevo servidor. Las apps móviles siguen recibiendo `sessionToken` y `refreshToken` en login y `accessToken` y `refreshToken` en renovación; deben conservar el refresh nuevo después de cada renovación y enviar el refresh, nunca el access token, al renovar. La compatibilidad móvil se verificó con los handlers; no se ejecutó una prueba del APK.

## Pruebas en localhost

`npm start` / `ng serve` utiliza `proxy.conf.json`: cada ruta `/api/auth/*` se reenvía directamente a su función de Google Cloud con el sufijo `-o7vmreizjq-uc.a.run.app` (`loginuser`, `loginemployes`, `refreshtoken` y `logoutsession`). No depende del despliegue de Hosting para las pruebas locales, pero sí requiere las funciones actualizadas desplegadas. Reinicia `ng serve` cuando cambies el proxy. En el navegador sigue siendo una petición a `http://localhost:4200`, con cookie de localhost. Utiliza ese nombre de host y puerto; `127.0.0.1` y otros puertos no están en la lista autorizada. Los navegadores modernos admiten cookies Secure en localhost; en producción siempre se necesita HTTPS.

Este proxy de desarrollo utiliza el backend desplegado, no una base de datos de pruebas. Para trabajar con emuladores, configura un proxy local equivalente hacia las cuatro funciones del emulador y utiliza sus datos de prueba.

## Firestore y mantenimiento

No se cambiaron ni publicaron reglas de Firestore porque no existen reglas del proyecto en estas carpetas. Verifica en la base nombrada `nexus-cliniq-dev` que clientes web/móviles no puedan leer ni escribir `session_tokens`, `auth_sessions` ni `auth_rate_limits`. Solo deben gestionarse con Admin SDK. Una regla `allow ...: if false` no bloquea una regla más amplia que permita la misma ruta: revisa también las reglas generales existentes.

Los registros nuevos incluyen `deleteAfter` como fecha compatible con TTL. Puedes habilitar una política TTL en ese campo para los tres grupos de colecciones. La expiración y revocación se verifican en cada solicitud y no dependen de que TTL haya borrado documentos. Los documentos antiguos que contienen tokens completos ya no autorizan solicitudes; no fueron borrados ni modificados de forma masiva en producción.

Esta mejora cubre el flujo de sesiones y los servicios que ya verificaban JWT. No constituye una auditoría de todas las funciones antiguas que no tenían autenticación, de permisos entre consultorios ni del contenido de las cachés clínicas del navegador.

## Verificación local

- Angular: `npm test -- --watch=false` y `npm run build`.
- Functions: `npm test` desde `functions`.
- Las pruebas incluyen separación access/refresh, rotación y reutilización, revocación de sesión, concurrencia, almacenamiento sin tokens, CSRF, cookies, compatibilidad de respuestas móviles, reintentos de fetch/HttpClient y login/refresh/logout con handlers reales y una base simulada. No leen ni modifican Firestore productivo.

Referencia del nombre de cookie y de las reescrituras: https://firebase.google.com/docs/hosting/manage-cache#using_cookies y https://firebase.google.com/docs/hosting/functions.
