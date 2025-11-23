# ✅ Checklist de Verificación – Módulo **Sedes**

## ⚙️ 1. Configuración y Carga Inicial

- [✅] El backend está en ejecución (`npm run dev` o `node server.js`).
- [✅ ] La tabla `sedes` existe en la base de datos con sus relaciones a `colegios`.
- [✅ ] La función `syncModels()` se ejecuta al iniciar el servidor y registra las asociaciones correctamente.
- [✅ ] Al cargar el componente **Sedes**, se muestran los datos existentes sin errores.
- [✅ ] Si el servidor está detenido, se muestra la alerta amigable:
  > “No se pudo conectar con el servidor. Por favor, verifique su conexión o intente más tarde.”

---

## 🏫 2. Creación de Sedes

- [✅ ] Todos los campos requeridos (`código`, `nombre`, `dirección`, `colegioId`) son obligatorios.
- [✅] El campo `contacto` acepta solo números, de **10 a 12 dígitos**.
- [✅] Si se deja vacío el `contacto`, no genera error (campo opcional).
- [ ] Al guardar una nueva sede válida:
  - [✅] Se muestra la alerta de éxito “Sede creada exitosamente.”
  - [✅] La tabla de sedes se actualiza inmediatamente sin recargar la página.
- [✅] Si el código ya existe, se muestra el mensaje del validador:
  > “El código de la sede ya está en uso.”

---

## ✏️ 3. Edición de Sedes

- [✅] Al presionar el ícono ✏️ se cargan los datos de la sede seleccionada en el formulario.
- [✅] Los cambios se pueden modificar y guardar correctamente. - Si se deja vacío el contacto, lo pasa por alto.
- [✅] Se muestra la alerta de éxito:
  > “Sede [nombre] actualizada exitosamente.”
- [✅] Si hay errores de validación (por ejemplo, código con caracteres no alfanuméricos), se muestran mensajes claros:
  > “El código de la sede solo debe contener caracteres alfanuméricos.”

---

## ❌ 4. Eliminación de Sedes

- [✅] Al presionar el ícono 🗑️ se muestra el cuadro de confirmación con:
  > “¿Está seguro de eliminar la sede [nombre]? Esta acción no se puede deshacer.”
- [✅] Si el usuario confirma:
  - [✅] Se elimina la sede en el backend.
  - [✅] Se actualiza la tabla en el frontend sin recargar la página.
  - [✅] Se muestra la alerta de éxito:
    > “La sede ha sido eliminada correctamente.”
- [✅] Si el usuario cancela, no ocurre ninguna acción.

---

## ⚠️ 5. Manejo de Errores

- [✅] Si el backend responde con validaciones (`422`), el mensaje mostrado proviene del validador (`sedeValidator.js`).
- [✅] Si ocurre un error del servidor (`500`), se muestra:
  > “Error interno del servidor. Por favor, inténtelo más tarde.”
- [❌] Si el backend no está disponible, el mensaje mostrado es:
  > “No se pudo conectar con el servidor. Verifique su conexión o intente más tarde.”

---

## 💄 6. Interfaz y UX

- [✅] El formulario mantiene el mismo estilo visual que el componente **Colegios**.
- [✅] Los campos bloqueados (`id`, `colegioId`) se muestran en gris con `cursor-not-allowed`.
- [✅] Los campos muestran `placeholder` explicativos.
- [✅] Los botones tienen hover y transiciones suaves.
- [✅] El formulario y la tabla son totalmente **responsive** (se adaptan bien a pantallas medianas y pequeñas).

---

## 📊 7. Código y Arquitectura

- [✅] El código está modularizado:
  - `Sedes.jsx` → lógica de negocio y render principal.
  - `SedesForm.jsx` → formulario reutilizable.
  - `sedesService.js` → comunicación con API.
- [✅] `notifications.js` se usa para todas las alertas y confirmaciones.
- [✅] Se usan los mismos helpers globales que el módulo **Colegios**:
  - `LoadingSpinner`
  - `showNotification`, `showConfirm`, etc.
- [✅] Los mensajes de error y éxito mantienen un tono consistente y profesional.

---

## 🧪 8. Pruebas Extras (QA Opcional)

- [✅] Crear una sede, editarla, eliminarla y volver a crearla con el mismo código (verificar validaciones únicas).
- [✅] Intentar guardar una sede con el backend apagado (alerta de conexión).
- [✅] Cambiar entre módulos **Colegios** y **Sedes** sin errores en consola.
- [✅] Confirmar que los datos persisten tras recargar el navegador.

---

**Versión:** 1.0
**Autor:** Equipo de Desarrollo – AcademicApp
**Fecha:** _(actualiza según revisión)_