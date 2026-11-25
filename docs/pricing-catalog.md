# Catálogo de precios de Clínica Go

## Pantalla y acceso temporal

La ruta `/configuracion-precios`, disponible desde el menú lateral, permite a todas las cuentas principales de doctor configurar el catálogo global durante desarrollo. Las cuentas de empleados no pueden leer ni editar esta configuración, aunque tengan permisos de planes. Esta autorización temporal debe sustituirse cuando exista el panel administrativo exclusivo.

## Datos y versiones

- `billing-products/{productId}` guarda nombre, descripción, tipo (`subscription` o `credits`), créditos, beneficios, límites, revisión e instantáneas `priceOptions` para consultar el catálogo sin una consulta por precio.
- `billing-products/{productId}/prices/{offerId}` conserva las versiones de cada oferta. Los cambios financieros generan una nueva versión; las anteriores quedan inactivas y no se eliminan.
- `billing-provider-prices/stripe_{test|live}_{priceId}` permite resolver directamente el producto y los beneficios de un precio de Stripe.
- `billing-catalog-audit` registra el actor y las revisiones del catálogo.

Cada oferta define moneda MXN, importe en centavos, modo de cobro y periodicidad. Las suscripciones aceptan mensual, trimestral, semestral o anual; los paquetes de créditos son de pago único. Cada proveedor conserva nodos `test` y `live` separados con `enabled`, `amountCents` e identificadores externos. No se almacenan claves privadas de las pasarelas en este catálogo.

La cantidad de una recarga proviene de `credits`, nunca del precio ni de datos del cliente. Las compras conservan una instantánea de sus beneficios y mantienen la protección existente contra acreditaciones duplicadas.

## Proveedores

Se pueden configurar Stripe, OXXO, Mercado Pago, Openpay, STP, SPEI, Clip y Conekta. El checkout implementado actualmente es Stripe. Guardar otros proveedores prepara sus datos para futuras integraciones y no habilita cobros. OXXO, SPEI y STP se ofrecen aquí para operaciones de pago único.

La pantalla no crea productos ni precios en las plataformas externas. Primero deben crearse allí y luego capturarse sus identificadores. En Stripe se verifica que producto, moneda, importe, periodicidad y entorno coincidan antes de abrir Checkout. El entorno efectivo se obtiene de la clave Stripe del servidor. Los precios test no deben configurarse como live.

## Compatibilidad

Los productos anteriores de `suscriptions` siguen disponibles. Se migran al catálogo nuevo únicamente al guardarlos desde esta pantalla. El documento anterior se conserva, pero se evita mostrarlo duplicado. Las operaciones de pago ya iniciadas mantienen su información histórica.

## Despliegue

Desde la raíz del proyecto Firebase:

```powershell
firebase deploy --only "functions:getPricingCatalog,functions:savePricingProduct,functions:getSubscriptions,functions:createStripeCheckoutSession,functions:getStripeCheckoutResult,functions:stripeWebhookPaymentSuccess"
```

Después, compilar y publicar Angular con el procedimiento habitual. `getPricingCatalog` usa el secreto existente `STRIPE_SECRET_KEY`; no se requieren secretos de proveedores todavía no integrados.

## Verificación realizada

Compilación de Angular, pruebas unitarias de catálogo y facturación, y recorrido de navegador con servicios simulados: suscripción mensual/anual, importes test/live distintos, recarga de 200 créditos y visualización en Planes. Estas pruebas no modificaron el catálogo real ni generaron cobros.

## Cupones

Checkout permite introducir códigos promocionales de Stripe tanto para suscripciones como para recargas. El cupón y su código se crean y administran en Stripe, en el entorno correspondiente. Los parámetros de sesiones anteriores ya iniciadas se conservan: se requiere una sesión nueva para ver el campo.

La sección de referencia interna en Configuración de precios guarda únicamente ID de cupón, título y descripción, junto con datos de auditoría, en `billing-coupons/{entorno}_{hashDelId}`. Solo los endpoints internos `getPricingCatalog` y `savePricingCoupon` acceden a esas referencias; no se devuelven desde Planes ni intervienen en la aplicación del descuento. Guardar el mismo ID actualiza su referencia en ese entorno.

Para publicar esta mejora: desplegar `createStripeCheckoutSession`, `getPricingCatalog`, `savePricingCoupon`, `getStripeCheckoutResult` y `stripeWebhookPaymentSuccess`, y publicar Angular. Un descuento total de Stripe sobre una recarga completada se reconoce sin duplicar la acreditación; el saldo proviene del producto y no del importe pagado.

## Vigencia de suscripciones

La confirmación de una factura pagada guarda el nombre exacto del plan y las fechas en `billing-accounts/{doctor}/subscription` y en `users/{doctor}`. En el perfil, `expirationSuscription` es el fin de acceso con gracia; `subscriptionPaidThrough` es el fin del periodo; `subscriptionPeriodStartedAt` es el inicio del periodo; `planName` es el nombre contratado. No se calculan fechas desde Angular ni desde datos de pago enviados por el cliente.

Regla de acceso: mensual, 30 días desde el inicio del periodo pagado; trimestral, semestral y anual, 3/6/12 meses calendario, ajustando el día al último válido cuando corresponde. Se añaden tres días de gracia una sola vez al vencimiento pagado, sin acumularlos por reintentos o renovaciones fallidas. Los cargos de Stripe conservan su calendario real (un mes Stripe puede tener 28–31 días). Las facturas históricas o prorrateadas sin datos suficientes conservan el periodo pagado informado por Stripe. Los periodos de prueba no reciben gracia de pago.

La UI usa el estado de permisos de facturación como fuente de verdad y muestra nombre, fechas, días restantes y barra de tiempo restante. El reloj local actualiza el indicador; no se agregan peticiones de sincronización. Las suscripciones existentes adoptan los campos nuevos al procesarse su siguiente sincronización de Stripe.

La mejora modifica módulos compartidos por múltiples funciones. Publicar con `firebase deploy --only functions`, y después publicar Angular.
