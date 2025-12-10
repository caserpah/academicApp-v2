# Checklist de Pruebas Manuales – Módulo Cargas

## 1. Listado de cargas (GET /cargas)
- [X] Retorna 200 OK.
- [X] Devuelve paginación correctamente.
- [X] Filtra por sedeId, docenteId, grupoId, asignaturaId, vigenciaId.
- [X] Ordena correctamente por cualquier campo.
- [X] Incluye información del docente, grupo, sede y asignatura.

## 2. Obtener carga por ID (GET /cargas/:id)
- [X] Retorna 200 si existe.
- [X] Retorna 404 si no existe.
- [X] Devuelve todas las relaciones asociadas (docente, grupo, sede, asignatura).

## 3. Crear carga (POST /cargas)
- [X] Retorna 201 Created.
- [X] Valida horas entre 1 y 40.
- [X] Valida existencia de sede, docente, grupo y asignatura.
- [X] Genera automáticamente código formato `C<grupoId>A<asignaturaId>R<n>`.
- [X] Impide duplicados (grupo + asignatura + vigencia).
- [X] Impide códigos duplicados por vigencia.
- [X] Responde con la carga completa creada.

## 4. Actualizar carga (PUT /cargas/:id)
- [X] Retorna 200 si existe.
- [X] Retorna 404 si no existe.
- [X] No modifica el código aunque cambien IDs.
- [X] Valida horas entre 1 y 40.
- [X] Valida FK si se envían.
- [X] Devuelve la carga actualizada.

## 5. Eliminar carga (DELETE /cargas/:id)
- [X] Retorna 200 si elimina.
- [X] Retorna 404 si no existe.
- [] (Si aplica) debe impedir eliminar si hay registros dependientes.

## 6. Seguridad
- [X] GET requiere autenticación (protect).
- [X] POST / PUT / DELETE requieren rol admin (restrictTo(['admin'])).
- [X] vigenciaId se toma automáticamente desde req.vigenciaActual.id.
