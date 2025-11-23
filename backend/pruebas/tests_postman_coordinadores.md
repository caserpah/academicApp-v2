# ✅ Pruebas Postman — Coordinadores & Coordinador–Sedes

**Proyecto:** Sistema Académico Escolar
**Entidad:** Coordinador / Coordinador-Sedes
**Propósito:** Validar gestión de coordinadores y su asignación a sedes por jornada y vigencia.

---

## 🧭 1️⃣ CRUD Coordinadores

| Nº | Método | Endpoint | Caso | Resultado esperado |
|----|--------|----------|------|--------------------|
    | 1 | GET | `/coordinadores` | Listar coordinadores | 200 → listado exitoso |
    | 2 | POST | `/coordinadores` | Crear coordinador válido | 201 → “registrado exitosamente” |
    | 3 | POST | `/coordinadores` | Documento con letras | 422 → error validación |
    | 4 | GET | `/coordinadores/:id` | Ver coordinador válido | 200 |
    | 5 | PUT | `/coordinadores/:id` | Actualizar nombre/teléfono | 200 |
    | 6 | DELETE | `/coordinadores/:id` | Eliminar coordinador | 200 |

---

## 🧮 2️⃣ Validaciones Coordinador

| Caso | Resultado esperado |
|------|--------------------|
    | Documento vacío | 422 |
    | Documento con caracteres no numéricos | 422 |
    | Nombre vacío | 422 |
    | Email inválido | 422 |
    | Teléfono < 10 dígitos | 422 |

---

## 🔗 3️⃣ Coordinadores–Sedes (N:M con Vigencia)

| Nº | Método | Endpoint | Caso | Resultado |
|----|--------|----------|-------|----------|
    | 7 | GET | `/coordinadores-sedes` | Listado por vigencia | 200 |
    | 8 | POST | `/coordinadores-sedes` | Asignación válida | 201 |
    | 9 | POST | `/coordinadores-sedes` | Jornada duplicada en misma sede y vigencia | 409 |
    |10 | PUT | `/coordinadores-sedes/:id` | Cambiar jornada | 200 |
    |11 | DELETE | `/coordinadores-sedes/:id` | Eliminar asignación | 200 |

---

## 🔐 4️⃣ Pruebas de Permisos

| Escenario | Resultado |
|-----------|-----------|
    | Crear coordinador → sin admin | 403 |
    | Crear asignación → sin admin | 403 |
    | Actualizar asignación → sin admin | 403 |
    | Consultar (GET) coordinadores | permitido para cualquier usuario autenticado |

---

## 🧠 5️⃣ Pruebas de Vigencia

| Caso | Resultado |
|-------|----------|
    | Asignar coordinador sin enviar `x-vigencia-id` (y no hay activa) | 409 |
    | Asignar con vigencia inexistente | 404 |
| Mismo coordinador-sede-jornada en vigencia distinta | ✔ permitido |

---

## 🧩 6️⃣ Integridad Referencial

| Caso | Resultado |
|------|-----------|
    | Eliminar coordinador con asignaciones activas | 409 |
    | Eliminar sede con asignaciones | 409 |

---

## ✔ Resultado Global Esperado

| Objetivo | Estado |
|----------|--------|
| CRUD coordinadores estable | ✔ |
| Relación N:M con vigencia y jornada operativa | ✔ |
| Seguridad y permisos funcionales | ✔ |
| Validaciones coherentes y mensajes claros | ✔ |