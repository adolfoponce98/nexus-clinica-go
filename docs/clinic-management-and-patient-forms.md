# Formularios de paciente y gestión de consultorios

Cambios locales del 21 de noviembre de 2026. No se desplegaron servicios ni se modificaron datos reales.

## Paciente

El formulario compartido de identificación conserva cinco secciones, con campos agrupados e iconos. En este registro son obligatorios solo los tres campos señalados con asterisco: nombre(s), apellido paterno y fecha de nacimiento. Sexo, domicilio, contacto, antecedentes y signos vitales pueden quedar vacíos. Los valores opcionales capturados sí deben respetar su formato y los rangos existentes. Las validaciones posteriores para cerrar una nota clínica no se modificaron.

La revisión de campos muestra un diálogo centrado, enumera los errores reales y lleva al campo elegido. Los errores de guardado de los contenedores que usan este formulario también se envían al diálogo. México es la única opción del selector de país; al elegirlo se habilitan las 32 entidades. Se conserva la información al navegar entre pestañas y los signos no capturados se omiten del borrador clínico.

## Consultorios

`deactivateOffice` es una función HTTP nueva, exportada en `functions/src/index.js`. Requiere permiso de eliminación y valida doctor y consultorio con la sesión. Marca `active:false`, `status:disabled`, `disabledAt` y `disabledBy`; registra auditoría, avanza la versión de consultorios y descuenta una sola plaza del consumo de consultorios activos. Los pacientes y demás registros clínicos permanecen intactos.

`getDoctorsOffice` devuelve únicamente consultorios activos al propietario y a empleados. El inicio de sesión con código de un consultorio inactivo se rechaza; los ámbitos de dispositivos omiten consultorios inactivos. La programación de citas y la creación de registros comprueban también su estado. La edición ordinaria no puede reactivar un consultorio ni sobrescribir los campos de estado. No se creó una función de reactivación ni se cancelaron automáticamente las citas históricas.

La advertencia de la interfaz explica que los pacientes, expedientes y citas se conservan, pero que podrían dejar de ser accesibles desde las vistas habituales al perder la selección del consultorio. La interfaz elimina el elemento únicamente después de la respuesta del servidor. Si era el consultorio seleccionado, se elige otro disponible o se limpia la selección y la caché asociada.

El menú lateral y la pestaña Consultorios del perfil comparten ahora una sola implementación. El editor solicita una apertura, un cierre, días seleccionados y un periodo de comida opcional. Se guarda el formato `officeHours.version:1` de siete días ya utilizado por los calendarios: mismos periodos en días seleccionados y días cerrados en los demás. Se validan apertura anterior a cierre y comida completamente dentro del horario. No se sobrescribe un horario antiguo diferente por día solo por abrirlo; se muestra una nota y el horario general se aplica al modificar el editor. Sin configuración se mantiene el valor existente por defecto, 07:00 a 22:00.

## Despliegue

Desde el proyecto Node.js se recomienda desplegar todas las funciones porque se modificaron helpers compartidos de consultorios, horarios y autenticación:

```powershell
firebase deploy --only functions
```

En el proyecto Angular:

```powershell
npm run build
firebase deploy --only hosting
```

Las nuevas rutas de API usan el sufijo `-o7vmreizjq-uc.a.run.app`.

## Verificación

189 pruebas Angular y 166 Node aprobadas. El build de producción compila sin errores; siguen existiendo advertencias de tamaño CSS y dependencias CommonJS. La prueba Chrome `patient-offices-qa.cjs` usa el build optimizado y servicios simulados bajo el origen HTTPS: guarda solo los tres datos obligatorios, valida datos opcionales, verifica los 32 estados y las cinco pestañas, guarda el horario común con comida, cancela una eliminación sin efectos y confirma que el consultorio deshabilitado no reaparece al recargar. Ver capturas en `patient-offices-qa`.
