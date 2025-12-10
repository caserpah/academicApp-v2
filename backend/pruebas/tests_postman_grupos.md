# Checklist de Pruebas Manuales – Módulo Grupos

## 1. GET /grupos — Listar grupos
- [X] Obtener listado sin filtros (`page=1&limit=10`).
- [X] Respuesta incluye `items`, `pagination.total`, `pagination.totalPages`.
- [X] Devuelve 200 OK.
- [X] Cambiar `page` y validar paginación.
- [X] Cambiar `limit` y validar cantidad de resultados.
- [X] Ordenar por `gradoId` ASC.
- [X] Ordenar por `nombre` DESC.
- [X] Filtrar por `nombre`.
- [X] Filtrar por `gradoId`.
- [X] Filtrar por `jornada`.
- [X] Filtrar por `sedeId`.
- [X] Acceso con token válido → OK.
- [X] Acceso sin token → 401.
- [X] Acceso con token inválido → 401.

## 2. GET /grupos/:id — Obtener grupo
- [X] Obtener grupo existente → 200.
- [X] Respuesta incluye `grado`, `sede`, `director`.
- [X] ID inexistente → 404.
- [X] ID no numérico → 400.
- [X] Sin token → 401.

## 3. POST /grupos — Crear grupo (admin)
### Caso exitoso
```json
{
  "nombre": "A",
  "gradoId": 3,
  "jornada": "MANANA",
  "sedeId": 1,
  "directorId": 10
}
```
- [X] Crear grupo válido → 201.
- [X] Verificar que aparece en GET /grupos.

### Validaciones
- [X] Nombre vacío → 400.
- [X] Nombre con caracteres inválidos → 400.
- [X] gradoId vacío o inexistente → 400.
- [X] jornada inválida → 400.
- [X] sedeId inexistente → 400.
- [X] directorId inválido → 400.
- [X] Enviar sin directorId → permitido.

### Unicidad
- [X] Crear grupo duplicado → 400.

### Seguridad
- [X] Sin token → 401.
- [X] Token no admin → 403.
- [X] Token inválido → 401.

## 4. PUT /grupos/:id — Actualizar grupo (admin)
### Exitoso
- [X] Actualizar nombre.
- [X] Cambiar jornada.
- [X] Cambiar director.
- [X] Actualizar solo campos enviados.

### Validaciones
- [X] Nombre inválido → 400.
- [X] gradoId inexistente → 400.
- [X] sedeId inexistente → 400.
- [X] jornada inválida → 400.

### Unicidad
- [X] Actualizar grupo para duplicar otro → 400.

### Seguridad
- [X] Sin token → 401.
- [X] Token no admin → 403.
- [X] Grupo inexistente → 404.

## 5. DELETE /grupos/:id — Eliminar (admin)
- [X] Eliminar grupo existente → 200.
- [X] Grupo inexistente → 404.
- [X] Sin token → 401.
- [X] Token no admin → 403.
- [X] Token inválido → 401.

## 6. Casos límite
- [X] Nombre largo → validar.
- [X] Nombre con espacios → permitido.
- [X] directorId = null → permitido.
- [X] Actualizar sin body → no cambia nada.

## 7. Regresiones
- [X] GET /grupos sigue funcionando después de cambios.
- [X] Filtros siguen correctos.
- [X] Índice único funcional.
- [X] Grupo eliminado no aparece.