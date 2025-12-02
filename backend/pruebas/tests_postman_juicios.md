# 🧪 TESTING — Módulo de Juicios

Este documento contiene los escenarios de prueba recomendados para validar el funcionamiento del módulo **Juicios**, bajo la nueva arquitectura de grados, desempeños, configuraciones y excepciones (como la asignatura Comportamiento).

---

# ✅ 1. PRUEBAS DE LISTADO

### [X] 1.1 Listar juicios (sin filtros)
- Método: GET `/juicios`
- Debe retornar:
- `items`
- `pagination.total`
- `asignatura`, `grado`, `dimension`, `desempeno`

### [ ] 1.2 Listar con paginación
- GET `/juicios?page=2&limit=5`

### [X] 1.3 Filtrar por grado
- GET `/juicios?gradoId=6`

### [X] 1.4 Filtrar por asignatura
- GET `/juicios?asignaturaId=10`

### [X] 1.5 Filtrar por período
- GET `/juicios?periodo=2`

---

# ✅ 2. PRUEBAS DE CREACIÓN

## [X] 2.1 Crear juicio — Preescolar (desempeños múltiples)
- POST `/juicios`
- Datos:
- grado preescolar
- dimensionId obligatorio
- desempenoId ∈ {BAJO, BASICO, ALTO, SUPERIOR}
- Resultado:
- 201 Created

---

## [X] 2.2 Crear juicio — Primaria/Secundaria (desempeño UNICO)
- POST `/juicios`
- Datos:
- grado primaria o secundaria
- dimensionId obligatorio
- desempenoId = UNICO
- Resultado:
- 201 Created
- Error esperado si se asigna BAJO/BASICO/ALTO/SUPERIOR

---

## [ ] 2.3 Crear juicio — Asignatura COMPORTAMIENTO (sin dimensión)
- POST `/juicios`
- Datos:
- asignaturaId = comportamiento
- dimensionId = null (NO permitido)
- desempenoId ∈ {BAJO, BASICO, ALTO, SUPERIOR}
- Resultado:
- 201 Created

---

## 🟥 2.4 Errores de validación
### [X] Intentar crear juicio sin dimensión en asignatura normal
→ Debe retornar error

### [X] Intentar crear juicio con desempeño múltiple en primaria
→ Debe retornar error

### [X] Intentar crear juicio para periodo NO permitido según `config_grado`
→ Debe retornar error
(ej.: Ciclo V solo permite periodos 1 y 2)

---

# ✅ 3. PRUEBAS DE ACTUALIZACIÓN

### [X] 3.1 Cambiar texto del juicio
### [X] 3.2 Activar/desactivar juicio
### [X] 3.3 Cambiar desempeño respetando reglas del grado
### [ ] 3.4 Intentar cambiar dimensión en asignatura comportamiento (debe fallar)

---

# ✅ 4. PRUEBAS DE ELIMINACIÓN

### [X] 4.1 Eliminar juicio sin dependencias
→ 200 OK

### [ ] 4.2 Intentar eliminar juicio ligado a calificaciones
→ Debe retornar error foreign key

---

# 🟨 5. PRUEBAS DE RANGOS DE DESEMPEÑO

### [ ] 5.1 Listar rangos de desempeño
GET `/desempenos/rangos`

### [ ] 5.2 Crear rango
POST `/desempenos/rangos`
- minNota < maxNota
- dentro del rango 0–5

### [ ] 5.3 Actualizar rango
PUT `/desempenos/rangos/:id`

### [ ] 5.4 Eliminar rango
DELETE `/desempenos/rangos/:id`

### [ ] 5.5 Errores:
- minNota > maxNota
- nota fuera de 0–5
- desempeño inexistente

---

# 🟩 6. PRUEBAS ESPECIALES PARA COMPORTAMIENTO

### [ ] 6.1 Crear los 4 juicios (BAJO, BASICO, ALTO, SUPERIOR)
### [X] 6.2 dimensionId debe quedar siempre NULL
### [X] 6.3 desempeño UNICO NO permitido
### [X] 6.4 intento de enviar dimensionId → ERROR

---

# 🟦 7. PRUEBAS ESPECIALES PARA CONFIG_GRADO

### [X] 7.1 Preescolar: desempeño múltiple permitido
### [X] 7.2 Primaria/Secundaria: solo UNICO permitido
### [X] 7.3 Ciclo V: solo periodos 1 y 2
### [X] 7.4 Ciclo VI: solo periodos 3 y 4

---

# 🎉 FIN DEL CHECKLIST
Listo para pruebas manuales y automatizadas.