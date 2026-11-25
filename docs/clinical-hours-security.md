# Horarios y documentos clínicos

Implementación local en Angular y Cloud Functions, 20 noviembre 2026. Sin despliegue ni migración de datos reales.

- Perfil → Consultorios: siete días con apertura/cierre y turnos; separar turnos para comida. Predeterminado 07:00–22:00. El calendario y ambos diálogos de citas filtran fechas/horas y la duración completa. Node valida nuevamente la política del consultorio.
- Formulario compartido de identificación y núcleo clínico para especialidades. Borrador separado de revisión y firma. La nota cerrada queda de solo lectura; admite aclaraciones firmadas independientes.
- Catálogos oficiales, identidad profesional y firma digitalizada. Los catálogos no se simulan: hasta importarlos se permiten borradores, pero se rechaza el cierre que los requiera.
- Expediente con folio visible EXP-códigoConsultorio-fecha-000, independiente del ID interno. Consultas con sufijo C-001. Consecutivo diario, sin reutilizar números del mismo día.
- Inicio: cita actual con búsqueda/vinculación de expediente, creación o atención; guarda motivo y referencia a paciente existente.
- Empleados: contraseña temporal aleatoria por alta/restablecimiento. Solo se muestra al generar y se exige cambiarla al primer acceso. La pantalla /cambiar-contrasena usa sesión válida y contraseña actual. Al cambiarla se revocan dispositivos y se vuelve al login.
- Acceso clínico separado de administración y enfermería; inactividad 15/20/30 minutos. Las notas completas se almacenan solo en RAM del navegador, no en la caché persistente de sincronización.

El backend requiere CLINICAL_DATA_KEY privada en Secret Manager y catálogos oficiales activos. Respaldos, IAM, reglas, migración de expedientes antiguos, protección de adjuntos y validación de interoperabilidad requieren configuración y pruebas en el entorno real. Código preparado no equivale a certificación NOM-024 ni garantía jurídica de cumplimiento NOM-004.

Guía completa de esquema, funciones, comandos, riesgos pendientes y fuentes oficiales: C:/Users/Adolfo/Documents/google_functions/nexus-clinq-go-functions/functions/docs/clinical-hours-security.md.

Fuentes: [NOM-004 oficial](https://sidof.segob.gob.mx/notas/docFuente/5272787), [NOM-024 oficial](https://sidof.segob.gob.mx/notas/docFuente/5280847).
