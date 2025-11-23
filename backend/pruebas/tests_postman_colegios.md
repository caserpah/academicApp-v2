# ✅ Pruebas Postman — Módulo Colegios

**Proyecto:** Sistema Académico Escolar
**Versión:** Backend v2.0
**Entidad:** Colegio
**Propósito:** Verificar el correcto funcionamiento del CRUD de colegios, sus validaciones, permisos y relaciones.

---

## 🧭 1️⃣ PRUEBAS FUNCIONALES CRUD

| Nº | Método | Endpoint | Descripción / Objetivo | Rol | Resultado esperado |
|----|---------|-----------|------------------------|-----|--------------------|
| 1 | GET | `/api/colegios` | Obtener la lista de colegios registrados. | cualquier usuario autenticado | 200 OK → listado completo. |
| 2 | POST | `/api/colegios` | Crear un colegio válido. | **admin** | 201 Created → “El colegio fue registrado exitosamente.” |
| 3 | GET | `/api/colegios/:id` | Consultar colegio existente por ID. | cualquier usuario autenticado | 200 OK → “Información del colegio obtenida exitosamente.” |
| 4 | PUT | `/api/colegios/:id` | Actualizar nombre, contacto y correo. | **admin** | 200 OK → “El colegio fue actualizado exitosamente.” |
| 5 | DELETE | `/api/colegios/:id` | Eliminar colegio sin sedes asociadas. | **admin** | 200 OK → “El colegio fue eliminado exitosamente.” |

---

## 🧮 2️⃣ PRUEBAS DE VALIDACIÓN DE DATOS

| Nº | Caso | Método | Campo | Objetivo | Resultado esperado |
|----|-------|---------|--------|-----------|--------------------|
| 6 | Crear sin `registroDane` | POST | registroDane | Requerido. | 422 → “Debe ingresar el registro DANE del colegio.” |
| 7 | Duplicar `registroDane` | POST | registroDane | Validar unicidad. | 409 → “Ya existe un colegio con el registro DANE COL12345.” |
| 8 | `registroDane` con símbolos | POST | registroDane | Formato alfanumérico. | 422 → “El registro DANE solo puede contener caracteres alfanuméricos.” |
| 9 | Sin `nombre` | POST | nombre | Requerido. | 422 → “Debe ingresar el nombre del colegio.” |
| 10 | `email` inválido | POST | email | Validar formato. | 422 → “Debe ingresar un correo electrónico válido para el colegio.” |
| 11 | `contacto` < 10 dígitos | POST | contacto | Validar longitud. | 422 → “El Teléfono de contacto debe tener entre 10 y 12 dígitos.” |
| 12 | Sin `direccion`, `ciudad` o `departamento` | POST | - | Requeridos. | 422 → “Debe ingresar la dirección / ciudad / departamento del colegio.” |
| 13 | `fechaResolucion` futura | POST | fechaResolucion | No futura. | 422 → “La fecha de resolución no puede ser posterior a la actual.” |
| 14 | `fechaPromocion` futura | POST | fechaPromocion | No futura. | 422 → “La fecha de promoción no puede ser posterior a la actual.” |
| 15 | `email` inválido (update) | PUT | email | Validar formato. | 422 → “Debe ingresar un correo electrónico válido para el colegio.” |
| 16 | `registroDane` duplicado (update) | PUT | registroDane | Validar unicidad. | 409 → “Ya existe un colegio con el registro DANE COL12345.” |

---

## 🔐 3️⃣ PRUEBAS DE ACCESO Y PERMISOS

| Nº | Método | Endpoint | Acción | Rol | Resultado esperado |
|----|---------|-----------|---------|-----|--------------------|
| 17 | POST | `/api/colegios` | Crear colegio | docente / coordinador | 403 → “No tienes permiso para realizar esta acción.” |
| 18 | PUT | `/api/colegios/:id` | Actualizar colegio | docente | 403 Forbidden. |
| 19 | DELETE | `/api/colegios/:id` | Eliminar colegio | coordinador | 403 Forbidden. |
| 20 | GET | `/api/colegios` | Listar colegios | docente | 200 OK. |
| 21 | GET | `/api/colegios/:id` | Consultar colegio | docente | 200 OK. |

---

## 🔗 4️⃣ PRUEBAS DE INTEGRIDAD REFERENCIAL

| Nº | Método | Endpoint | Escenario | Resultado esperado |
|----|---------|-----------|------------|--------------------|
| 22 | DELETE | `/api/colegios/:id` | Eliminar colegio con sedes asociadas | 409 Conflict → “No puedes eliminar este colegio porque tiene sedes registradas.” |

---

## 🧹 5️⃣ PRUEBAS ADICIONALES DE ROBUSTEZ

| Nº | Método | Endpoint | Escenario | Resultado esperado |
|----|---------|-----------|------------|--------------------|
| 23 | GET | `/api/colegios/9999` | ID inexistente | 404 → “No se encontró el colegio solicitado.” |
| 24 | PUT | `/api/colegios/9999` | Actualizar inexistente | 404 Not Found. |
| 25 | DELETE | `/api/colegios/9999` | Eliminar inexistente | 404 Not Found. |

---

## 🧠 6️⃣ VERIFICACIONES POST-PRUEBA

1. En la base de datos solo existen colegios creados correctamente.
2. Ningún `registroDane` está repetido.
3. Los campos `fechaResolucion` y `fechaPromocion` son anteriores o iguales a la fecha actual.
4. Ningún colegio activo tiene sedes asociadas eliminadas indebidamente.

---

## 📋 RESULTADO GLOBAL ESPERADO

| Estado | Significado |
|---------|--------------|
| ✅ Todas las validaciones devuelven mensajes naturales y claros. |
| 🔒 Solo **admin** puede crear, actualizar o eliminar colegios. |
| 🧩 No se permite eliminar colegios con sedes asociadas. |
| 💬 Todos los mensajes usan la palabra “exitosamente” en casos positivos. |

---

**QA responsable:** ______________________
**Fecha de prueba:** ______________________
**Firma:** ________________________________