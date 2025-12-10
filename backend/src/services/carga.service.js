import { cargaRepository } from "../repositories/carga.repository.js";
import { Grupo } from "../models/grupo.js";
import { Carga } from "../models/carga.js";
import { handleSequelizeError } from "../middleware/handleSequelizeError.js";

/**
 * Genera un código único tipo:
 *   C<grupoId>A<asignaturaId>R<contador>
 *
 * Ejemplo: C7A15R1
 */
async function generarCodigo(grupoId, asignaturaId, vigenciaId) {
    // Buscar cuántas cargas existen con esta combinación
    const count = await Carga.count({
        where: { grupoId, asignaturaId, vigenciaId }
    });

    const consecutivo = count + 1;

    return `C${grupoId}A${asignaturaId}R${consecutivo}`;
}

export const cargaService = {

    async list(params, vigenciaId) {
        const page = Number(params.page) || 1;
        const limit = Number(params.limit) || 10;

        const orderBy = params.orderBy || "Id";
        const order = params.order || "ASC";

        return cargaRepository.findAll({
            ...params,
            vigenciaId,
            page,
            limit,
            orderBy,
            order
        });
    },

    async get(id, vigenciaId) {
        const registro = await cargaRepository.findById(id, vigenciaId);
        if (!registro) {
            const err = new Error("La carga académica no pertenece a la vigencia activa.");
            err.status = 404;
            throw err;
        }
        return registro;
    },

    async create(data, vigenciaId) {
        try {
            const { docenteId, grupoId, asignaturaId, horas } = data;

            // Validar que el grupo pertenezca a la vigencia activa
            const grupo = await Grupo.findOne({ where: { id: grupoId, vigenciaId } });
            if (!grupo) {
                const err = new Error("El grupo seleccionado no pertenece a la vigencia activa.");
                err.status = 400;
                throw err;
            }

            // Crear código autogenerado
            const codigo = await generarCodigo(grupoId, asignaturaId, vigenciaId);

            const nueva = await cargaRepository.create({
                codigo,
                docenteId,
                grupoId,
                asignaturaId,
                horas,
                sedeId: data.sedeId,
                vigenciaId,
            });

            return cargaRepository.findById(nueva.id, vigenciaId);

        } catch (error) {
            throw handleSequelizeError(error);
        }
    },

    async update(id, data, vigenciaId) {
        try {
            const existe = await Carga.findOne({ where: { id, vigenciaId } });

            if (!existe) {
                const err = new Error("No se encontró la carga académica solicitada.");
                err.status = 404;
                throw err;
            }

            const camposActualizables = {};

            // Si envía un nuevo grupoId → validar que pertenezca a la vigencia activa
            if (data.grupoId !== undefined) {
                const grupo = await Grupo.findOne({
                    where: { id: data.grupoId, vigenciaId }
                });

                if (!grupo) {
                    const err = new Error("El grupo seleccionado no pertenece a la vigencia activa.");
                    err.status = 400;
                    throw err;
                }

                camposActualizables.grupoId = data.grupoId;
            }

            if (data.docenteId !== undefined) camposActualizables.docenteId = data.docenteId;
            if (data.grupoId !== undefined) camposActualizables.grupoId = data.grupoId;
            if (data.asignaturaId !== undefined) camposActualizables.asignaturaId = data.asignaturaId;
            if (data.horas !== undefined) camposActualizables.horas = data.horas;
            if (data.sedeId !== undefined) camposActualizables.sedeId = data.sedeId;

            await cargaRepository.updateById(id, vigenciaId, camposActualizables);

            return cargaRepository.findById(id, vigenciaId);

        } catch (error) {
            throw handleSequelizeError(error);
        }
    },


    async remove(id, vigenciaId) {
        try {
            const existe = await cargaRepository.findById(id, vigenciaId);

            if (!existe) {
                const err = new Error("No se encontró la carga académica solicitada.");
                err.status = 404;
                throw err;
            }

            await cargaRepository.deleteById(id, vigenciaId);
            return true;

        } catch (error) {
            throw handleSequelizeError(error);
        }
    }
};