# Dictado de prescripciones

El diálogo Expedir receta permite comenzar/detener el dictado en español de México, revisar su transcripción y generar una lista editable de hasta 20 medicamentos. Utiliza el reconocimiento de voz del navegador, igual que el dictado de notas clínicas; la función recibe texto transcrito, no un archivo de audio. En navegadores sin soporte o sin permiso, se puede escribir o pegar la transcripción. Cerrar el diálogo libera el micrófono. Al abrirlo desde una consulta se detiene el dictado de la nota clínica.

La función `generatePrescriptionFromDictation`, exportada en `src/index.js`, usa Gemini con JSON estructurado y extrae los mismos campos del formulario de receta. Los campos ausentes permanecen vacíos; el servicio no debe inferir principios activos, dosis, unidades ni cantidades. La lista devuelta no se emite ni se guarda como receta automáticamente. El médico puede corregir/eliminar y debe completar los campos y confirmar la emisión.

Requiere permisos prescriptions:write y nexusI:write, alcance del consultorio y sesión válida. Con suscripción activa, el dictado de recetas está incluido aunque el saldo sea cero. En FREE (incluida suscripción vencida), requiere saldo y consume 1 crédito por generación exitosa. Usa el cifrado de solicitudes/respuestas existente y `withAiCredit`: costo de 0 para suscritos y 1 para FREE por resultado válido, reserva liberada al fallar, resultado cifrado e idempotencia por requestId. Angular reutiliza ese identificador para reintentos y no aplica dos veces la misma propuesta. Por defecto añade medicamentos sin perder los existentes; reemplaza solo si se marca explícitamente. La vista previa se actualiza con el formulario.

Desplegar funciones antes de publicar Angular. Secretos existentes: GEMINI_API_KEY y CLINICAL_DATA_KEY, además de los de autenticación. La URL es `https://generateprescriptionfromdictation-o7vmreizjq-uc.a.run.app`, siguiendo el sufijo del proyecto. No se realizaron llamadas reales al modelo durante las pruebas; `prescription-dictation-qa.cjs` usa respuestas y voz simuladas para comprobar loader, varias medicinas, edición, eliminación, vista previa y PDF.


## Modelo de IA

El modelo compartido para dictado de recetas y resumen clínico se configura en `ia/clinical-model.js`: por defecto `gemini-3.8-flash`, con sobreescritura opcional `CLINICAL_TEXT_MODEL`. La clave del proyecto devolvió HTTP 404 para `gemini-2.5-flash` indicando que ya no estaba disponible para usuarios nuevos. Se verificó generación y análisis reales de ambos servicios con texto completamente ficticio usando 3.8 Flash, sin expedientes ni consumo del saldo de usuarios.

El esquema de recetas enviado al proveedor conserva objetos, claves, tipos y campos requeridos, pero omite maxItems para no superar la complejidad admitida por el proveedor. El servidor sigue rechazando más de 20 medicamentos, resultados vacíos o campos inválidos. Un 404 del proveedor se traduce a un error de disponibilidad del modelo (502), sin confundirse con una ruta de Cloud Functions inexistente.

Para este ajuste desplegar `generatePrescriptionFromDictation` y `generateMedicalSummary`. Las URLs actuales fueron verificadas y no necesitan cambiar.


## Formulario simplificado

El editor de medicamentos retira Marca comercial y Cantidad a surtir. La emisión exige nombre (campo genericName, o alias name en la API), dosis, frecuencia y duración en cada medicamento, además de los checks de firma y receta general y las validaciones existentes del paciente y emisor. Forma farmacéutica, concentración, presentación y vía pueden completarse, pero no bloquean la emisión si están vacíos. La vista previa omite sus etiquetas cuando faltan datos. Los registros anteriores conservan la marca o cantidad que ya tenían guardadas.

El dictado mantiene el nombre proporcionado literalmente y no deduce la sustancia activa a partir de una marca. Sus advertencias de campos pendientes se limitan a los cuatro obligatorios del editor. Los controles de permisos, suscripción/créditos, firma, confirmaciones y medicamentos especiales se conservan. El encabezado del diálogo usa título de 18 px y subtítulo a la derecha para reducir altura.

Verificación: prescription-minimal-fields-qa.cjs comprueba cuatro campos requeridos, ausencia de las dos entradas retiradas, checks obligatorios, encabezado compacto y emisión de PDF con datos ficticios. Desplegar issuePrescription y generatePrescriptionFromDictation antes de publicar Angular para alinear las validaciones.
