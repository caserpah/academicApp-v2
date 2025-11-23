import { Colegio } from "../../models/colegio.js";
import { Sede } from "../../models/sede.js";
import { Coordinador } from "../../models/coordinador.js";
import { CoordinadorSedes } from "../../models/coordinador_sedes.js";
import { Area } from "../../models/area.js";
import { Asignatura } from "../../models/asignatura.js";
import { Indicador } from "../../models/indicador.js";
import { Juicio } from "../../models/juicio.js";
import { Docente } from "../../models/docente.js";
import { Carga } from "../../models/carga.js";
import { Grupo } from "../../models/grupo.js";
import { Estudiante } from "../../models/estudiante.js";
import { Acudiente } from "../../models/acudiente.js";
import { AcudienteEstudiantes } from "../../models/acudiente_estudiantes.js";
import { Matricula } from "../../models/matricula.js";
import { Calificacion } from "../../models/calificacion.js";
import { Usuario } from "../../models/usuario.js";
import { Vigencia } from "../../models/vigencia.js";
import { VentanaCalificacion } from "../../models/ventana_calificacion.js";

export const definirAsociaciones = () => {

    /** 🏫 Colegio ↔ Sede */
    Colegio.hasMany(Sede, { foreignKey: "colegioId", as: "sedes" });
    Sede.belongsTo(Colegio, { foreignKey: "colegioId", as: "colegio" });

    /** 👩‍💼 Coordinador ↔ Sede (N:M) */
    Coordinador.belongsToMany(Sede, {
        through: CoordinadorSedes,
        foreignKey: "coordinadorId",
        otherKey: "sedeId",
        as: "sedes",
    });
    Sede.belongsToMany(Coordinador, {
        through: CoordinadorSedes,
        foreignKey: "sedeId",
        otherKey: "coordinadorId",
        as: "coordinadores",
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

    /** 🧑‍🏫 Área ↔ Docente (1:N) */
    Area.hasMany(Docente, { foreignKey: "areaId", as: "docentes" });
    Docente.belongsTo(Area, { foreignKey: "areaId", as: "area" });

    /** 📘 Indicador ↔ Juicio */
    Indicador.hasMany(Juicio, { foreignKey: "indicadorId", as: "juicios" });
    Juicio.belongsTo(Indicador, { foreignKey: "indicadorId", as: "indicador" });

    /** 📘 Asignatura → Juicios */
    Asignatura.hasMany(Juicio, { foreignKey: "asignaturaId", as: "juicios" });
    Juicio.belongsTo(Asignatura, { foreignKey: "asignaturaId", as: "asignatura" });

    /** 👨‍🏫 Docente ↔ Carga / Grupo */
    Docente.hasMany(Carga, { foreignKey: "docenteId", as: "cargas" });
    Carga.belongsTo(Docente, { foreignKey: "docenteId", as: "docente" });

    Docente.hasMany(Grupo, { foreignKey: "directorId", as: "gruposDirigidos" });
    Grupo.belongsTo(Docente, { foreignKey: "directorId", as: "director" });

    /** 🏢 Sede ↔ Grupo / Carga / Matrícula */
    Sede.hasMany(Grupo, { foreignKey: "sedeId", as: "grupos" });
    Grupo.belongsTo(Sede, { foreignKey: "sedeId", as: "sede" });

    Sede.hasMany(Carga, { foreignKey: "sedeId", as: "cargas" });
    Carga.belongsTo(Sede, { foreignKey: "sedeId", as: "sede" });

    Sede.hasMany(Matricula, { foreignKey: "sedeId", as: "matriculas" });
    Matricula.belongsTo(Sede, { foreignKey: "sedeId", as: "sede" });

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
        [Indicador, "indicadores"],
        [Juicio, "juicios"],
        [Area, "areas"],
        [Asignatura, "asignaturas"],
        [VentanaCalificacion, "ventanasCalificacion"]
    ].forEach(([Modelo, alias]) => {
        Vigencia.hasMany(Modelo, { foreignKey: "vigenciaId", as: alias });
        Modelo.belongsTo(Vigencia, { foreignKey: "vigenciaId", as: "vigencia" });
    });
};