# Recuperación de contraseña por correo

## Flujo

El diálogo de recuperación del login llama a `sendOtp` con `{email, purpose: "password-reset"}`. Después se navega a `/recuperar-contrasena`, una ruta pública con pasos para validar el OTP y capturar/confirmar la nueva contraseña. Una navegación directa o recarga inicia en el paso de correo: las autorizaciones no se guardan en localStorage, cookies ni URL.

`verifyOtp` con el mismo propósito devuelve un `resetToken` temporal después de verificar el código. `updatePassword` requiere `{email, resetToken, newPassword, confirmPassword}`. Una respuesta exitosa devuelve al login; no inicia sesión automáticamente.

Las solicitudes y respuestas siguen el cifrado de transporte de la aplicación y sus cabeceras existentes. El permiso para cambiar la contraseña proviene del token aleatorio validado por el servidor, no de esas cabeceras ni del estado de Angular.

## Controles del servidor

- Códigos de recuperación separados de los códigos de registro; el comportamiento de registro existente se conserva.
- OTP de seis dígitos generado con `crypto.randomInt`, hash bcrypt, cinco minutos de vigencia, hasta cinco intentos y un minuto entre reenvíos.
- Respuesta genérica al solicitar recuperación de una cuenta inexistente.
- Autorización aleatoria de 32 bytes: únicamente su hash se guarda en Firestore, ligada al correo, al reto y a la contraseña vigente. Caduca a los diez minutos y se consume una sola vez.
- Contraseña de al menos 12 caracteres con mayúscula, minúscula, número y símbolo; confirmación validada también en el servidor. Hash Argon2id.
- Cambio de contraseña, consumo del permiso y revocación de sesiones indexadas se confirman en una transacción. Después se limpian dispositivos mediante el mecanismo existente.
- Los documentos de `password-reset-otps` y `password-reset-grants` tienen `deleteAfter` para una posible política TTL; su vigencia siempre se comprueba por código. `password-reset-audit` conserva un registro sin contraseñas ni tokens.

Este flujo recupera cuentas principales almacenadas en `users/{email}`. El acceso de empleados mantiene el flujo existente con código de consultorio.

## Despliegue

Desde la raíz del proyecto Firebase:

```powershell
firebase deploy --only "functions:sendOtp,functions:verifyOtp,functions:updatePassword"
```

Publicar Angular después de las funciones. Se reutilizan `APP_ENCRYPTION_KEY` y `APP_SECRET_HEADER`; no se requieren secretos nuevos.

Verificado con 243 pruebas de backend, nueve pruebas de Angular relacionadas con recuperación/login, compilación y recorrido completo con Firestore y correo simulados. No se enviaron correos reales durante la prueba.
