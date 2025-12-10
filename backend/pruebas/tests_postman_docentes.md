# 📋 Checklist Profesional de Pruebas – Módulo Docentes

## 📝 Información general
- **Módulo:** Docentes
- **Versión:** Profesional
- **Ámbito:** API REST (CRUD completo)
- **Autenticación:** Bearer Token obligatorio
- **Permisos:**
- GET: cualquier usuario autenticado
- POST/PUT/DELETE: solo administradores (`restrictTo(["admin"])`)

---

# 1️⃣ Pruebas de Listado – `GET /docentes`

## ✔ Casos Positivos
- [X] Listar docentes sin filtros → retorna 200
- [X] Respuesta incluye:
- [X] `success = true`
- [X] `data.items` (array)
- [X] `data.pagination` con `page`, `limit`, `total`
- [X] Funciona la paginación con `?page=1&limit=10`
- [X] Funciona el ordenamiento con `?orderBy=nombre&order=ASC`
- [X] Filtrado por nombre parcial (`?nombre=carl`)
- [X] Filtrado por documento exacto (`?documento=123`)
- [X] Filtrado por área (`?areaId=2`)
- [X] Filtrado por estado activo/inactivo (`?activo=true`)

## ❌ Casos Negativos
- [X] Enviar `orderBy` inválido → debe retornar 400
- [X] Enviar `limit` no numérico → debe retornar 400
- [X] Token faltante → 401
- [X] Token inválido → 401

---

# 2️⃣ Pruebas de Creación – `POST /docentes`

## ✔ Casos Positivos
- [X] Crear docente con todos los campos obligatorios
- [X] Crear docente sin campos opcionales (`direccion`, `telefono`, etc.)
- [X] Validación correcta de fecha de nacimiento
- [X] Respuesta incluye:
- [X] `success = true`
- [X] `data.id` generado
- [X] Se guarda correctamente el ID para pruebas posteriores

## ❌ Casos Negativos
- [X] Documento duplicado → debe retornar 400 con mensaje:
> "Ya existe un docente con documento X"
- [X] Fecha de nacimiento futura → 400
- [X] Fecha de nombramiento futura → 400
- [X] `nivelEducativo` inválido → 400
- [X] `nivelEnsenanza` inválido → 400
- [X] `vinculacion` inválido → 400
- [X] Área inexistente (`areaId`) → 400
- [X] Petición sin token → 401
- [X] Usuario sin permisos → 403

---

# 3️⃣ Obtener docente por ID – `GET /docentes/:id`

## ✔ Casos Positivos
- [X] Consultar un docente existente
- [X] Respuesta incluye:
- [X] `id`
- [X] `documento`
- [X] `nombre`
- [X] `apellidos`
- [X] `area` asociada
- [X] Se valida que el ID sea numérico

## ❌ Casos Negativos
- [X] ID inexistente → 404
- [X] ID inválido (texto) → 400
- [X] Sin token → 401

---

# 4️⃣ Actualización de Docente – `PUT /docentes/:id`

## ✔ Casos Positivos
- [X] Actualizar un campo opcional (ej: `direccion`)
- [X] Actualizar varios campos a la vez
- [X] Validación correcta de campos ENUM
- [X] Validación de fechas obligatoria si se envían
- [X] Respuesta incluye nuevo valor actualizado

## ❌ Casos Negativos
- [X] Intentar cambiar documento a uno existente → 400
- [X] Enviar fecha inválida → 400
- [X] Área inexistente → 400
- [X] Usuario no admin → 403
- [X] Intentar actualizar docente inexistente → 404

---

# 5️⃣ Eliminación – `DELETE /docentes/:id`

## ✔ Casos Positivos
- [X] Eliminar un docente existente
- [X] Respuesta:
- [X] `success = true`
- [X] Mensaje confirmando eliminación
- [X] Posterior `GET` retorna 404

## ❌ Casos Negativos
- [X] Intentar eliminar docente inexistente → 404
- [] Intentar eliminar docente con cargas asignadas
(si aplica FK) → 409
- [X] Usuario no admin → 403

---

# 6️⃣ Validaciones de Seguridad

## ✔ Casos Positivos
- [X] Rutas GET funcionan con cualquier usuario autenticado
- [X] POST, PUT, DELETE **solo** para admin

## ❌ Casos Negativos
- [X] Sin token → 401
- [X] Token de otro rol → 403

---

# 7️⃣ Pruebas Edge Case (casos borde)

- [X] Crear docente sin área (si `areaId` es opcional)
- [X] Enviar teléfono inválido → 400
- [X] Nombre o apellidos con caracteres especiales → 400
- [X] Documento con espacios → 400
- [X] Actualizar sin enviar ningún campo → 200 (sin cambios)
- [X] Crear docente con campos vacíos `"campo": ""` → 400

---

# 8️⃣ Flujo Completo (End-to-End)

1. [X] Crear docente
2. [X] Consultarlo por ID
3. [X] Listarlo dentro de una búsqueda
4. [X] Actualizar algunos campos
5. [X] Validar que se actualizó correctamente
6. [X] Eliminar
7. [X] Intentar obtenerlo nuevamente → 404

---

# ✔ Estado Final del Módulo
- [X] Todos los endpoints probados
- [X] Validadores funcionando
- [X] Repository y Service validados
- [X] Manejo de índices únicos correcto
- [X] Constraints y FK verificadas