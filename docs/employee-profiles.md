# Perfiles de empleado y permisos del menú

El formulario ofrece Recepcionista, Ayudante médico y Administrador. Un nuevo registro comienza como Recepcionista. Cambiar el perfil carga sus valores iniciales y conserva nombre, correo, teléfono y consultorios. Abrir un empleado existente conserva sus permisos personalizados; no se restablecen hasta cambiar de perfil o pulsar Restablecer perfil.

Valores iniciales implementados: Recepcionista tiene lectura y escritura en Calendario y Pacientes. Ayudante médico añade Consultorios, Servicios y Nexus IA. Ambos comienzan sin eliminación. Administrador tiene lectura, escritura y eliminación en todos los módulos administrativos y todos los menús principales del sistema. Los checks se pueden personalizar. Activar escritura o eliminación activa también lectura; quitar lectura desmarca las otras acciones para que un menú oculto no deje privilegios aparentes.

Las restricciones clínicas actuales permanecen: estos tres perfiles no convierten automáticamente a un empleado en médico tratante ni enfermería. Expedientes, seguimientos, prescripción clínica y enfermería aparecen como funciones que requieren autorización clínica. Se conservó compatibilidad del servidor con roles clínicos anteriores; el formulario no crea nuevos empleados con esos perfiles. Al editar uno de ellos se muestra su condición de perfil anterior y se pide elegir una de las tres opciones nuevas antes de cambiarlo.

Nexus IA usa su permiso propio `nexusI` en el menú y la ruta /recetas. Se mantiene el acceso anterior de médicos con permisos de recetas. El servicio de digitalización permite `nexusI:write`, conservando el permiso de recetas como compatibilidad. La suscripción y el saldo IA siguen siendo necesarios. Acceder al menú no concede firma ni autoría de notas médicas.

El servidor aplica valores iniciales cuando una creación no envía permisos. En una edición conserva los personalizados si el perfil no cambia. Los permisos enviados explícitamente por el doctor siguen teniendo prioridad y se normalizan; se mantiene el control para que un empleado no conceda permisos que no posee.

Se consultó al usuario si prefiere solo lectura como valor inicial y si desea ampliar el alcance clínico del administrador; mientras no haya otra definición se usan lectura y escritura para los perfiles operativos y se conservan las restricciones clínicas vigentes.

Validación: build correcto, 197 pruebas Angular y 167 Node aprobadas. La prueba employee-permissions-qa.cjs comprueba el build optimizado con servicios simulados: tres opciones de perfil, checks iniciales, cambios personalizados enviados al guardar y una sesión Ayudante que solo muestra los cinco menús previstos y entra a Nexus IA.

Publicar Angular en Hosting. Las funciones modificadas son saveOrUpdateEmployee y generateBlankPrescription; sus nombres HTTP no cambiaron y no hay secretos nuevos. No se realizó despliegue.
