
# Checklist de Pruebas — Módulo Estudiantes

## 1. Listar estudiantes (GET /estudiantes)
- [X] Retorna lista con paginación.
- [X] Permite filtros: sexo, barrio, estrato, discapacidad, etnia, víctimas.
- [X] Permite búsqueda general (search).
- [X] Permite includeMatriculas=true.
- [X] Ordenamiento funciona correctamente.

## 2. Obtener estudiante por ID (GET /estudiantes/:id)
- [X] Retorna datos completos.
- [X] Retorna matrículas si includeMatriculas=true.
- [X] Retorna 404 si no existe.

## 3. Crear estudiante (POST /estudiantes)
- [X] Valida documento único.
- [X] Valida tipoDocumento válido.
- [X] Valida nombres y apellidos.
- [X] Valida fechaNacimiento no futura.
- [X] Valida sexo M/F/I.
- [X] Valida ENUMS: víctimas, discapacidad, capacidades, etnia.
- [X] Retorna 201 con el registro creado.

## 4. Actualizar estudiante (PUT /estudiantes/:id)
- [X] Actualiza solo campos enviados.
- [X] Valida documento único excluyendo el propio.
- [X] Valida ENUMS y fechaNacimiento.
- [X] Retorna datos actualizados correctamente.

## 5. Eliminar estudiante (DELETE /estudiantes/:id)
- [ ] Elimina si no tiene relaciones.
- [ ] Retorna error 409 si tiene matrículas o acudientes asociados.
- [X] Retorna 404 si no existe.
