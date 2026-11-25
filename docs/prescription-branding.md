# Logo del doctor y del consultorio

Identidad y firma incluye un editor independiente para el logo personal o el del consultorio activo. Se permite únicamente PNG/JPEG/WebP estático, hasta 5 MB y 20 megapíxeles. La imagen se valida nuevamente en el servidor por su contenido real. El guardado de un logo no exige volver a guardar o reconocer la firma.

La imagen opaca debe prepararse antes de activarse. Un PNG ya transparente puede guardarse directamente. Preparar logo con IA usa Gemini Image para producir una máscara de primer plano; Sharp la aplica sobre los píxeles originales, refina el fondo uniforme y genera un PNG RGBA. No se utiliza una cuadrícula dibujada como sustituto de transparencia. La vista previa permite revisar el texto, bordes y detalles antes del guardado.

Las funciones exportadas en index.js son getPrescriptionBranding, savePrescriptionBranding y preparePrescriptionLogo. El modelo predeterminado para máscaras es gemini-3.1-flash-image, configurable con CLINICAL_LOGO_MODEL. Requiere GEMINI_API_KEY y los secretos de cifrado/autenticación existentes. La preparación está incluida con suscripción; FREE consume un crédito por éxito mediante withAiCredit, con caché cifrada e idempotencia. Guardar un PNG transparente no consume IA ni créditos.

El PNG se almacena en Firebase Storage en una ruta nueva e inmutable por cada versión: prescription-branding/{owner}/{user}/{target}/{uuid}.png. Se crea un registro de activo que verifica dueño, creador, consultorio y destino antes de activarlo; no se aceptan URLs externas ni IDs de otro ámbito. No se sobreescriben o eliminan los logos antiguos porque pueden estar referenciados por recetas ya emitidas. Los logos usan URLs de descarga con token de Storage: son activos de identidad visual, sin datos clínicos ni credenciales.

El logo del consultorio se guarda como doctorsOffice/{doctor}/offices/{office}.logoUrl y tiene prioridad. Como alternativa se utiliza clinical-professionals/{doctor}/users/{emisor}.prescriptionLogoUrl. La emisión conserva el logo en su snapshot cifrado; la vista previa, PDF e impresión usan la misma jerarquía. Guardar identidad conserva el campo del logo. Desactivar el logo afecta solo a futuras recetas.

Permisos: el logo personal requiere lectura/escritura clínica o de recetas; cambiar la marca del consultorio requiere además consultorios:write. Cambiar de consultorio invalida respuestas pendientes del editor. Las imágenes se procesan sin descargar URLs suministradas por el cliente.

Validación: pruebas Angular y Node, prueba real con un logo sintético, y prescription-branding-qa.cjs con respuestas locales que verifica rechazo de PDF, preparación, revisión, guardado por destino, recarga y marca de agua. No se procesaron imágenes de usuarios ni expedientes.

Desplegar las tres funciones nuevas y las actualizadas saveClinicalIdentity, getPrescriptionSettings e issuePrescription; luego publicar Angular. Si se despliegan todas las Functions se incluyen también los auxiliares compartidos. No hay cambios en Android.


## Logos a color en el encabezado

Las diez plantillas muestran simultáneamente el logo del doctor junto al nombre profesional y, si existe, el del consultorio en el extremo derecho. El logo del doctor ocupa un área mayor y conserva prioridad visual; ambos se muestran sin desvanecer. Se conserva además la marca de agua de fondo, con prioridad del consultorio y alternativa del médico. Las miniaturas, la vista previa y el documento emitido comparten estos datos. La composición se verifica en vertical y horizontal, y el PDF usa el mismo encabezado.

Este ajuste de presentación requiere publicar Angular; no incorpora campos nuevos ni funciones de servidor adicionales.
