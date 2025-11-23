# ✅ Checklist de Pruebas — Componente `Colegios`

> **Objetivo:** Validar el correcto funcionamiento del flujo completo de gestión del Colegio principal
> (lectura, edición, validación y manejo de errores).

---

## 🧩 1. Pruebas de Carga Inicial

- [✅] **Carga exitosa de datos:**
- Al abrir el componente, los datos del colegio deben mostrarse correctamente.
- El spinner (`LoadingSpinner`) debe visualizarse solo mientras los datos se cargan.
- [✅] **Sin datos disponibles:**
- Si la API no devuelve ningún colegio, se debe mostrar el mensaje de error:
> “No se pudo cargar la información del colegio principal.”
- [X] **Error de conexión:**
- Simular desconexión del backend o endpoint incorrecto → debe aparecer alerta de tipo ❌ *Error de Carga*. - Sale la alerta, pero con un mensaje genérico "Network Error"

---

## ✏️ 2. Pruebas de Modo Edición

- [✅] **Botón “Editar información”:**
- Debe habilitar todos los campos editables excepto `ID`, `registroDane` y `nombre`.
- [X] **Campo enfocado automáticamente:**
- Al hacer clic en “Editar”, el foco debe posicionarse en el primer campo editable (por ejemplo, `email`).
- [✅] **Botón “Cancelar”:**
- Debe revertir todos los cambios realizados en el formulario.
- Debe volver a modo lectura (`isEditing = false`).

---

## ✅ 3. Pruebas de Guardado y Éxito

- [✅] **Actualización exitosa:**
- Modificar un campo válido (ej. `email`) y guardar → debe mostrar alerta verde de éxito.
- El mensaje debe decir:
> “La información de la IE. [nombre] ha sido guardada correctamente.”
- [✅] **Campos no modificados:**
- Si no se modifica ningún campo y se hace clic en “Actualizar”, no deben ocurrir errores ni duplicaciones.

---

## ⚠️ 4. Pruebas de Validaciones de Campos

### Campos requeridos

- [✅] **Campos obligatorios vacíos:**
- Dejar vacío cualquier campo con `*` (por ejemplo, `direccion`, `departamento`, `ciudad`) → debe mostrar alerta ⚠️ de validación.
- [✅ ] **Email inválido:**
- Ingresar texto sin formato válido (`institucion@`) → debe mostrar error ❌.
- [✅] **Contacto corto o largo:**
- Menos de 10 o más de 12 dígitos → debe mostrar error:
> “El número de contacto debe tener entre 10 y 12 dígitos.”
- [✅] **Contacto con letras:**
- Ingresar “310abc1234” → debe mostrar error:
> “El número de contacto solo debe contener dígitos numéricos.”
- [✅] **Cédulas inválidas:**
- `ccSecretaria` o `ccDirector` con letras o más de 15 dígitos → error de validación.
- [✅] **Fechas futuras:**
- Asignar una `fechaResolucion` o `fechaPromocion` posterior al día actual → debe mostrar:
> “La fecha [...] no puede ser posterior a la actual.”

---

## 🔒 5. Pruebas de Autenticación (Token JWT)

- [✅ ] **Token expirado:**
- Eliminar el `userToken` del `localStorage` → debe redirigir al login automáticamente.
- [✅] **Token inválido:**
- Forzar un token incorrecto → la API debe devolver 401 y el frontend mostrar mensaje:
> “Sesión expirada o no autorizada.”

---

## ❌ 6. Pruebas de Errores del Servidor

- [✅] **Error 400 / SequelizeValidationError:**
- Forzar duplicado de campo único (`registroDane`) → alerta ❌ con el mensaje correcto.
- [✅] **Error 404:**
- Simular actualización de un ID inexistente → alerta ❌ con:
> “Colegio no encontrado para actualización.”
- [✅] **Error 500:**
- Desconectar base de datos → debe mostrar mensaje genérico:
> “Error interno del servidor. Por favor, inténtelo más tarde.”

---

## 🔔 7. Pruebas de Alertas (SweetAlert2)

- [✅] **Alertas de éxito:**
- Icono verde (`success`), botón “Aceptar”, texto limpio (sin viñetas).
- [✅] **Alertas de error:**
- Icono rojo (`error`), muestra mensaje del validador (no genérico).
- [✅] **Alertas de advertencia:**
- Icono amarillo (`warning`), se usan para campos requeridos vacíos.
- [✅] **Alertas de confirmación:**
- Mostrar al intentar eliminar o ejecutar acción irreversible (en futuras funciones CRUD).

---

## 🧹 8. Pruebas de UI y UX

- [ ] **Responsividad:**
- Probar en pantallas móviles y tablet (Tailwind grid debe adaptarse correctamente).
- [✅] **Accesibilidad:**
- Todos los `label` están vinculados a sus `input` mediante `name`.
- [✅] **Botones deshabilitados:**
- Mientras `loading = true`, los botones de guardar/cancelar deben estar deshabilitados.
- [✅] **Consistencia visual:**
- Colores coherentes (`#4f46e5`, `#f39c12`, `#e74c3c`) y bordes redondeados (`rounded-lg`).

---

## 🧪 9. Pruebas Unitarias (Vitest / RTL)

- [✅] **Carga inicial (mock API):** muestra spinner → datos del colegio.
- [✅] **Cambio de modo edición:** habilita campos → vuelve a modo lectura al cancelar.
- [✅] **Actualización exitosa:** mock `PUT` → muestra alerta verde.
- [✅] **Validación fallida:** mock `PUT` con 422 → muestra alerta roja con mensaje correcto.
- [✅] **Error de conexión:** mock fallo 500 → muestra alerta genérica.

---

## 📦 10. Pruebas de Integración (Backend + Frontend)

- [✅] **Validaciones coinciden:**
- Los mensajes del backend (`colegioValidator.js`) se muestran idénticos en las alertas.
- [✅] **Persistencia:**
- Los cambios guardados se reflejan en la base de datos (verificar con MySQL Workbench).
- [✅] **Sin duplicados:**
- No se crean múltiples colegios si ya existe uno.

---
