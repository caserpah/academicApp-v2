import { Colegio } from "../../models/colegio.js";
import { Sede } from "../../models/sede.js";
import { Coordinador } from "../../models/coordinador.js";
import { CoordinadorSedes } from "../../models/coordinador_sedes.js";
import { Area } from "../../models/area.js";
import { Asignatura } from "../../models/asignatura.js";
import { Grado } from "../../models/grado.js";
import { Dimension } from "../../models/dimension.js";
import { Desempeno } from "../../models/desempeno.js";
import { Juicio } from "../../models/juicio.js";
import { Docente } from "../../models/docente.js";
import { Carga } from "../../models/carga.js";
import { Grupo } from "../../models/grupo.js";
import { Estudiante } from "../../models/estudiante.js";
import { Acudiente } from "../../models/acudiente.js";
import { AcudienteEstudiantes } from "../../models/acudiente_estudiantes.js";
import { HistorialMatriculas } from "../../models/historial_matriculas.js";
import { Matricula } from "../../models/matricula.js";
import { Calificacion } from "../../models/calificacion.js";
import { Nivelacion } from "../../models/nivelacion.js";
import { Vigencia } from "../../models/vigencia.js";
import { VentanaCalificacion } from "../../models/ventana_calificacion.js";
import { ConfigGrado } from "../../models/config_grado.js";
import { DesempenoRango } from "../../models/desempeno_rango.js";

export const definirAsociaciones = () => {

    /** 🏫 Colegio ↔ Sede */
    Colegio.hasMany(Sede, { foreignKey: "colegioId", as: "sedes" });
    Sede.belongsTo(Colegio, { foreignKey: "colegioId", as: "colegio" });

    /** 👩‍💼 Coordinador ↔ Sede (N:M) */
    Coordinador.belongsToMany(Sede, {
        through: CoordinadorSedes,
        as: "sedes",
        foreignKey: "coordinadorId",
        otherKey: "sedeId"
    });
    Sede.belongsToMany(Coordinador, {
        through: CoordinadorSedes,
        as: "coordinadores",
        foreignKey: "sedeId",
        otherKey: "coordinadorId",
    });

    /** Relaciones directas del modelo intermedio coordinador_sedes */
    CoordinadorSedes.belongsTo(Coordinador, {
        foreignKey: "coordinadorId",
        as: "coordinador",
    });
    Coordinador.hasMany(CoordinadorSedes, {
        foreignKey: "coordinadorId",
        as: "coordinadorSedes",
    });

    CoordinadorSedes.belongsTo(Sede, {
        foreignKey: "sedeId",
        as: "sede",
    });
    Sede.hasMany(CoordinadorSedes, {
        foreignKey: "sedeId",
        as: "coordinadorSedes",
    });

    CoordinadorSedes.belongsTo(Vigencia, {
        foreignKey: "vigenciaId",
        as: "vigencia",
    });
    Vigencia.hasMany(CoordinadorSedes, {
        foreignKey: "vigenciaId",
        as: "coordinadorSedes",
    });

    /** 🧮 Área ↔ Asignatura */
    Area.hasMany(Asignatura, { foreignKey: "areaId", as: "asignaturas" });
    Asignatura.belongsTo(Area, { foreignKey: "areaId", as: "area" });

    /** 📘 Asignatura → Juicios */
    Asignatura.hasMany(Juicio, { foreignKey: "asignaturaId", as: "juicios" });
    Juicio.belongsTo(Asignatura, { foreignKey: "asignaturaId", as: "asignatura" });

    /** 📘 Asociaciones del módulo Juicios (Grado, Dimensión, Desempeño) */
    Grado.hasMany(Juicio, { foreignKey: "gradoId", as: "juicios" });
    Juicio.belongsTo(Grado, { foreignKey: "gradoId", as: "grado" });

    Dimension.hasMany(Juicio, { foreignKey: "dimensionId", as: "juicios" });
    Juicio.belongsTo(Dimension, { foreignKey: "dimensionId", as: "dimension" });

    Desempeno.hasMany(Juicio, { foreignKey: "desempenoId", as: "juicios" });
    Juicio.belongsTo(Desempeno, { foreignKey: "desempenoId", as: "desempeno" });

    Grado.hasOne(ConfigGrado, { foreignKey: "gradoId", as: "configuracion" });
    ConfigGrado.belongsTo(Grado, { foreignKey: "gradoId", as: "grado" });

    Desempeno.hasMany(DesempenoRango, { foreignKey: "desempenoId", as: "rangos" });
    DesempenoRango.belongsTo(Desempeno, { foreignKey: "desempenoId", as: "desempeno" });

    Vigencia.hasMany(DesempenoRango, { foreignKey: "vigenciaId", as: "rangosDesempeno" });
    DesempenoRango.belongsTo(Vigencia, { foreignKey: "vigenciaId", as: "vigencia" });

    /** 👨‍🏫 Docente ↔ Carga / Grupo / Calificaciones */
    Docente.hasMany(Carga, { foreignKey: "docenteId", as: "cargas" });
    Carga.belongsTo(Docente, { foreignKey: "docenteId", as: "docente" });

    Docente.hasMany(Grupo, { foreignKey: "directorId", as: "gruposDirigidos" });
    Grupo.belongsTo(Docente, { foreignKey: "directorId", as: "director" });

    Docente.hasMany(Calificacion, { foreignKey: "docenteId", as: "calificacionesRegistradas" });
    Calificacion.belongsTo(Docente, { foreignKey: "docenteId", as: "docenteResponsable" });

    /** Nivelación ↔ Matrículas / Asignaturas / Docentes */
    Matricula.hasMany(Nivelacion, { foreignKey: "matriculaId", as: "nivelaciones" });
    Nivelacion.belongsTo(Matricula, { foreignKey: "matriculaId", as: "matricula" });

    Asignatura.hasMany(Nivelacion, { foreignKey: "asignaturaId", as: "nivelaciones" });
    Nivelacion.belongsTo(Asignatura, { foreignKey: "asignaturaId", as: "asignatura" });

    Docente.hasMany(Nivelacion, { foreignKey: "docenteId", as: "nivelaciones_realizadas" });
    Nivelacion.belongsTo(Docente, { foreignKey: "docenteId", as: "docente" });

    /** 🏢 Sede ↔ Grupo / Carga / Matrícula */
    Sede.hasMany(Grupo, { foreignKey: "sedeId", as: "grupos" });
    Grupo.belongsTo(Sede, { foreignKey: "sedeId", as: "sede" });

    Sede.hasMany(Carga, { foreignKey: "sedeId", as: "cargas" });
    Carga.belongsTo(Sede, { foreignKey: "sedeId", as: "sede" });

    Sede.hasMany(Matricula, { foreignKey: "sedeId", as: "matriculas" });
    Matricula.belongsTo(Sede, { foreignKey: "sedeId", as: "sede" });

    /** 📚 Matrícula ↔ HistorialMatricula (1:N) */
    Matricula.hasMany(HistorialMatriculas, {
        foreignKey: "matriculaId",
        as: "historiales",
        onDelete: "RESTRICT",
        onUpdate: "CASCADE"
    });

    HistorialMatriculas.belongsTo(Matricula, {
        foreignKey: "matriculaId",
        as: "matricula",
        onDelete: "RESTRICT",
        onUpdate: "CASCADE"
    });

    /** 🎓 Grado ↔ Grupo (1:N) */
    Grado.hasMany(Grupo, {
        foreignKey: "gradoId",
        as: "grupos"
    });

    Grupo.belongsTo(Grado, {
        foreignKey: "gradoId",
        as: "grado"
    });

    /** 👥 Grupo ↔ Carga / Matrícula */
    Grupo.hasMany(Carga, { foreignKey: "grupoId", as: "cargas" });
    Carga.belongsTo(Grupo, { foreignKey: "grupoId", as: "grupo" });

    Grupo.hasMany(Matricula, { foreignKey: "grupoId", as: "matriculas" });
    Matricula.belongsTo(Grupo, { foreignKey: "grupoId", as: "grupo" });

    /** 📘 Asignatura ↔ Carga / Calificación */
    Asignatura.hasMany(Carga, { foreignKey: "asignaturaId", as: "cargas" });
    Carga.belongsTo(Asignatura, { foreignKey: "asignaturaId", as: "asignatura" });

    Asignatura.hasMany(Calificacion, { foreignKey: "asignaturaId", as: "calificaciones" });
    Calificacion.belongsTo(Asignatura, { foreignKey: "asignaturaId", as: "asignatura" });

    /** 👦 Estudiante ↔ Calificación / Matrícula */
    Estudiante.hasMany(Calificacion, { foreignKey: "estudianteId", as: "calificaciones" });
    Calificacion.belongsTo(Estudiante, { foreignKey: "estudianteId", as: "estudiante" });

    Estudiante.hasMany(Matricula, { foreignKey: "estudianteId", as: "matriculas" });
    Matricula.belongsTo(Estudiante, { foreignKey: "estudianteId", as: "estudiante" });

    /** 👨‍👩‍👧 Acudiente ↔ Estudiante (N:M) */
    Acudiente.belongsToMany(Estudiante, {
        through: AcudienteEstudiantes,
        foreignKey: "acudienteId",
        otherKey: "estudianteId",
        as: "estudiantes",
    });

    Estudiante.belongsToMany(Acudiente, {
        through: AcudienteEstudiantes,
        foreignKey: "estudianteId",
        otherKey: "acudienteId",
        as: "acudientes",
    });

    /** Relaciones directas del modelo intermedio acudiente_estudiantes */

    AcudienteEstudiantes.belongsTo(Acudiente, {
        foreignKey: "acudienteId",
        as: "acudiente"
    });
    Acudiente.hasMany(AcudienteEstudiantes, {
        foreignKey: "acudienteId",
        as: "acudienteEstudiantes"
    });

    AcudienteEstudiantes.belongsTo(Estudiante, {
        foreignKey: "estudianteId",
        as: "estudiante"
    });
    Estudiante.hasMany(AcudienteEstudiantes, {
        foreignKey: "estudianteId",
        as: "acudienteEstudiantes"
    });

    /** 📅 Vigencia ↔ entidades dependientes */
    [
        [Grupo, "grupos"],
        [Carga, "cargas"],
        [Matricula, "matriculas"],
        [Calificacion, "calificaciones"],
        [Juicio, "juicios"],
        [Area, "areas"],
        [Asignatura, "asignaturas"],
        [VentanaCalificacion, "ventanasCalificacion"]
    ].forEach(([Modelo, alias]) => {
        Vigencia.hasMany(Modelo, { foreignKey: "vigenciaId", as: alias });
        Modelo.belongsTo(Vigencia, { foreignKey: "vigenciaId", as: "vigencia" });
    });
};