# Firma y logo desde Nexus IA

Recetas y Formatos Clínicos muestra cinco cards: Receta Médica, Cargar Recetario a Digitalizar, Firma Digitalizada, Digitalizar Logo e Importar Expediente Físico.

Firma Digitalizada abre ClinicalAssetDialogComponent con ClinicalIdentityComponent en presentación signature. Reutiliza la misma carga, validación, dibujo de firma, consentimiento, permisos y el endpoint SAVE_CLINICAL_IDENTITY del perfil; no usa el antiguo digitalizador o la subida de firma con payload distinto. Los datos profesionales completos del perfil se cargan por el mismo servicio y se conservan en el guardado existente. Se mantienen las validaciones y requisitos del perfil profesional.

Digitalizar Logo abre el mismo contenedor de diálogo con PrescriptionBrandingComponent. Reutiliza su selección de doctor/consultorio, eliminación de fondo, créditos, vista previa y endpoints actuales. Guardar desde un diálogo se refleja al volver a abrir Identidad y firma. No se duplican funciones de backend ni políticas de permisos.

Los diálogos se muestran centrados en el overlay de Angular Material, con altura limitada, desplazamiento interno, cierre accesible y bloqueo del cierre mientras el editor guarda o prepara una imagen. La lista de Nexus IA permanece detrás del diálogo.

Verificación: pruebas de componentes y nexus-assets-dialog-qa.cjs, que usa datos y servicios simulados para comprobar cinco cards, carga/guardado de firma, preparación/guardado de logo, persistencia al abrir el perfil y centrado en pantalla de laptop. No se cambió el backend para esta integración. Publicar Angular.
