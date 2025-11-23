# 📋 Checklist de Pruebas – Módulo Asignaturas

---

## ✅ 1. Listado de asignaturas
- [X] GET /asignaturas
- [X] Incluye área (id, nombre)
- [X] Incluye vigencia (id, año)
- [ ] Permite filtros:
  - [ ] búsqueda (`search`)
  - [ ] por área (`areaId`)
  - [ ] paginación
  - [ ] ordenamiento
- [X] Requiere token
- [X] Aplica vigenciaContext

---

## ✅ 2. Obtener asignatura por ID
- [X] GET /asignaturas/:id
- [X] Incluye área (id, nombre)
- [X] Incluye vigencia
- [X] Error 404 si no existe
- [X] Error 404 si no pertenece a la vigencia actual

---

## ✅ 3. Crear asignatura
- [X] POST /asignaturas
- [X] Requiere rol admin
- [X] Requiere área existente
- [X] El área debe pertenecer a la misma vigencia
- [X] Valida:
  - [X] código requerido (máx 6)
  - [X] nombre requerido (máx 60)
  - [X] abreviatura requerida (máx 6)
  - [X] porcentual 1–100
- [X] Resultado esperado:
  - `"Asignatura registrada exitosamente."`

---

## 🟥 4. Validación de duplicados
- [X] Mismo código + vigencia → error 409  
  `"Ya existe una asignatura con este código en el año lectivo."`
- [X] Mismo nombre + área + vigencia → error 409  
  `"Ya existe una asignatura con este nombre en esta área para el año lectivo."`

---

## 🟨 5. Actualizar asignatura
- [X] PUT /asignaturas/:id
- [X] No permite cambiar de vigencia
- [X] Si envía areaId:
  - [X] área debe existir
  - [X] área debe pertenecer a la misma vigencia
- [X] porcentual entre 0–100
- [X] Resultado:
  `"Asignatura actualizada exitosamente."`

---

## 🟥 6. Actualizar con duplicados
- [X] código duplicado → 409
- [X] nombre duplicado en la misma área/vigencia → 409

---

## 🟩 7. Eliminar asignatura
- [X] DELETE /asignaturas/:id
- [ ] No permite eliminar si tiene:
  - [ ] indicadores asociados
  - [ ] cargas asociadas
- [ ] En ese caso debe mostrar:
  `"No se puede eliminar esta asignatura porque tiene cargas o indicadores asociados."`

---

## 🔐 8. Seguridad
- [X] GET requiere autenticación
- [X] POST/PUT/DELETE requieren rol admin
- [X] No permite enviar vigenciaId manualmente

---

## 🧠 9. Integración con Sequelize
- [X] `handleSequelizeError` reconoce:
  - `idx_asignatura_codigo_vigencia`
  - `idx_asignatura_nombre_area_vigencia`
- [X] No se muestran mensajes técnicos
- [X] Todos los mensajes son humanos y amigables

---