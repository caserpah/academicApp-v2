import { Grupo } from "../models/grupo.js";
import { Grado } from "../models/grado.js";
import { Sede } from "../models/sede.js";
import { Matricula } from "../models/matricula.js";
import { Estudiante } from "../models/estudiante.js";
import { Docente } from "../models/docente.js";
import { Colegio } from "../models/colegio.js";

export const planillaRepository = {

    async findColegio() {
        return Colegio.findOne(); // Trae el registro de la institución
    },

    async findGrupoConDetalles(grupoId, vigenciaId) {
        return Grupo.findOne({
            where: { id: grupoId, vigenciaId },
            include: [
                { model: Grado, as: 'grado' },
                { model: Sede, as: 'sede' }
            ]
        });
    },

    async findDocentePorUsuarioId(usuarioId) {
        return Docente.findOne({ where: { usuarioId } });
    },

    async findMatriculasActivasPorGrupo(grupoId, vigenciaId) {
        return Matricula.findAll({
            where: {
                grupoId,
                vigenciaId,
                estado: 'ACTIVA' // Solo estudiantes activos
            },
            include: [{
                model: Estudiante,
                as: 'estudiante',
                attributes: ['documento', 'primerApellido', 'segundoApellido', 'primerNombre', 'segundoNombre']
            }],
            order: [
                [{ model: Estudiante, as: 'estudiante' }, 'primerApellido', 'ASC'],
                [{ model: Estudiante, as: 'estudiante' }, 'segundoApellido', 'ASC'],
                [{ model: Estudiante, as: 'estudiante' }, 'primerNombre', 'ASC'],
                [{ model: Estudiante, as: 'estudiante' }, 'segundoNombre', 'ASC']
            ]
        });
    }
};