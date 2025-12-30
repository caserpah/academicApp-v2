# ✅ CHECKLIST MANUAL – MÓDULO MATRÍCULAS
AcademicApp

---

## 1. CONFIGURACIÓN PREVIA
- [ ] Existe al menos una **vigencia ACTIVA**
- [ ] Existen **sedes activas**
- [ ] Existen **grupos con cupos definidos**
- [ ] Existen **estudiantes activos**
- [ ] El usuario autenticado tiene rol **ADMIN**

---

## 2. LISTADO DE MATRÍCULAS

### GET /matriculas
- [ ] Lista matrículas paginadas correctamente
- [ ] Incluye estudiante, grupo, grado, sede y vigencia
- [ ] Ordena por fechaHora DESC por defecto
- [ ] No presenta errores SQL

### Filtros
- [ ] Filtrar por estado
- [ ] Filtrar por vigenciaId
- [ ] Filtrar por grupoId
- [ ] Filtrar por sedeId
- [ ] Filtrar por estudianteId

### Búsqueda
- [ ] Buscar por folio
- [ ] Buscar por documento del estudiante
- [ ] Buscar por nombres/apellidos

---

## 3. OBTENER MATRÍCULA

### GET /matriculas/:id
- [ ] Retorna matrícula existente
- [ ] Incluye historial de cambios
- [ ] Error 404 si no existe

---

## 4. CREACIÓN DE MATRÍCULA

### POST /matriculas
- [ ] Crea matrícula con estado PREMATRICULADO
- [ ] Genera folio automáticamente (MAT-AAAA-XXXXXX)
- [ ] Valida existencia del estudiante
- [ ] Valida vigencia ACTIVA
- [ ] Valida grupo ACTIVO
- [ ] Valida cupos disponibles
- [ ] Error si el estudiante ya tiene matrícula en la vigencia
- [ ] Guarda usuarioCreacion

---

## 5. VALIDACIONES DE NEGOCIO

- [ ] No permite matrícula en vigencia INACTIVA
- [ ] No permite matrícula en grupo INACTIVO
- [ ] No permite exceder cupos del grupo
- [ ] No permite duplicidad estudiante–vigencia

---

## 6. ACTUALIZACIÓN DE MATRÍCULA

### PUT /matriculas/:id

#### Traslado de grupo
- [ ] Cambia grupo correctamente
- [ ] Valida cupos del nuevo grupo
- [ ] Registra historial (grupoAnterior / grupoNuevo)

#### Traslado de sede
- [ ] Cambia sede correctamente
- [ ] Registra historial (sedeAnterior / sedeNuevo)

#### Cambio de estado
- [ ] Permite transiciones válidas:
  - PREMATRICULADO → ACTIVA
  - ACTIVA → RETIRADO
  - ACTIVA → DESERTADO
  - ACTIVA → PROMOVIDO
  - ACTIVA → REPROBADO
- [ ] Bloquea transiciones inválidas
- [ ] Registra historial de estado

#### Retiro
- [ ] Registra fechaRetiro
- [ ] Registra motivoRetiro
- [ ] Guarda usuarioActualizacion

---

## 7. ELIMINACIÓN DE MATRÍCULA

### DELETE /matriculas/:id
- [ ] Elimina matrícula sin historial
- [ ] Error si tiene historial asociado
- [ ] Error 404 si no existe
- [ ] Mensaje claro al usuario

---

## 8. PREMATRÍCULA MASIVA

### POST /matriculas/prematricula-masiva

#### Validaciones
- [ ] Vigencia destino ACTIVA
- [ ] Grupo destino ACTIVO
- [ ] Cupos suficientes
- [ ] Existen matrículas activas en origen

#### Criterios
- [ ] PROMOVIDOS
- [ ] REPITENTES
- [ ] TODOS

#### Proceso
- [ ] Crea prematrículas solo si no existen duplicados
- [ ] Respeta cupos del grupo destino
- [ ] Omite estudiantes con matrícula previa
- [ ] Genera folio PRE-AAAA-XXXXXX
- [ ] Registra historial automático
- [ ] Retorna resumen:
  - totalOrigen
  - procesadas
  - omitidas

---

## 9. CICLO V (EDUCACIÓN PARA ADULTOS)

- [ ] Permite prematrícula al finalizar 2° período
- [ ] Promueve a Ciclo VI
- [ ] Repite Ciclo V si corresponde
- [ ] Permite retiro si no continúa
- [ ] No afecta primaria/secundaria regular

---

## 10. AUDITORÍA

- [ ] usuarioCreacion se registra al crear
- [ ] usuarioActualizacion se registra al actualizar
- [ ] Historial conserva trazabilidad completa

---

## 11. MENSAJES Y ERRORES

- [ ] Mensajes claros y comprensibles
- [ ] HTTP Status correctos:
  - 201 creación
  - 400 reglas de negocio
  - 404 no encontrado
  - 409 conflictos
- [ ] No hay errores silenciosos

---

## 12. CONSISTENCIA GENERAL

- [ ] El modelo coincide con los validadores
- [ ] El service aplica todas las reglas
- [ ] El repository no contiene lógica de negocio
- [ ] El controller solo orquesta respuestas

---

## ✔ ESTADO FINAL
- [ ] Módulo aprobado para ambiente productivo