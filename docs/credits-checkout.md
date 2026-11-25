# Recargas IA y suscripciones

El catálogo de Firestore está en `suscriptions`. El campo principal para una recarga es `credits`; se conservan `aiCredits` y `creditos` como compatibilidad cuando `credits` no existe. `type: 2` o `kind: credits` identifica un pago único. Los otros planes usan suscripción.

Consulta verificada: `suscriptions/creditos` contiene `credits: 100`, `type: 2`, `idSuscription: price_1UUzdCHLs0r0bFs5L0zu7Qkr`. Stripe confirma producto `prod_VW1gArINXwFUsd`, precio activo de 500 centavos MXN ($5.00), tipo one_time, impuestos incluidos y modo test. El precio de Firestore no determina el cobro: siempre se consulta el precio de Stripe. Si se añade `stripeProductId` o `productId` al catálogo, también se valida que el precio corresponda a ese producto.

Los doctores propietarios FREE y suscritos pueden comprar recargas. Los empleados conservan la restricción de gestión de pagos. La compra no habilita funciones premium ni modifica la suscripción.

Checkout usa payment para créditos y subscription para planes periódicos. La cantidad de créditos se congela en la solicitud del servidor; no se acepta desde Angular. El webhook verifica firma, identidad de la sesión, precio y pago confirmado antes de acreditar el saldo. Una transacción con registro de pago impide dobles acreditaciones por reintentos concurrentes. Las recargas no tienen vencimiento. La página de resultado comprueba el estado real; cancelar el retorno no acredita créditos.

Angular muestra la recarga para FREE y suscriptores, su saldo, cantidad, precio real e impuestos incluidos. Si falta la cantidad de créditos, muestra un diagnóstico específico. El catálogo mantiene el tipo credits incluso si su configuración falla.

Pruebas: 32 Node.js de facturación, 10 Angular de planes/facturación y comprobación visual con ambos tipos de cuenta usando el catálogo y precios reales consultados de solo lectura. Las sesiones de compra, pagos y acreditaciones se prueban con Stripe/base de datos simulados; no se crearon sesiones ni cargos reales ni se modificó el catálogo remoto.

Despliegue desde la raíz Firebase:

```powershell
firebase deploy --only "functions:getSubscriptions,functions:createStripeCheckoutSession,functions:getStripeCheckoutResult,functions:stripeWebhookPaymentSuccess"
```

Publicar también Angular actualizado. No hay funciones nuevas que registrar en index.js. Para cobros reales se requieren claves y productos/precios del mismo entorno live; los IDs anteriores son de prueba.

Referencia de Checkout: https://docs.stripe.com/api/checkout/sessions/create
