# 📘 Documentación Técnica del Backend — Fase 1: Modelos y asociaciones (Versión 2025-10-27)

## 🧱 Estructura General del Proyecto

El backend está construido con **Node.js + Express + Sequelize (ORM)**, organizado bajo una arquitectura modular en capas:

```
src/
├── controllers/
├── services/
├── repositories/
├── models/
├── database/
│   ├── db.connect.js
│   ├── syncRelations.js
│   └── associations/
├── middleware/
├── validators/
└── utils/
```

---

## 🎯 Objetivo de esta fase
Diseñar y documentar todos los **modelos Sequelize** que representan la estructura de datos base del sistema académico del colegio.

Cada modelo define:
- Estructura y restricciones de la tabla.
- Validaciones integradas.
- Relaciones con otras entidades.
- Índices y campos únicos.

---

## 🏫 Modelo: Colegio

- Representa la institución principal.
- Relación: **1:N con Sedes**.

Campos relevantes:
- `codigo` (único, alfanumérico, obligatorio)
- `nombre`
- `direccion`
- `contacto` (opcional)

---

## 🏢 Modelo: Sede

- Representa una sede física o administrativa del colegio.
- Relación: **N:1 con Colegio** (mediante `colegioId`).
- Se usará también para relacionarse con `Coordinadores`, `Grupos`, `Cargas`, `Matriculas` y otras entidades dependientes de la institución.

Campos clave:
- `codigo` (único, alfanumérico)
- `nombre`, `direccion`, `contacto`
- `colegioId` (FK → `Colegios`)

Validaciones:
- `isAlphanumeric` en código
- `notEmpty` en nombre y dirección

---

## 👩‍💼 Modelo: Coordinador

- Representa un coordinador académico o administrativo.
- Relación: **N:M con Sedes**, a través de `coordinador_sedes`.

Campos principales:
- `documento` (único)
- `nombre`, `email`, `telefono`, `direccion`

---

## 🔁 Modelo: Coordinador_Sedes

- Tabla intermedia que gestiona la asignación de **coordinadores a sedes**.
- Contiene además la jornada (Mañana, Tarde, Nocturna, etc.).

Campos clave:
- `jornada` (obligatoria)
- Índice único compuesto: `(coordinadorId, sedeId, jornada)`

---

## 🧑‍🏫 Modelo: Docente

- Registra a los docentes de la institución.
- Es una entidad **permanente** (no dependiente de vigencia).

Campos principales:
- `documento` (único)
- `nombre`, `apellidos`
- `nivelEducativo`, `nivelEnsenanza`, `vinculacion`
- `activo` (booleano)

Relaciones previstas:
- 1:N con `Cargas` (asignaciones)
- 1:N con `Grupos` (dirección de grupo)

---

## 🧮 Modelo: Área

- Define las áreas académicas (Matemáticas, Lenguaje, Ciencias, etc.).
- Cada área puede tener varias asignaturas.

Campos:
- `codigo` (único, 6 caracteres máx.)
- `nombre` (único)
- `abreviatura`
- `promociona` (booleano)

---

## 📘 Modelo: Asignatura

- Representa una materia específica dentro de un área.

Relaciones:
- **N:1 con Área** (`areaId` FK)

Campos clave:
- `codigo`, `nombre`, `abreviatura`
- `porcentual` (peso de la asignatura en evaluaciones)
- `promociona` (booleano)

---

## 📊 Modelo: Indicador

- Define indicadores de desempeño académico.
- Relación prevista: **1:N con Juicios**.

Campos:
- `codigo` (único)
- `descripcion` (texto)

---

## 🧾 Modelo: Juicio

- Define descripciones cualitativas del rendimiento.
- Relación: **N:1 con Indicadores** (por `indicadorId` futuro).

Campos:
- `codigo`, `codigoRegistro`
- `descripcion`, `grado`
- Índice único `(codigo, grado)`

---

## ⚙️ Modelo: Carga

- Define las asignaciones docentes (qué profesor dicta qué asignatura a qué grupo y sede).
- Relación múltiple con `Docente`, `Grupo`, `Asignatura` y `Sede`.
- Dependerá de una `vigencia`.

Campos principales:
- `codigo` (único)
- `horas`
- Índices optimizados para `sedeId`, `docenteId`, `grupoId`, `asignaturaId`.

---

## 🧩 Modelo: Grupo

- Representa un grupo académico (ej. 6°A, 9°B).
- Relación: **N:1 con Sede** y **N:1 con Vigencia**.

Campos clave:
- `nombre`, `grado`, `jornada`
- Índice único `(identificador, grado, jornada, sedeId)`

---

## 🧮 Modelo: Calificación

- Guarda las notas, promedios y juicios por estudiante y asignatura.
- Relación: **N:1 con Asignatura** y **N:1 con Estudiante**.

Campos:
- `periodo`, `notaAcademica`, `promedioAcademica`, etc.
- Índice único `(periodo, estudianteId, asignaturaId)`

---

## 🧾 Modelo: Matrícula

- Representa la inscripción formal de un estudiante en un grupo y vigencia.
- Podrá tener relación con `Prematrícula` (futura extensión).

Campos principales:
- `folio`, `fechaHora`, `repitente`, `nuevo`, `situacion`, `activo`
- Índices para búsquedas por `estudianteId`, `grupoId`, `activo`

---

## 👦 Modelo: Estudiante

- Entidad permanente, base de los procesos académicos.
- Se relaciona con `Matriculas`, `Acudientes`, y `Calificaciones`.

Campos:
- `tipoDocumento`, `documento` (único)
- `primerNombre`, `primerApellido`, `fechaNacimiento`, `genero`
- Atributos socioeconómicos: `estrato`, `sisben`, `subsidiado`, `eps`
- Indicadores diferenciales: `victimas`, `discapacidad`, `capacidades`, `etnia`

---

## 👨‍👩‍👧 Modelo: Acudiente

- Representa al padre, madre o tutor legal.
- Relación: **N:M con Estudiantes**, mediante `acudiente_estudiantes`.

Campos:
- `tipoDocumento`, `documento` (único)
- `nombres`, `apellidos`, `fechaNacimiento`
- `direccion`, `contacto`, `email`

---

## 🧑‍👦 Modelo: Acudiente_Estudiantes

- Tabla intermedia entre `Acudientes` y `Estudiantes`.
- Registra además el tipo de relación (`afinidad`).

Campos:
- `afinidad` (Padre, Madre, Tío, Tutor, etc.)
- Índice único `(acudienteId, estudianteId, afinidad)`

---

## 👥 Modelo: Usuario

- Representa usuarios del sistema (administrativos, docentes, acudientes, etc.).
- Incluye roles, autenticación y control de acceso.

Campos clave:
- `nombreCompleto`, `numeroDocumento`, `email` (único)
- `password` (encriptado con `bcrypt`)
- `role` (ENUM: admin, director, coordinador, profesor, acudiente)
- `activo`

Hooks:
- `beforeCreate` y `beforeUpdate` → hash de contraseña.

---

## 📅 Modelo: Vigencia

- Define los años académicos.
- Relación central para los modelos dependientes de año.

Campos principales:
- `anio` (único)
- `fechaInicio`, `fechaFin`, `estado`, `activa`
- Validación para evitar más de una vigencia activa.

Estados posibles:
- `PLANIFICADA` → en preparación
- `ACTIVA` → en curso
- `CERRADA` → finalizada

---

## Modelo: ventanaCalificacion

- Controla la apertura y cierre de los periodos de calificación

Campos clave:
- `periodo`, `fechaInicio`, `fechaFin`
- `habilitada`

---

## 🔗 Relaciones Establecidas

| Relación | Tipo | Descripción |
|-----------|------|--------------|
| Colegios → Sedes | 1:N | Un colegio puede tener varias sedes. |
| Sedes ↔ Coordinadores | N:M | A través de `coordinador_sedes`. |
| Sedes → | Cargas | 1:N | Cada Sede puede tener varias cargas académicas |
| Sedes → | Matriculas | 1:N | Cada Sede puede tener varias Matriculas |
| Sedes → | Grupos | 1:N | Cada Sede puede tener varios grupos |
| Áreas → Asignaturas | 1:N | Un área contiene múltiples asignaturas. |
| Áreas → Docentes | 1:N | Cada área puede tener varios docentes. |
| Asignaturas → Calificaciones | 1:N | Cada asignatura genera varias notas. |
| Asignaturas → Indicadores | 1:N | Cada asignatura genera varios Indicadores. |
| Asignaturas → Cargas | 1:N | Una asignatura puedes estar en varias cargas académicas. |
| Indicadores → Juicios | 1:N | Un indicador puede tener varios juicios. |
| Docentes → Cargas | 1:N | Cada docente puede tener varias cargas académicas. |
| Docentes → Grupos | 1:N | Cada docente puede tener varias direcciones de grupo, pero no en la misma vigencia. |
| Estudiantes → Calificaciones | 1:N | Cada estudiante tiene muchas notas. |
| Estudiantes → Matrículas | 1:N | Cada estudiante tiene muchas matriculas. |
| Estudiantes ↔ Acudientes | N:M | Mediante `acudiente_estudiantes`. |
| Grupos → Cargas | 1:N | Un grupo puede tener varias cargas académicas. |
| Grupos → Matrículas | 1:N | Un grupo puede tiene muchas matriculas. |

| Vigencias → [Areas, Asignaturas, Calificaciones, Cargas, Grupos, Indicadores, Juicios, Matriculas, Sedes] | 1:N | Control temporal por año académico. |

---

## 🧭 Próximos Pasos (Fase 2)

1. Agregar controladores y servicios CRUD para cada principal.
2. Implementar validaciones reutilizables en `validators/`.
3. Integrar `Vigencia` como filtro global en consultas académicas.

---

**📌 Estado actual:**
✅ Todos los modelos creados y validados sintácticamente.
✅ Asociaciones establecidas
⚙️ En espera de definición servicios base.
🧩 Estructura lista para sincronización (`syncModels()` activo).

---

**Autor:** Proyecto Sistema Académico Escolar
**Fecha de versión:** 2025-10-27
