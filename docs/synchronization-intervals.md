# Sincronización y sesión

Los intervalos de respaldo de Angular están en `src/app/config/sync-policy.ts`:

- Sesión, consultorios, pacientes y notificaciones: 15 minutos con la pestaña visible.
- Consulta de citas para check-in: 15 minutos con la pestaña visible.
- Lista de dispositivos conectados: 15 minutos mientras esa vista está abierta y visible.
- Suscripción: 30 minutos. El reloj de expiración continúa localmente cada minuto.

El inicio de sesión, cambio de consultorio, guardados y mensajes push conservan sus actualizaciones inmediatas. Recuperar el foco solo consulta cuando venció el intervalo; los cambios de token sin cambios de cuenta no recargan la suscripción. Home reutiliza la verificación de suscripción reciente.

El check-in revisa la hora local cada 15 segundos y mantiene su sonido cada 10 minutos durante la cita; ese temporizador no hace peticiones web.

El cierre por inactividad de Angular es de 60 minutos. La preferencia antigua de 15/20/30 minutos ya no se utiliza. Registrar actividad real tiene un límite de una petición cada 10 minutos, compartido entre pestañas de la misma sesión. El temporizador local comprueba la inactividad cada 15 segundos; no envía actividad si no hubo interacción o la pestaña está oculta. Los fallos se reintentan como máximo una vez por minuto. Recargar o recuperar el foco no reinicia la última interacción. El servidor añade 10 minutos de tolerancia al registro agrupado para no cerrar prematuramente una sesión activa; Angular cierra a los 60 minutos de inactividad real. Clientes antiguos de 15/20/30 minutos mantienen compatibilidad sin esa tolerancia. La vida del token de acceso y su renovación al necesitarse no se modifican.

Si falla push, la detección visual de cambios o desconexión remota puede tardar hasta el siguiente respaldo visible (15 minutos). Cada petición al servidor continúa verificando permisos y revocación. La presencia es aproximada: actividad reciente en los últimos 20 minutos, no una conexión en tiempo real.

Desplegar primero las funciones y después publicar Angular. El cambio de actividad afecta a `registerUserActivity` y al verificador compartido de sesiones que usan las funciones autenticadas: desplegar todas las funciones para mantener la misma validación en todos los endpoints. `getConnectedDevices` también contiene el nuevo umbral de presencia.
