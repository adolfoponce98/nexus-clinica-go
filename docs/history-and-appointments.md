# Pacientes atendidos y agenda de citas

## Pantallas de Angular

- **Últimos pacientes atendidos → Ver todos** abre `/pacientes-atendidos`. Solo muestra citas con `status: 3`, ordenadas de la más reciente a la más antigua.
- **Próximas citas → Ver todas** abre `/citas`. Muestra todas las citas del periodo, incluso las canceladas o atendidas, en orden cronológico. La tarjeta del inicio conserva solo las próximas citas de hoy pendientes o confirmadas.
- Ambas pantallas comienzan con el día actual según la fecha local del navegador. Permiten navegar por día, por semana de lunes a domingo o por un rango personalizado inclusivo de hasta 366 días.
- Las flechas avanzan o retroceden un día, una semana o la longitud del rango personalizado aplicado. **Hoy** vuelve al día actual.
- Incluyen búsqueda por paciente, motivo o teléfono, paginación de 20 registros y botón **Actualizar**.
- Una consulta anterior se cancela cuando cambia el periodo o el consultorio; sus respuestas tardías no reemplazan la selección actual.

## Estados

| Valor | Significado |
| --- | --- |
| 0 | Sin confirmar |
| 1 | Confirmada |
| 2 | Cancelada |
| 3 | El paciente asistió |

Confirmación y asistencia son estados distintos. El código ya no convierte el valor `0` en «Completada», y actualiza la tarjeta de atendidos cuando cambia la caché de citas.

## Consulta de datos

`src/app/appointment-history/appointment-history.service.ts` usa `API_URLS.GETAPPOINTMENTS` y conserva la autenticación, el cifrado y la renovación de token existentes.

Para compatibilidad, divide los rangos que cruzan meses en solicitudes con `year`, `month`, `startDate` y `endDate`. El servicio anterior entiende `year/month`; el actualizado limita además la lectura a las fechas solicitadas. No se añaden consultas históricas a la caché de sincronización incremental, para evitar modificar su cursor.

Si falla alguna parte del rango, se muestra un aviso y la información local disponible. Esta información puede estar incompleta; no se presenta una respuesta parcial como si fuese el historial completo.

## Activación del cambio de Cloud Functions

La función `getAppointments` se actualizó en:

`C:\Users\Adolfo\Documents\google_functions\nexus-clinq-go-functions\functions\domains\bookings\src\appointments\getAppointments.js`

La actualización corrige la consulta de horarios cuyos documentos padre de día no existen. Hasta desplegarla, el servicio remoto anterior puede omitir esos registros. No se han desplegado funciones ni modificado documentos de Firestore.

Desde la carpeta del proyecto de funciones, con el proyecto Firebase correcto seleccionado:

```shell
firebase deploy --only functions:getAppointments
```

## Validación local

Angular:

```shell
npm test -- --watch=false
npm run build
```

Cloud Functions, desde su carpeta `functions`:

```shell
npm test
```

Las pruebas del servicio sustituyen Firestore por un simulador y no requieren credenciales ni acceden a pacientes reales. La validación visual también usa datos simulados.
