# Recetario físico personalizado

La card en /recetas abre un diálogo independiente. Acepta JPG, PNG, WebP o PDF de hasta 5 MB. PDF: se interpreta el diseño de la primera página. No guarda la imagen completa como fondo ni transcribe pacientes o medicamentos. Las nuevas propuestas conservan textos impresos y elementos individuales en coordenadas del original; las propuestas anteriores de siete bloques siguen siendo compatibles. El HTML se compila con tokens permitidos; no se ejecuta HTML libre del modelo. Es una reconstrucción del formato, no una copia exacta de la fotografía.

La vista previa conserva los textos fijos del papel (incluyendo datos profesionales impresos), sujetos a revisión y aprobación del médico. Los datos variables provienen de cada nueva receta. La identidad autenticada, la firma y el QR siguen vinculados al emisor real; no se copian firmas ni QR del papel. En fotos se recortan logos originales; en PDF se usa el logo disponible en el perfil/consultorio cuando no hay recurso rasterizado.

API existente `preparePrescriptionLogo`: `documentType: "prescription-template"`, `imageData`, `idConsultorio`, `requestId`. Conserva autorización, cifrado y política de créditos de ese endpoint. Devuelve draftId y customTemplate con design y html. Reintentos idempotentes. La propuesta no activa ni modifica la plantilla hasta la aceptación.

Nueva API `acceptPhysicalPrescriptionTemplate`: recibe draftId, idConsultorio, expectedRevision, expectedTemplateRevision. Comprueba propietario, usuario, consultorio, vigencia de 24h y versiones. Guarda customPrescriptionTemplate en clinical-professionals/{doctor}/users/{usuario}; activa physical-custom en prescriptionSettings del consultorio actual. Transacción y auditoría. No acepta HTML del navegador. La colección prescription-template-drafts conserva estado pendiente/aceptado. Datos estructurados por ID; sin búsquedas where.

getPrescriptionSettings devuelve customTemplate del profesional autenticado. La galería agrega una opción inicial número 11, sin quitar las diez originales. Si otro profesional no tiene plantilla propia, usa ocean. Cada receta emitida incluye una copia de customTemplate en su documento cifrado e íntegro para conservar el formato aunque el perfil cambie. Previsualización, impresión, PDF y adjuntos usan el mismo renderizador.

Despliegue de funciones desde la raíz Firebase:

```powershell
firebase deploy --only functions:preparePrescriptionLogo,functions:acceptPhysicalPrescriptionTemplate,functions:getPrescriptionSettings,functions:savePrescriptionSettings,functions:issuePrescription
```

No se modifica generateBlankPrescription ni sus controles de suscripción. No requiere nuevos secretos ni dependencias. Las pruebas de IA usan un proveedor simulado; revisar una digitalización real después del despliegue.

## Reconstrucción fiel, versión 2

Las nuevas digitalizaciones conservan cada texto impreso fijo, sus coordenadas porcentuales, tamaño, tipografía, alineación, colores, líneas, formas y ubicación original de encabezado/contacto/pie. En fotos se recuperan los logos recortando píxeles originales, sin redibujarlos ni sustituirlos por los del perfil. Para PDF se mantienen textos y formas; los logos sin recurso rasterizado utilizan el logo de perfil/consultorio disponible. Se excluyen pacientes y prescripciones previas, y la firma/QR se insertan con la identidad de la nueva emisión. No se actualiza la identidad profesional del perfil con el texto del papel. El doctor debe revisar y autorizar la exactitud de los datos impresos.

Renderizado por elementos y áreas variables, sin convertir a siete bloques genéricos. La página respeta sus proporciones y no añade padding, marcos ni encabezados estándar. Si hay demasiados medicamentos el contenido puede crecer y desplaza el pie sin ocultarlo. Las plantillas anteriores y recetas ya emitidas conservan el renderizador versión 1. Para mejorar una plantilla existente hay que subir nuevamente el original y aceptar la nueva propuesta.

Se mantiene autorización, cifrado y consumo de IA. El identificador de extracción versión 2 evita reutilizar respuestas antiguas en la caché. Nuevos archivos: physical-template-fidelity.js y faithful-prescription-document.component.*. No se modifica generateBlankPrescription. No se despliega automáticamente.

## Corrección de validación de imágenes de referencia

Se reprodujeron ambas fallas con las imágenes autorizadas y respuestas reales de Gemini. Las líneas horizontales/verticales pueden tener un eje cero, y las formas/imágenes no requieren tipografía. Se normaliza el grosor de las líneas sin cambiar sus coordenadas, se ignoran estilos de texto irrelevantes en gráficos y se admiten fuentes de 2–128px para texto real. Se mantiene la validación de colores seguros, límites de página, recursos y áreas variables. El área de medicamentos se limita al inicio de la firma/QR cuando existe espacio suficiente, sin mover los otros elementos.

Si la respuesta no cumple el formato, se permite una sola corrección automática dentro de la misma operación IA: máximo dos llamadas al modelo, un único débito al completarse y ninguno si ambas fallan. Las pruebas incluyen la geometría real con textos anonimizados de ambas respuestas y la comprobación del saldo en reintentos. No se modifican permisos ni políticas de suscripción.
