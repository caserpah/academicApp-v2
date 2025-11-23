# Checklist de Pruebas – Módulo Áreas
Sistema Académico Escolar — Backend Node.js + Sequelize

---

## ✔ 1. Listado de áreas
- [X] GET /areas devuelve 200
- [X] La respuesta incluye `data` y `pagination`
- [X] Se muestra la vigencia en los includes

---

## ✔ 2. Paginación
- [ ] GET /areas?page=1&limit=5 devuelve máximo 5 registros
- [X] `pagination.total`, `pagination.page`, `pagination.limit`, `pagination.totalPages` son correctos

---

## ✔ 3. Filtros
- [ ] Filtro por nombre → /areas?nombre=MAT
- [ ] Filtro por código → /areas?codigo=MATH
- [ ] Filtro por vigencia → /areas?vigenciaId=1
- [ ] Filtro por promociona → /areas?promociona=true

---

## ✔ 4. Ordenamiento
- [ ] GET /areas?sortBy=nombre&sortDir=ASC funciona
- [ ] GET /areas?sortBy=nombre&sortDir=DESC funciona

---

## ✔ 5. Obtener por ID
- [X] GET /areas/1 devuelve 200
- [X] GET /areas/9999 devuelve 404

---

## ✔ 6. Crear área
### Correcto
- [X] POST /areas crea un área nueva
- [X] Devuelve 201

### Validación
- [X] Código vacío → error 400
- [X] Nombre vacío → error 400
- [X] Abreviatura vacía → error 400
- [X] Longitudes máximas → error 400
- [X] Falta vigenciaId → error 400

### Errores de unicidad (MySQL 8)
- [X] Código duplicado + misma vigencia → mensaje humano
- [X] Nombre duplicado + misma vigencia → mensaje humano

---

## ✔ 7. Actualizar área
### Correcto
- [X] PUT /areas/ID actualiza correctamente
- [X] Devuelve el registro actualizado

### Errores
- [X] Actualizar ID inexistente → 404
- [X] Actualizar a código duplicado → 400
- [X] Actualizar a nombre duplicado → 400

---

## ✔ 8. Eliminar área
### Correcto
- [X] DELETE /areas/ID elimina correctamente
- [X] Devuelve mensaje humano

### Error
- [X] DELETE /areas/9999 devuelve 404

---

# ✔ Estado final esperado del módulo
- [X] CRUD funcional
- [X] Paginación implementada
- [X] Filtros funcionando
- [X] Ordenamiento correcto
- [X] Includes de vigencia funcionando
- [X] Mensajes humanos
- [X] Errores MySQL 8 manejados correctamente