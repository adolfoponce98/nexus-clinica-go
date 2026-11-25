# Diseño de escritorio y notificaciones locales

El tamaño físico en pulgadas no determina el espacio de una página. La referencia mínima de escritorio es un viewport de **1280 × 720 píxeles CSS**, además de 1366 × 768. El zoom del navegador y la escala de Windows pueden reducir ese espacio.

## Diseño

- `src/styles.css` contiene las reglas compartidas de rejillas, tablas y diálogos, y los puntos de cambio de columnas de Tailwind. Las columnas `lg`, `xl` y `2xl` comienzan a 1440, 1680 y 1920 píxeles para considerar el menú lateral.
- El menú se inicia colapsado debajo de 1440 píxeles; el usuario puede expandirlo con su botón. Se adapta al cruzar ese ancho.
- Las tablas y la vista semanal del calendario tienen desplazamiento horizontal dentro de su contenedor cuando lo necesitan. Los diálogos tienen un límite de altura y desplazamiento vertical.
- `.postcssrc.json` compila Tailwind 4 localmente. `@source "./app"` incluye las plantillas y clases de los componentes. No se requiere el script CDN de Tailwind.

## Notificaciones

- La primera apertura consulta el servicio si todavía no existe una caché. Las siguientes aperturas y recargas usan la lista local, incluso cuando está vacía.
- **Actualizar** consulta nuevamente el servidor y combina los resultados por ID conservando el historial local.
- **Marcar como leída** y **Marcar todas como leídas** modifican únicamente el almacenamiento del navegador. No llaman al servidor.
- La campana muestra las pendientes; el panel muestra los conteos de pendientes y leídas.
- Si cambia el contenido de una notificación recibida, vuelve a quedar pendiente. Una descarga repetida sin cambios conserva su estado.
- La caché usa la clave `nexus-notifications:v1:` más una combinación del correo del usuario y el ID del consultorio. Cambiar de usuario o consultorio no mezcla las listas.
- Una falla de red conserva la lista disponible. Si el navegador impide persistirla, el panel muestra un aviso. Limpiar los datos del navegador elimina la caché y las marcas de lectura; no se comparten entre navegadores ni dispositivos.

## Configuración de servicios

- `src/app/config/api-urls.ts`: catálogo de URLs de servicios. Los componentes y servicios importan `API_URLS`.
- `src/app/config/security.config.ts`: valores compartidos `ENCRYPTION_KEY` y `APP_SECRET_HEADER`. Los valores se conservan para mantener compatibilidad con el servidor.
- Estos valores siguen formando parte del código que recibe el navegador. Centralizarlos facilita su mantenimiento; el servidor debe seguir validando los tokens y permisos.

## Validación

```shell
npm run build
npm test -- --watch=false
```

Las pruebas de notificaciones verifican persistencia, separación por usuario y consultorio, caché vacía, actualización, duplicados, cambios de contenido, lectura y fallas de red o almacenamiento. La revisión visual utiliza datos simulados; no crea citas ni modifica datos del servidor.
