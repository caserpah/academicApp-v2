import { estudianteRepository } from "../repositories/estudiante.repository.js";
import { handleSequelizeError } from "../middleware/handleSequelizeError.js";
import { formatearErrorForaneo } from "../utils/dbUtils.js";

export const estudianteService = {
    /**
     * Listar estudiantes con filtros avanzados.
     */
    async list(params) {
        const {
            page = Number(params.page) || 1,
            limit = Number(params.limit) || 10,
            orderBy = params.orderBy || "primerApellido",
            order = params.order || "ASC",
            search = params.search || params.busqueda || null,
            sexo,
            barrio,
            estrato,
            discapacidad,
            etnia,
            victimas,
            subsidiado,
            sisben,
            includeMatriculas,
        } = params;

        const vigenciaId = params.vigenciaId; // si viene desde req.vigenciaActual en controller

        return estudianteRepository.findAll({
            page,
            limit,
            orderBy,
            order,
            search,
            sexo,
            barrio,
            estrato,
            discapacidad,
            etnia,
            victimas,
            subsidiado,
            sisben,
            includeMatriculas,
            vigenciaId,
        });
    },

    /**
     * Obtener un estudiante por ID (con matrículas opcionales).
     */
    async get(id, { includeMatriculas = false, vigenciaId = null } = {}) {
        const registro = await estudianteRepository.findById(id, {
            includeMatriculas,
            vigenciaId,
        });

        if (!registro) {
            const err = new Error("No se encontró el estudiante solicitado.");
            err.status = 404;
            throw err;
        }
        return registro;
    },

    /**
     * Crear un estudiante.
     */
    async create(data) {
        try {
            // desestructuración por seguridad
            const {
                tipoDocumento,
                documento,
                primerNombre,
                segundoNombre,
                primerApellido,
                segundoApellido,
                fechaNacimiento,
                sexo,
                rh,
                direccion,
                barrio,
                contacto,
                estrato,
                sisben,
                subsidiado,
                eps,
                victimas,
                discapacidad,
                capacidades,
                etnia
            } = data;

            const nuevo = await estudianteRepository.create({
                tipoDocumento,
                documento,
                primerNombre,
                segundoNombre,
                primerApellido,
                segundoApellido,
                fechaNacimiento,
                sexo,
                rh,
                direccion,
                barrio,
                contacto,
                estrato,
                sisben,
                subsidiado,
                eps,
                victimas,
                discapacidad,
                capacidades,
                etnia,
            });

            return nuevo;

        } catch (error) {
            throw handleSequelizeError(error);
        }
    },

    /**
     * Actualizar un estudiante.
     */
    async update(id, data) {
        try {
            const actual = await estudianteRepository.findById(id);

            if (!actual) {
                const err = new Error("No se encontró el estudiante solicitado.");
                err.status = 404;
                throw err;
            }

            // construir objeto limpio para actualizar
            const camposActualizables = {};

            const campos = [
                "tipoDocumento", "documento",
                "primerNombre", "segundoNombre",
                "primerApellido", "segundoApellido",
                "fechaNacimiento", "sexo", "rh",
                "direccion", "barrio", "contacto",
                "estrato", "sisben", "subsidiado",
                "eps", "victimas", "discapacidad",
                "capacidades", "etnia"
            ];

            for (const campo of campos) {
                if (data[campo] !== undefined) {
                    camposActualizables[campo] = data[campo];
                }
            }

            if (Object.keys(camposActualizables).length === 0) {
                const err = new Error("Debe proporcionar al menos un campo para actualizar.");
                err.status = 400;
                throw err;
            }

            await estudianteRepository.updateById(id, camposActualizables);

            return estudianteRepository.findById(id);

        } catch (error) {
            throw handleSequelizeError(error);
        }
    },

    /**
     * Eliminar estudiante.
     * Bloqueado por FK si tiene matrículas o acudientes asociados.
     */
    async remove(id) {
        try {
            const registro = await estudianteRepository.findById(id);

            if (!registro) {
                const err = new Error("No se encontró el estudiante solicitado.");
                err.status = 404;
                throw err;
            }

            const eliminado = await estudianteRepository.deleteById(id);

            if (!eliminado) {
                const err = new Error("Ocurrió un error al eliminar el estudiante.");
                err.status = 400;
                throw err;
            }

            return true;

        } catch (error) {
            throw formatearErrorForaneo(
                error,
                "este estudiante",
                "matrículas o calificaciones asociadas"
            );
        }
    },

    async addAcudiente(estudianteId, data) {
        const { acudienteId, afinidad } = data;

        // Validar que el estudiante exista
        const estudiante = await estudianteRepository.findById(estudianteId);
        if (!estudiante) throw new Error("Estudiante no encontrado.");

        // Validar si ya existe la relación
        const relacionExistente = await estudianteRepository.findRelacion(estudianteId, acudienteId);
        if (relacionExistente) {
            throw new Error("Este estudiante ya está asignado al acudiente.");
        }

        // Crear la relación
        return await estudianteRepository.addAcudiente(estudianteId, acudienteId, afinidad);
    },

    /**
     * Remover acudiente
     */
    async removeAcudiente(estudianteId, acudienteId) {
        const resultado = await estudianteRepository.removeAcudiente(estudianteId, acudienteId);
        if (!resultado) {
            throw new Error("No se pudo eliminar la relación entre estudiante y acudiente (o no existía).");
        }
        return true;
    }
};