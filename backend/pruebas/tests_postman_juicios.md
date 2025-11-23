# ✅ Checklist de Pruebas — Módulo Juicios

### 🟦 Listar Juicios
- [X] GET `/juicios`
- [X] Devuelve `items` y `pagination`
- [X] Respeta `page` y `limit`
- [X] Respeta ordenamiento por defecto (`grado ASC`)
- [X] Permite ordenar por `periodo`, `dimension`, `desempeno`

### 🟦 Filtros
- [ ] Filtro por `grado`
- [ ] Filtro por `periodo`
- [ ] Filtro por `dimension`
- [ ] Filtro por `tipo`
- [ ] Filtro por `desempeno`
- [ ] Filtro por `activo`
- [ ] Filtro por `asignaturaId`
- [ ] Los filtros combinados funcionan (grado + periodo + dimensión)

### 🟦 Obtener Juicio por ID
- [X] GET `/juicios/:id`
- [ ] Si el ID existe en la vigencia activa → retorna el juicio
- [X] Si no existe → retorna 404 con mensaje humano

### 🟦 Crear Juicio
- [X] POST `/juicios`
- [X] Crea con éxito si los datos son válidos
- [X] Valida que `minNota <= maxNota`
- [X] Registra automáticamente `vigenciaId` desde `x-vigencia-id`
- [X] Crea solo los campos permitidos
- [ ] Violación unicidad → mensaje humano

### 🟦 Actualizar Juicio
- [ ] PUT `/juicios/:id`
- [ ] Actualiza solo si pertenece a la vigencia activa
- [ ] No permite cambiar `vigenciaId`
- [X] Valida `minNota <= maxNota`
- [X] No permite actualizar si ya existe un juicio duplicado

### 🟦 Eliminar Juicio
- [X] DELETE `/juicios/:id`
- [X] No elimina juicios de otras vigencias
- [ ] No elimina si está siendo usado (ej. calificaciones)
- [ ] Devuelve mensaje humano en FK error

### 🟦 Paginación
- [X] Verificar que `total`, `totalPages`, `page` y `limit` son correctos
- [X] Límite máximo de 100 respetado
- [X] Paginar sobre filtros: `/juicios?grado=QUINTO&page=2`

### 🟦 Seguridad y validaciones
- [X] Validación de campos con express-validator
- [X] Desestructuración adecuada en servicios
- [X] Solo se aceptan campos permitidos
- [X] Retorna mensajes humanos siempre