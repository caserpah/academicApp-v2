# ✅ Pruebas Postman — Módulo Sedes

**Proyecto:** Sistema Académico Escolar
**Versión:** Backend v2.0
**Entidad:** Sede
**Propósito:** Validar el correcto funcionamiento del CRUD de sedes, sus validaciones, permisos y restricciones de integridad referencial.

---

## 🧭 1️⃣ PRUEBAS FUNCIONALES CRUD

| Nº | Método | Endpoint | Descripción | Rol | Resultado esperado |
|----|---------|-----------|-------------|-----|--------------------|
    | 1 | GET | `/api/sedes` | Listar sedes | cualquier usuario autenticado | 200 OK → listado completo. |
    | 2 | POST | `/api/sedes` | Registrar sede válida | **admin** | 201 Created → “La sede fue registrada exitosamente.” |
    | 3 | GET | `/api/sedes/:id` | Obtener sede existente por ID | cualquier usuario autenticado | 200 OK → datos de la sede. |
    | 4 | PUT | `/api/sedes/:id` | Actualizar sede existente | **admin** | 200 OK → “La sede fue actualizada exitosamente.” |
    | 5 | DELETE | `/api/sedes/:id` | Eliminar sede sin dependencias | **admin** | 200 OK → “La sede fue eliminada exitosamente.” |

---

## 🧮 2️⃣ PRUEBAS DE VALIDACIÓN DE DATOS

| Nº | Caso | Método | Campo | Objetivo | Resultado esperado |
|----|-------|---------|--------|-----------|--------------------|
    | 6 | Crear sin `codigo` | POST | codigo | Requerido | 422 → “Debe ingresar el código de la sede.” |
    | 7 | `codigo` con símbolos | POST | codigo | Solo alfanumérico | 422 → “El código de la sede solo puede contener caracteres alfanuméricos.” |
    | 8 | Código duplicado | POST | codigo | Unicidad global | 409 → “Ya existe una sede con el código SD001.” (o similar) |
    | 9 | Sin `nombre` | POST | nombre | Requerido | 422 → “Debe ingresar el nombre de la sede.” |
    | 10 | `nombre` con caracteres inválidos | POST | nombre | Solo letras | 422 → “El nombre de la sede solo puede contener letras y espacios.” |
    | 11 | Sin `direccion` | POST | direccion | Requerido | 422 → “Debe ingresar la dirección de la sede.” |
    | 12 | `contacto` < 10 dígitos | POST | contacto | Validar longitud | 422 → “El Teléfono de contacto debe tener entre 10 y 12 dígitos.” |
    | 13 | Nombre vacío en UPDATE | PUT | nombre | No aceptar "" | 422 → “Ingrese el nombre de la sede si desea actualizarlo.” |
    | 14 | Código duplicado en UPDATE | PUT | codigo | Validación de unicidad | 409 → “Ya existe una sede con el código …” |

---

## 🔐 3️⃣ PRUEBAS DE ACCESO Y PERMISOS

| Nº | Método | Endpoint | Acción | Rol | Resultado |
|----|---------|-----------|---------|-----|----------|
    | 15 | POST | `/api/sedes` | Crear sede | docente/coordinador | 403 → “No tienes permiso para realizar esta acción.” |
    | 16 | PUT | `/api/sedes/:id` | Actualizar sede | docente | 403 Forbidden |
    | 17 | DELETE | `/api/sedes/:id` | Eliminar sede | coordinador | 403 Forbidden |
    | 18 | GET | `/api/sedes` | Listar sedes | cualquier usuario autenticado | 200 OK |
    | 19 | GET | `/api/sedes/:id` | Ver detalle sede | cualquier usuario autenticado | 200 OK |

---

## 🔗 4️⃣ PRUEBAS DE INTEGRIDAD REFERENCIAL

> Estas pruebas aplican si la sede ya tiene **grupos, cargas, matrículas o coordinadores-sedes** asociados.

| Nº | Método | Endpoint | Escenario | Resultado esperado |
|----|---------|-----------|------------|--------------------|
    | 20 | DELETE | `/api/sedes/:id` | Intentar eliminar sede con dependencias | 409 Conflict → “No puedes eliminar esta sede porque tiene registros asociados.” |

---

## 🧹 5️⃣ PRUEBAS ADICIONALES DE ROBUSTEZ

| Nº | Método | Endpoint | Escenario | Resultado esperado |
|----|---------|-----------|------------|--------------------|
    | 21 | GET | `/api/sedes/9999` | Buscar sede inexistente | 404 → “No se encontró la sede solicitada.” |
    | 22 | PUT | `/api/sedes/9999` | Actualizar sede inexistente | 404 Not Found |
    | 23 | DELETE | `/api/sedes/9999` | Eliminar sede inexistente | 404 Not Found |

---

## 🧠 6️⃣ VERIFICACIONES POST-EJECUCIÓN

Después de completar todas las pruebas:

1. En la base de datos solo existen sedes válidas.
2. Ningún código está duplicado.
3. Todas las sedes tienen asignado automáticamente un `colegioId` válido.
4. No existen sedes con dependencias eliminadas incorrectamente.
5. Los nombres no contienen símbolos.
6. Los contactos no contienen valores fuera del rango permitido.

---

## 📋 RESULTADO GLOBAL ESPERADO

| Estado | Significado |
|---------|--------------|
| ✅ Validaciones coherentes y mensajes naturales. |
| 🔒 Solo **admin** puede crear, actualizar o eliminar sedes. |
| 🧩 No se permiten códigos duplicados entre sedes. |
| 🛡️ `colegioId` no puede ser modificado por el usuario. |
| 💬 Respuestas de éxito con “exitosamente”. |

---

**QA responsable:** ______________________
**Fecha de prueba:** ______________________
**Firma:** ________________________________