# Suscripciones, cuotas y créditos IA

Implementación revisada el 21 de noviembre de 2026. Cambios locales; no se han desplegado ni efectuado cobros reales.

## Comportamiento acordado

- FREE para toda la cuenta del doctor: 5 pacientes, 1 consultorio, 3 servicios de catálogo y 1 empleado activo. Compartir un servicio con varios consultorios consume una plaza, no una por consultorio.
- Los registros existentes no se eliminan al vencer el plan. Se bloquean las altas que exceden el límite; consultar y editar no consume otra plaza. Deshabilitar un empleado libera su plaza; reactivarlo vuelve a comprobar el límite.
- Las suscripciones habilitan reportes, gráficas y Nexus IA. Los permisos de cada empleado siguen siendo necesarios. Una recarga no sustituye la suscripción.
- Los pagos únicos (`type: 2`) suman créditos IA sin vencimiento y no modifican la suscripción.
- Resumen médico, extracción de expediente y digitalización de receta/firma cuestan **1 crédito por operación completada**. La captura, el dictado local y los errores del proveedor no generan este cargo.
- No se inventa una cantidad de créditos para un producto mal configurado. Las tarjetas con configuración incompleta quedan sin compra habilitada.

## Hallazgos corregidos

Checkout ya no confía en el precio, correo, modalidad ni créditos enviados por el navegador. Requiere sesión válida y propietario; resuelve precio, moneda MXN, periodicidad y cantidad en el catálogo y Stripe. La confirmación por `success=true` fue retirada: la pantalla `/planes/resultado` verifica en servidor la pertenencia y el pago real de Checkout.

Las URL de retorno usan exclusivamente los orígenes autorizados. La sesión de pago y sus parámetros se congelan con UUID e idempotencia; los reintentos conservan precio, créditos, vencimiento y URL. Se conserva una sola compra pendiente por cuenta. Una suscripción aún administrable en Stripe, incluso morosa, debe resolverse en el portal antes de abrir otra.

El webhook verifica la firma sobre `rawBody`, registra eventos e ignora duplicados. Las recargas tienen además un asiento transaccional por Checkout que evita sumar dos veces aunque lleguen eventos concurrentes diferentes. Se atienden pagos, expiraciones, renovaciones, fallos y cancelaciones. Solo una factura pagada extiende el periodo pagado; volver a consultar un Checkout antiguo no extiende una renovación impagada. Un evento anterior de otra suscripción no debe reemplazar una posterior. Los cambios de precio del portal se vinculan al catálogo cuando su factura pagada identifica ese precio.

Los límites se comprueban dentro de la misma transacción que crea el registro. También se aplica el límite de pacientes al formulario público de autogestión. El guardado de consultorios no permite introducir servicios ni contadores por fuera del servicio de catálogo. Se implementó eliminación real del catálogo de servicios; el historial clínico permanece.

## Catálogo `suscriptions`

El ID del documento es `planId`. Ejemplo de suscripción:

```json
{"title":"Profesional mensual","type":1,"stripePriceId":"price_...","active":true,"benefits":["Herramientas de tu práctica"]}
```

Ejemplo de recarga:

```json
{"title":"200 créditos IA","type":2,"stripePriceId":"price_...","aiCredits":200,"active":true}
```

Se aceptan `priceId`, `idSubscription` e `idSuscription` como compatibilidad y un `prod_...` con precio predeterminado. `credits` o `creditos` también se admiten para la cantidad de recarga. El precio debe ser fijo, activo y en MXN: recurrente para suscripciones y de pago único para recargas. El importe mostrado procede de Stripe, en centavos, no de una etiqueta del documento.

Opcionalmente, el plan recurrente puede definir `limits: {patients:100,offices:3,services:30,employees:5}`. Una clave omitida o `null` significa sin límite dentro de un plan pagado. Los límites FREE son fijos y se restablecen al terminar el acceso pagado. No configurar varios documentos distintos con el mismo precio si necesitan límites diferentes. El flujo de Checkout utiliza un único ítem y una moneda; no se deben añadir productos ajenos al catálogo desde el portal.

## Datos y lecturas

Base Firestore: `nexus-cliniq-dev`.

- `billing-accounts/{idDoctor}`: suscripción verificada, periodo pagado, uso global, saldo y reservas IA temporales.
- `billing-accounts/{idDoctor}/services/{serviceId}`: índice de consultorios del servicio.
- `billing-accounts/{idDoctor}/checkout-requests/{uuid}`: solicitud y parámetros inmutables de compra.
- `billing-accounts/{idDoctor}/payments/{checkoutId|invoice_id}`: pagos y recargas; el duplicado técnico de la primera factura queda oculto en la lista.
- `billing-accounts/{idDoctor}/ai-operations/{operationHash}`: operación, autor, costo y estado; sin texto clínico ni imágenes.
- `clinical-ai-cache/{idDoctor}/ai-results/{operationHash}`: resultado reutilizable durante 24 horas, cifrado AES-GCM con **CLINICAL_DATA_KEY**, separado de la clave pública del transporte Angular y ligado criptográficamente a su ruta.
- `stripe-checkouts`, `stripe-subscription-owners`, `stripe-customer-owners`, `stripe-payment-owners`, `stripe-billing-events`: índices directos de conciliación y deduplicación.

El uso existente se prepara una sola vez mediante colecciones directas y conteos agregados de pacientes. Después se mantiene al guardar; no se vuelven a escanear todas las colecciones en cada indicador. Las escrituras administrativas fuera de estas funciones necesitan una conciliación del contador antes de habilitarlas; no modificar manualmente el saldo ni `usageReady`.

Una reserva IA evita que dos operaciones gasten el mismo último crédito. Solo se debita al guardar un resultado utilizable. Si falla se libera; si el proceso se interrumpe, la reserva deja de bloquear fondos después de 12 minutos. Los reintentos del mismo `requestId` devuelven el resultado sin un segundo cargo. Reutilizar el ID con otro contenido se rechaza. El ledger permanece aunque expire la caché.

Configurar una política TTL para el grupo de colecciones **ai-results**, campo **expiresAt**, en esta base. La expiración se verifica también en código; la eliminación física TTL es asíncrona. No aplicar TTL al ledger `ai-operations`, a los pagos ni al expediente clínico.

## Preparación y despliegue

1. Mantener `STRIPE_SECRET_KEY` y `STRIPE_WEBHOOK_SECRET` del mismo entorno Stripe. Las funciones IA necesitan también el secreto clínico existente `CLINICAL_DATA_KEY`; no usar la clave del cliente para este secreto.
2. Completar el catálogo con los precios y créditos reales antes de aceptar compras. Verificar los permisos IAM del secreto y las reglas Firestore cerradas al cliente; todas las escrituras de facturación son del servidor.
3. Habilitar y configurar Stripe Customer Portal para cancelación, métodos de pago y facturas. Si permite cambios de plan, sus precios deben existir en el catálogo. No habilitar suscripciones de múltiples ítems en este flujo.
4. Registrar el endpoint existente `stripeWebhookPaymentSuccess` con eventos **snapshot**, firma correcta y estos eventos:

```
checkout.session.completed
checkout.session.async_payment_succeeded
checkout.session.async_payment_failed
checkout.session.expired
customer.subscription.created
customer.subscription.updated
customer.subscription.deleted
customer.subscription.paused
customer.subscription.resumed
invoice.paid
invoice.payment_failed
invoice.payment_action_required
invoice.finalization_failed
charge.refunded
```

5. Desde `C:\Users\Adolfo\Documents\google_functions\nexus-clinq-go-functions`, ejecutar:

```powershell
firebase deploy --only functions
```

Se recomienda desplegar el conjunto completo porque hay helpers compartidos de seguridad y cuotas. Funciones HTTP nuevas: **getAccountEntitlements**, **getStripeCheckoutResult**, **createStripeBillingPortal** y **deleteDoctorService**. También se modificaron **getSubscriptions**, **createStripeCheckoutSession**, **stripeWebhookPaymentSuccess**, **registerNewPatient**, **submitPatientRegistration**, **saveOrUpdateConsultorio**, **newDoctorService**, **saveDoctorService**, **saveOrUpdateEmployee**, **deleteEmploye**, **getOfficeMetrics**, **getMetricsReport**, **rebuildMetrics**, **generateMedicalSummary**, **extractExpedient** y **generateBlankPrescription** (algunas mediante un helper compartido).

6. Publicar el build Angular después de las funciones. Las URL nuevas usan `-o7vmreizjq-uc.a.run.app`; Hosting debe conservar la reescritura SPA para `/planes/resultado` y las existentes de autenticación. No desplegar usando un archivo `firebase.json` de una subcarpeta por accidente.
7. En Stripe de pruebas, comprobar una tarjeta exitosa, una rechazada, autenticación adicional, cancelar Checkout, renovación, fallo de renovación y cancelación del plan. Las pruebas locales sustituyen Stripe; no verifican credenciales ni configuración del Dashboard.

## Migración y alcance operativo

Una suscripción antigua solo se migra automáticamente si tiene estado activo, fecha futura y un identificador **sub_** registrado. Un booleano, un ID **cs_** o una compra única antigua no prueban una suscripción vigente. Antes de producción, conciliar las cuentas existentes que no tengan `stripeSubscriptionId` contra Stripe y registrar su relación real; no inventar fechas ni convertir recargas en suscripciones. No se reconstruyen recargas históricas automáticamente para evitar duplicar créditos ya concedidos.

Los reembolsos completos de recargas revierten sus créditos una sola vez. Si ya se consumieron, puede quedar saldo negativo y no se permiten nuevas operaciones hasta recargar. Reembolsos parciales, disputas y devoluciones de suscripciones requieren una política comercial y conciliación administrativa; no se ha inventado una equivalencia automática de pesos a créditos o días. Un fallo de tarjeta se muestra también en la página alojada de Stripe; la página de resultado no afirma un cobro sin verificarlo.

Las cards de digitalizar recetario e importar expediente en Nexus IA conservan su estado de herramienta aún no vinculada a un flujo; este trabajo no implementa nuevos flujos OCR. La extracción existente desde Pacientes y la digitalización existente de firma/receta sí tienen el control de créditos. No se modificó Android en esta revisión.

## Validación local

Pruebas Node con Firestore y Stripe simulados: cuotas globales y concurrencia en los cuatro módulos, autorización del propietario, precio confiable, idempotencia, parámetros de reintento congelados, recargas y reembolsos, renovaciones fallidas, cancelaciones, cambios de plan pagados, no resucitar periodos antiguos y reserva/cobro/reintento/expiración de caché IA.

Pruebas Angular: cuotas, caducidad local de funciones premium, coalescencia y recuperación ante error. QA Chrome a 1280×720: Planes, diálogo de confirmación a nivel pantalla, indicadores, botón de alta bloqueado al llegar al límite, Home FREE/pagado, aviso Nexus IA y resultados exitoso/cancelado/fallido/pendiente/error. Sin desbordamiento horizontal ni errores de ejecución en esos flujos. Ver `billing-qa/result.json` y capturas del proyecto Angular.

Referencias técnicas oficiales: https://docs.stripe.com/webhooks y https://docs.stripe.com/billing/subscriptions/webhooks .
