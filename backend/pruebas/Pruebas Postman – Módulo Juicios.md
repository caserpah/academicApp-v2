# Checklist de Pruebas Postman – Módulo Juicios (`/juicios`)

Backend basado en:
- Modelo `Juicio` (Sequelize)
- `juicioRepository`
- `juicioService`
- `juicioController`
- Rutas `/juicios`
- Validadores `ValidarCrearJuicio` y `validarActualizarJuicio`

---

## 0. Configuración general en Postman

- [X] Configurar variable de entorno `{{baseUrl}}` con el host de la API (ej: `http://localhost:3000/api`).
- [X] Configurar variable `{{token_admin}}` con un JWT válido de usuario con rol `admin`.
- [X] Configurar variable `{{token_user}}` con un JWT válido de usuario sin rol `admin` (ej: rol `docente`).
- [X] En cada request protegido:
  - Header `Authorization: Bearer {{token_admin}}` o `{{token_user}}` según el caso.
- [X] Verificar que el middleware `protect` exija token en todas las rutas:
  - `GET /juicios`
  - `GET /juicios/:id`
  - `POST /juicios`
  - `PUT /juicios/:id`
  - `DELETE /juicios/:id`
- [X] Verificar que `restrictTo(['admin'])` aplique en:
  - `POST /juicios`
  - `PUT /juicios/:id`
  - `DELETE /juicios/:id`

---

## 1. GET /juicios – Listado con filtros, orden y paginación

### 1.1. Caso básico sin filtros

[X] TC-GET-01 – Listado general

- Método: `GET`
- URL: `{{baseUrl}}/juicios`
- Headers: `Authorization: Bearer {{token_admin}}`
- Sin query params.
- Verificar:
  - Código HTTP: `200`.
  - Respuesta usa el formato estándar de `sendSuccess` (ej: incluye `message`, `data`, etc).
  - `data.items` es un arreglo.
  - `data.pagination` contiene: `page`, `limit`, `total`, `totalPages`.
  - Por defecto solo deben venir `activo = true` (se aplica `incluyeInactivos` falsy).

---

### 1.2. Paginación

[ ] TC-GET-02 – Primer página

- Query: `?page=1&limit=10`
- Verificar:
  - `pagination.page === 1`
  - `pagination.limit === 10`.

[ ] TC-GET-03 – Segunda página

- Precondición: que exista suficiente data.
- Query: `?page=2&limit=10`
- Verificar:
  - `pagination.page === 2`.
  - El contenido cambia respecto a `page=1`.

[ ] TC-GET-04 – Paginación con `limit` alto

- Query: `?page=1&limit=100`
- Verificar:
  - No se rompa la respuesta.
  - `totalPages` se calcule correctamente.

---

### 1.3. Ordenamiento

[X] TC-GET-05 – Orden por grado ascendente

- Query: `?orderBy=grado&order=ASC`
- Verificar:
  - Los registros vienen ordenados por `grado` ascendente.

[X] TC-GET-06 – Orden por grado descendente

- Query: `?orderBy=grado&order=DESC`
- Verificar:
  - Orden descendente.

[X] TC-GET-07 – Orden por campo no válido (prueba de robustez)

- Query: `?orderBy=campoInexistente&order=ASC`
- Verificar:
  - Comportamiento esperado (puede generar error de BD o ignorar).
  - Registrar el resultado para posibles ajustes en backend.

---

### 1.4. Filtros individuales

Usar siempre un token válido y datos reales según el seed/base.

[X] TC-GET-08 – Filtrar por `grado`

- Query: `?grado=PRE_JARDIN`
- Verificar:
  - Todos los elementos de `data.items` tienen `grado = "PRE_JARDIN"`.

[X] TC-GET-09 – Filtrar por `periodo`

- Query: `?periodo=1`
- Verificar:
  - Todos los elementos tienen `periodo = 1`.

[X] TC-GET-10 – Filtrar por `dimension`

- Query: `?dimension=ACADEMICA`
- Verificar:
  - Todos los elementos tienen `dimension = "ACADEMICA"`.

[X] TC-GET-11 – Filtrar por `asignaturaId`

- Query: `?asignaturaId=1`
- Verificar:
  - Todos los elementos tienen `asignaturaId = 1`.

[X] TC-GET-12 – Filtrar por `desempeno`

- Para preescolar: `desempeno=ALTO` por ejemplo.
- Query: `?desempeno=ALTO`
- Verificar:
  - Todos los elementos tienen `desempeno = "ALTO"`.

---

### 1.5. Combinación de filtros

[X] TC-GET-13 – Varios filtros combinados

- Query: `?grado=PRE_JARDIN&periodo=1&dimension=ACADEMICA&asignaturaId=1`
- Verificar:
  - Todos los resultados cumplen con todos los filtros simultáneamente.

---

### 1.6. incluyeInactivos

[X] TC-GET-14 – Sin `incluyeInactivos` (por defecto)

- Asegurarse de tener al menos un registro con `activo = false`.
- Request sin `incluyeInactivos`.
- Verificar:
  - No aparecen registros inactivos.

[X] TC-GET-15 – Con `incluyeInactivos=true`

- Query: `?incluyeInactivos=true`
- Verificar:
  - El listado puede incluir juicios con `activo = false`.

---

### 1.7. Parámetros inválidos

[X] TC-GET-16 – `page` y `limit` no numéricos

- Query: `?page=abc&limit=xyz`
- Verificar:
  - Comportamiento (puede castear a 0/NaN o lanzar error).
  - Documentar resultado.

[X] TC-GET-17 – `periodo` fuera de rango

- Query: `?periodo=10`
- Verificar:
  - El repository no valida periodo en list; la consulta debe retornar 0 elementos o lanzar error (según BD).
  - Documentar comportamiento.

---

## 2. GET /juicios/:id – Obtener juicio por ID

[X] TC-GETID-01 – Caso exitoso

- Método: `GET`
- URL: `{{baseUrl}}/juicios/1`
- Headers: `Authorization: Bearer {{token_admin}}`
- Precondición: exista un juicio con ID 1 en la vigencia actual.
- Verificar:
  - Código HTTP: `200`.
  - `data` contiene el objeto del juicio.
  - Incluye objeto `asignatura` con `codigo`, `nombre`, `abreviatura`.

[X] TC-GETID-02 – ID inexistente

- URL: `{{baseUrl}}/juicios/999999`
- Verificar:
  - Código HTTP: `404`.
  - Mensaje: "No se encontró el juicio solicitado." (desde service).

[X] TC-GETID-03 – ID no numérico

- URL: `{{baseUrl}}/juicios/abc`
- Verificar:
  - Código esperado (400/422) según validaciones globales.
  - Mensaje de error consistente.

---

## 3. POST /juicios – Crear juicio (solo admin)

Endpoint protegido y restringido a rol admin.

### 3.1. Caso exitoso – Preescolar (CUANTITATIVO)

[X] TC-POST-01 – Crear juicio preescolar con notas y desempeño

- Método: `POST`
- URL: `{{baseUrl}}/juicios`
- Headers:
  - `Authorization: Bearer {{token_admin}}`
  - `Content-Type: application/json`
- Body:

```json
{
  "tipo": "CUANTITATIVO",
  "grado": "PRE_JARDIN",
  "periodo": 1,
  "dimension": "ACADEMICA",
  "desempeno": "ALTO",
  "minNota": 3.0,
  "maxNota": 5.0,
  "texto": "El estudiante demuestra un desempeño alto en los logros del periodo.",
  "asignaturaId": 1,
  "activo": true
}