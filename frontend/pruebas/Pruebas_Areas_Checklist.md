# 🧪 Checklist de pruebas — Módulo de Áreas Académicas

## 🧩 1. Carga inicial y estructura
- [X] La tabla carga correctamente las áreas existentes.
- [X] El spinner de “Cargando áreas…” aparece brevemente.
- [X] La paginación muestra correctamente el número total de registros y páginas.
- [X] El formulario inicia limpio, con “Guardar Área” visible.
- [X] Los campos “Código” y “Abreviatura” convierten automáticamente a mayúsculas.

---

## 🧠 2. Validaciones del formulario
- [X] Al dejar campos vacíos, aparece una **alerta amarilla** de advertencia.
- [X] Código con menos de 2 o más de 5 caracteres → alerta amarilla de validación.
- [X] Abreviatura con menos de 2 o más de 4 caracteres → alerta amarilla de validación.
- [X] Espacios en blanco se eliminan automáticamente en “Código” y “Abreviatura”.
- [X] “Nombre” con solo espacios → no se permite guardar.

---

## ⚙️ 3. Operaciones CRUD
### 🟢 Crear
- [x] Al crear un área nueva → alerta verde de éxito.
- [X] La tabla se actualiza sin recargar la página.
- [X] El formulario se limpia y vuelve al modo crear.

### 🟡 Editar
- [X] Al presionar ✏️, el formulario se llena con los datos del registro.
- [ ] Guardar cambios muestra alerta verde y actualiza la tabla.
- [ ] Después de guardar, el formulario vuelve al modo crear.

### 🔴 Eliminar
- [X] Al presionar 🗑️, aparece confirmación de eliminación.
- [X] Confirmar → muestra alerta verde y elimina el registro.
- [X] La tabla se actualiza automáticamente.
- [X] Si se estaba editando el registro eliminado → el formulario se limpia.

---

## 🔄 4. Paginación
- [X] Los botones ⏮️ ◀️ ▶️ ⏭️ funcionan correctamente.
- [X] El número de página actual se resalta en azul.
- [X] Al eliminar el último registro de una página → retrocede una página automáticamente.
- [X] El conteo “Mostrando X a Y de Z resultados” es correcto.

---

## 🔐 5. Seguridad y errores
- [ ] Si el token JWT no está presente o es inválido → muestra “Sesión expirada o no autorizada”.
- [ ] Intentar crear una área con **código duplicado** → alerta roja con mensaje de conflicto.
- [ ] Intentar crear una área con **abreviatura duplicada** → alerta roja con mensaje de conflicto.
- [X] Apagar el backend → muestra “Error de conexión o respuesta inesperada del servidor”.

---

## 💡 6. Experiencia de usuario
- [X] Mientras se envía una petición, los botones “Guardar” y “Cancelar” se deshabilitan.
- [X] Se muestra el ícono de **spinner** durante las operaciones.
- [X] Al limpiar o cancelar, el foco vuelve al campo “Código”.
- [X] La interfaz no sufre saltos ni duplicaciones visuales.
- [X] El modo edición/cancelación cambia correctamente entre “Guardar Área” y “Guardar Cambios”.
