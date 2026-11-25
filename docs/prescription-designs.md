# Plantillas de receta

Los diez estilos usan Roboto alojada en `public/fonts` con su licencia OFL, líneas finas, colores discretos y membretes diferentes. El selector Vertical/Horizontal guarda `prescriptionSettings.orientation` junto a la plantilla del consultorio, con el mismo control de revisión y permisos.

`getPrescriptionSettings`, `savePrescriptionSettings`, `issuePrescription` y `getIssuedPrescription` usan el núcleo actualizado. Cada emisión conserva orientación y `header.office.logoUrl` en su registro cifrado. Los documentos sin orientación se muestran en vertical. El logo se toma de `logoUrl` o `logo` del consultorio, se muestra al 4.5 % de opacidad y se omite si no existe o no se puede cargar; no se inventa un logo. Las imágenes remotas deben permitir CORS para incluirse en el PDF.

La vista previa escala la hoja completa al espacio disponible. El PDF usa Carta vertical u horizontal real, conserva QR y firma y permite varias páginas para tratamientos extensos. La impresión desde el visor respeta la orientación del documento emitido.

Verificación: pruebas Angular/Node y `prescription-design-qa.cjs`, que sirve la compilación local con respuestas ficticias, revisa las diez plantillas y genera un PDF horizontal real sin llamar a producción.

Publicar Angular y desplegar las cuatro funciones de recetas anteriores.


## Composiciones diferenciadas

Cada diseño conserva el mismo contenido y tiene una composición propia de encabezado, metadatos y pie. Océano usa membrete institucional y pie clásico; Esmeralda adelanta la fecha y coloca el QR a la izquierda; Editorial centra la identidad y apila firma y QR; Índigo inicia con el folio y lleva el contacto al pie; Terracota sitúa el logo junto al lado derecho del nombre y usa un pie asimétrico; Grafito usa cabecera en bloque y folio al final; Botánica enmarca la hoja y la verificación; Rosa usa cabecera y firma en tarjetas suaves; Zafiro coloca la emisión en una franja superior y el QR a la izquierda; Ámbar deja el membrete abierto y el contacto al final.

Solo Océano (`ocean`), Índigo (`indigo`) y Botánica (`botanical`) muestran el logo del consultorio. Editorial (`editorial`) y Grafito (`graphite`) no muestran marca de agua. Las otras plantillas utilizan el logo del doctor en su marca de agua, evitando mostrar el del consultorio fuera de los tres diseños permitidos. El logo del doctor permanece junto a su identidad en todas cuando está disponible.

Las reglas están en `prescription-templates.ts` y se comparten entre miniaturas, vista previa y emisión. `prescription-paper.css` contiene la base común para la hoja, el visor de impresión y el clon usado al generar PDF; el componente conserva las variantes. Los cortes de páginas se calculan según el orden visual de los bloques. No se aumentaron los presupuestos de compilación.

Verificación visual: `prescription-layouts-qa.cjs` revisa las veinte combinaciones, guarda capturas y métricas, y genera un PDF horizontal con datos ficticios. Este ajuste requiere publicar Angular.
