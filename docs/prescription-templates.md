# Diez plantillas de recetas por consultorio

Implementación local, 20 noviembre 2026. No desplegada a Firebase.

En /recetas → Receta Médica Oficial se abre la galería. Diseños: Océano clínico, Esmeralda, Editorial, Índigo moderno, Terracota, Grafito, Botánica, Rosa cuarzo, Zafiro y Ámbar. Son composiciones distintas (cabecera, lateral, marco, tipografía, contraste y distribución), no únicamente cambios de color.

La vista previa usa nombre y credenciales reales del usuario autenticado, su identidad clínica guardada y el consultorio activo. Los datos faltantes se indican como pendientes; paciente, medicamentos e indicaciones están claramente marcados como ejemplos sin validez para surtir. No se coloca una firma ficticia ni un folio real a la vista previa.

## Selección y datos

El botón Usar como predeterminada persiste en `doctorsOffice/{idDoctor}/offices/{idConsultorio}.prescriptionSettings` los campos `templateId`, `revision`, `updatedAt`, `updatedBy`. La revisión impide sobrescribir cambios de otro dispositivo. Al cambiar de consultorio se recarga la configuración y se descartan respuestas tardías del consultorio previo. Por defecto se usa ocean para consultorios sin selección anterior.

La institución educativa y profesión se completan en Identidad y firma clínica del Perfil. No se muestra ese formulario en la pantalla de plantillas. La imagen de firma no se entrega en la respuesta de configuración de plantilla: se incorpora al documento al emitir desde la identidad guardada del profesional. El consultorio aporta domicilio, teléfono principal y contacto. El sistema no verifica la cédula contra SEP ni puede comprobar automáticamente que un domicilio libre esté completo: el profesional debe revisar esos datos.

## Pantalla simplificada y QR

La galería solo contiene diseños y selección predeterminada. Se retiraron los formularios de identidad y de nueva receta, el botón de crear receta y la sección duplicada Consultorio actual. La consulta por folio está arriba de las plantillas y también permite pegar el contenido cifrado de un QR.

Las diez vistas previas llevan un QR con el texto CLINICA_GO_QR_DE_PRUEBA_SIN_VALIDEZ, sin datos de expedientes ni recetas reales. El QR aparece al final, junto a la firma en el pie del documento.

Para emisión real, issuePrescription requiere idPaciente de un expediente existente en el consultorio y valida expedienteId si se proporciona. El servicio crea el QR con idExpediente e idReceta internos, además de doctor, consultorio y paciente para aislar su alcance. Todo el conjunto se cifra en servidor mediante AES-256-GCM con CLINICAL_DATA_KEY y un contexto criptográfico exclusivo. El navegador solo convierte el contenido opaco CG-RX1:… en imagen QR; no recibe la clave privada.

El QR se conserva dentro del snapshot firmado y cifrado de la receta. getIssuedPrescription acepta folio o qrData, comprueba sesión/permisos/consultorio, autentica el cifrado y verifica que el expediente y receta coincidan con el documento original. No es un QR público con datos de pacientes ni una URL anónima de consulta.

Las recetas históricas sin referencia a expediente mantienen su contenido original y se consultan por folio; no se inventan identificadores ni se modifica su firma para añadir un QR. La galería no captura ni emite nuevas recetas. La emisión contextual se abre desde el expediente o desde Nueva consulta con la referencia validada del paciente.

Se mantienen folios únicos, idempotencia, contenido inmutable, retención de al menos cinco años, auditoría de emisión/lectura/impresión y snapshots de plantilla e identidad profesional. Cambiar la plantilla predeterminada no cambia documentos emitidos.

## Permisos y alcance normativo

Se requieren permisos prescriptions:read/write y rol clínico de médico para empleados. La recepción no obtiene acceso por tener permisos de pacientes. El cambio de plantilla requiere escritura. El formulario de identidad deshabilita edición a usuarios con solo lectura.

La firma digitalizada es una imagen reconocida y vinculada a una sesión autenticada; no es e.firma ni firma electrónica avanzada certificada. La estructura y sello técnico no garantizan por sí solos validez legal o cumplimiento integral. Revisar el mecanismo de firma y el flujo de dispensación aplicable antes del uso clínico real.

La emisión genérica no sustituye controles de estupefacientes/psicotrópicos ni recetarios especiales. El servicio rechaza medicamentos declarados controlados o fracciones I/II. La clasificación no se infiere de texto libre ni se valida contra una base farmacológica autorizada: la declaración y selección deben ser revisadas por el prescriptor. No se implementó receta especial COFEPRIS.

Fuentes oficiales consultadas:

- [Reglamento de Insumos para la Salud, artículos 29–31](https://www.ordenjuridico.gob.mx/Documentos/Federal/html/wo88318.html).
- [Acciones Esenciales para la Seguridad del Paciente](https://sidof.segob.gob.mx/notas/docFuente/5496728): indicaciones claras y sin abreviaturas ambiguas.
- [Sistema COFEPRIS de recetarios electrónicos de Fracción I](https://www.gob.mx/cofepris/es/acciones-y-programas/sistema-de-recetarios-electronicos-para-medicamentos-de-fraccion-i).

## Despliegue

Nuevas funciones: getPrescriptionSettings, savePrescriptionSettings, issuePrescription, getIssuedPrescription; ya exportadas en functions/src/index.js. También cambió saveClinicalIdentity y la validación compartida de permisos/identidad. Las URLs centralizadas usan el sufijo -o7vmreizjq-uc.a.run.app; verificar las URLs reales al desplegar.

Desde C:/Users/Adolfo/Documents/google_functions/nexus-clinq-go-functions:

```powershell
firebase deploy --only functions --project clinq-go
```

Se requiere CLINICAL_DATA_KEY ya configurada en Secret Manager para emisión y lectura de recetas, además de los secretos de autenticación existentes. Desplegar el backend antes del Angular actualizado. No se crearon secretos, funciones remotas ni registros reales durante este cambio.

## Validación local

- 128 pruebas Angular aprobadas y compilación de producción correcta.
- 103 pruebas Node.js aprobadas; ocho de recetas cubren aislamiento, concurrencia, emisión, integridad, permisos, idempotencia y QR cifrados de recetas.
- Navegador Chrome aislado con todas las llamadas a servicios interceptadas: diez diseños sin desbordamiento ni solapamiento del aviso de ejemplo; 1280 px sin desbordamiento horizontal; cambio de consultorio recupera su plantilla; PDF generado con datos ficticios; sin errores de JavaScript en esa revisión.
- Capturas internas en prescription-qa. No se validó dispensación real, identidad profesional con SEP, firma avanzada ni certificación regulatoria.

Actualización de distribución: Chrome a 1280 px comprobó ausencia de formularios retirados y de Consultorio actual duplicado, consulta antes de la galería, diez diseños, imagen QR cargada al final y ausencia de errores de JavaScript o desbordamiento horizontal. No se validó lectura óptica con cámara física.

Para activar los QR reales se deben volver a desplegar issuePrescription y getIssuedPrescription, además del Angular actualizado. No hay una función pública nueva ni se realizaron despliegues en esta actualización.


## Emisión desde expediente y Nueva consulta

El botón **Expedir receta** abre `PrescriptionComposerComponent` en un diálogo amplio, sin navegar fuera del borrador de consulta. Consulta el expediente, la plantilla activa del consultorio y la identidad/firma guardadas. El formulario permite hasta 20 medicamentos estructurados; la vista previa muestra datos reales y un QR de prueba identificado como borrador. El QR definitivo lo entrega `issuePrescription`, junto con el snapshot inmutable y el folio.

Desde el expediente se emite y descarga el PDF. Desde Nueva consulta (general/traumatología y odontología), se genera el PDF y se utiliza `getSignedUploadUrl` + PUT al bucket existente, con `idConsultorio`, `idPatient`, `idExpedient` e `idFollowups` correspondiente al requestId de la consulta. La respuesta se incorpora a `uploadedFiles` como documento terminado; el guardado habitual de la consulta persiste su referencia en `attachedDocumentsUrls`. Hay que guardar la consulta para conservar ese vínculo, como sucede con el resto de sus adjuntos. La receta emitida ya queda conservada independientemente del borrador.

La generación espera al QR y a las imágenes, captura la plantilla a un ancho estable, comprime el PDF y mantiene medicamentos/firma/QR juntos al paginar cuando su tamaño lo permite. Un error de PDF o de carga permite reintentar con la receta ya emitida sin volver a emitirla. Un error de transporte durante la emisión conserva exactamente la misma solicitud idempotente. La subida firmada no envía cookies ni Bearer al almacenamiento. No se agregan endpoints ni cambios Node.js para este flujo; usa las funciones de recetas y adjuntos ya implementadas.

Validación de esta integración: pruebas de emisión, permisos, cambio de consultorio, carga y reintento; Chrome con servicios simulados confirmó ambos accesos, PDF con firma y QR, y documento cargado dentro de los adjuntos de Nueva consulta. Sin registros ni emisiones reales durante las pruebas.
