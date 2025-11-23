# 🧩 Dependencia de Vigencia en el Modelo de Datos

## 📘 Introducción
El sistema académico trabaja bajo **vigencias anuales** (ejemplo: 2024, 2025, etc.),
por lo que algunos modelos deben estar ligados al año académico (`vigenciaId`),
mientras que otros representan entidades **permanentes** del sistema
y no deben duplicarse cada año.

---

## 🗂️ Clasificación de Modelos

| **Entidad / Modelo** | **Depende de Vigencia** | **Tipo** | **Descripción** |
|------------------------|-------------------------|-----------|-----------------|
| **Colegios** | ❌ No | Estructural | Información institucional base. |
| **Sedes** | ✅ Sí | Temporal | Puede variar por año, se asocia a una vigencia. |
| **Coordinadores** | ❌ No | Permanente | Persona con rol académico; no se duplica. |
| **Coordinador_Sedes** | ✅ Sí | Temporal | Relación entre coordinadores y sedes por jornada y año. |
| **Docentes** | ❌ No | Permanente | Registro único por persona. |
| **Cargas** | ✅ Sí | Temporal | Asignaciones de docentes por año lectivo. |
| **Grupos** | ✅ Sí | Temporal | Grupos académicos activos en una vigencia específica. |
| **Áreas** | ✅ Sí | Temporal | Áreas definidas para cada año académico. |
| **Asignaturas** | ✅ Sí | Temporal | Materias dentro de un área y una vigencia. |
| **Indicadores** | ✅ Sí | Temporal | Criterios de evaluación asociados a la asignatura y año. |
| **Juicios** | ✅ Sí | Temporal | Descripciones cualitativas por indicador y vigencia. |
| **Estudiantes** | ❌ No | Permanente | Registro único por alumno. |
| **Acudientes** | ❌ No | Permanente | Registro único por acudiente. |
| **Acudiente_Estudiantes** | ❌ No | Permanente | Relación fija entre acudiente y estudiante. |
| **Matrículas** | ✅ Sí | Temporal | Asociación estudiante-grupo por año. |
| **Calificaciones** | ✅ Sí | Temporal | Notas del estudiante en una asignatura por año. |
| **Usuarios (Sistema)** | ❌ No | Permanente | Credenciales de acceso al sistema. |

---

## 🧱 Modelo `Vigencia`
La entidad central que define el año académico activo.

### Ejemplo:
```js
{
id: 5,
anio: 2025,
estado: "ACTIVA", // o "CERRADA"
fechaInicio: "2025-01-10",
fechaFin: "2025-12-10"
}
```

---

## 🔗 Relaciones Clave con `vigenciaId`

| **Entidad dependiente** | **Campo** | **Relación** |
|--------------------------|-----------|---------------|
| `Sede` | `vigenciaId` | Cada sede pertenece a una vigencia. |
| `Coordinador_Sedes` | `vigenciaId` | Un coordinador se asigna a sedes por año. |
| `Grupo` | `vigenciaId` | Los grupos se crean por año académico. |
| `Carga` | `vigenciaId` | Cada carga docente es anual. |
| `Área` | `vigenciaId` | Las áreas se definen cada vigencia. |
| `Asignatura` | `vigenciaId` | Las materias pertenecen a una vigencia. |
| `Indicador` | `vigenciaId` | Los indicadores se renuevan cada año. |
| `Juicio` | `vigenciaId` | Descripciones cualitativas de cada año. |
| `Matrícula` | `vigenciaId` | Registra al estudiante en un grupo de una vigencia. |
| `Calificación` | `vigenciaId` | Registra las notas por año. |

---

## ⚙️ Recomendaciones Técnicas

- En los modelos dependientes, **añadir el campo**:
```js
vigenciaId: {
type: DataTypes.INTEGER,
allowNull: false,
references: {
model: "vigencias",
key: "id"
}
}
```

- En el archivo de asociaciones:
```js
Vigencia.hasMany(Sede, { foreignKey: "vigenciaId" });
Sede.belongsTo(Vigencia, { foreignKey: "vigenciaId" });
```

- Evitar duplicar registros de entidades permanentes (como docentes o estudiantes).
En su lugar, relacionarlas con los modelos temporales mediante `vigenciaId`.

---

## 🧩 Beneficios del Diseño
✅ Permite consultar histórico académico por año.
✅ Facilita cierres de vigencia sin afectar datos de años anteriores.
✅ Mantiene consistencia y evita duplicación de personas o estructuras base.
✅ Posibilita activar/desactivar vigencias sin eliminar información.