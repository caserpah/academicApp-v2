import { acudienteRepository } from "../repositories/acudiente.repository.js";
import { handleSequelizeError } from "../middleware/handleSequelizeError.js";

export const acudienteService = {

    /**
     * Listar acudientes
     */
    async list(params) {
        return await acudienteRepository.findAll(params);
    },

    /**
     * Obtener por ID
     */
    async get(id) {
        const acudiente = await acudienteRepository.findById(id);
        if (!acudiente) {
            const error = new Error("No se encontró el acudiente solicitado.");
            error.status = 404;
            throw error;
        }
        return acudiente;
    },

    /**
     * Crear Acudiente
     * Se aplica desestructuración (whitelist) y se asume validación previa por middleware.
     */
    async create(data) {
        try {
            const {
                tipoDocumento,
                documento,
                primerNombre,
                segundoNombre,
                primerApellido,
                segundoApellido,
                fechaNacimiento,
                direccion,
                contacto,
                email
            } = data;

            const nuevo = await acudienteRepository.create({
                tipoDocumento,
                documento,
                primerNombre,
                segundoNombre,
                primerApellido,
                segundoApellido,
                fechaNacimiento,
                direccion,
                contacto,
                email
            });

            return nuevo;
        } catch (error) {
            throw handleSequelizeError(error);
        }
    },

    /**
     * Actualizar Acudiente
     */
    async update(id, data) {
        try {
            const actual = await acudienteRepository.findById(id);

            if (!actual) {
                const error = new Error("No se encontró el acudiente solicitado.");
                error.status = 404;
                throw error;
            }

            // Construir objeto de campos actualizables
            const camposActualizables = {};
            const camposPermitidos = [
                "tipoDocumento", "documento",
                "primerNombre", "segundoNombre",
                "primerApellido", "segundoApellido",
                "fechaNacimiento", "direccion",
                "contacto", "email"
            ];

            for (const campo of camposPermitidos) {
                if (data[campo] !== undefined) {
                    camposActualizables[campo] = data[campo];
                }
            }

            if (Object.keys(camposActualizables).length === 0) {
                const err = new Error("Debe proporcionar al menos un campo para actualizar.");
                err.status = 400;
                throw err;
            }

            return await acudienteRepository.update(id, camposActualizables);

        } catch (error) {
            throw handleSequelizeError(error);
        }
    },

    /**
     * LÓGICA DE NEGOCIO AVANZADA:
     * 1. Busca si el acudiente existe (por documento).
     * 2. Si no existe, lo crea.
     * 3. Si existe, actualiza sus datos básicos (opcional, pero útil).
     * 4. Crea la relación con el estudiante (si no existía ya).
     */
    async asignarEstudiante(data) {
        const { estudianteId, afinidad, ...datosAcudiente } = data;

        try {
            // 1. Validar datos mínimos
            if (!estudianteId || !afinidad || !datosAcudiente.documento) {
                const err = new Error("Para realizar la asignación es obligatorio indicar el estudiante, el parentesco y el número de documento del acudiente.");
                err.status = 400;
                throw err;
            }

            // 2. Buscar o Crear Acudiente
            let acudiente = await acudienteRepository.findByDocumento(datosAcudiente.documento);
            let acudienteId;
            let esNuevoRegistro = false;

            if (acudiente) { // ¿El acudiente existe?
                // Actualizamos sus datos básicos
                await acudienteRepository.update(acudiente.id, datosAcudiente);
                acudienteId = acudiente.id;
            } else {
                // ¿NO Existe? -> Lo creamos
                const nuevoAcudiente = await acudienteRepository.create(datosAcudiente);
                acudienteId = nuevoAcudiente.id;
                esNuevoRegistro = true;
            }

            // 3. Verificar si ya tienen vínculo para no duplicar
            const relacionExistente = await acudienteRepository.findRelacion(acudienteId, estudianteId);

            if (relacionExistente) {
                // Si existe, pero con diferente afinidad, la actualizamos
                if (relacionExistente.afinidad !== afinidad) {
                    await acudienteRepository.updateRelacion(estudianteId, acudienteId, afinidad);

                    return {
                        mensaje: "El vínculo de acudiente con el estudiante ha sido actualizado exitosamente.",
                        acudienteId
                    };
                } else{
                    // Si es la misma afinidad, lanzamos error
                    const err = new Error(`Esta persona ya se encuentra registrada como acudiente de este estudiante con el parentesco de: ${relacionExistente.afinidad}.`);
                    err.status = 409; // Conflicto
                    throw err;
                }
            }

            // 4. Crear el vínculo
            const vinculo = await acudienteRepository.crearRelacion({
                acudienteId,
                estudianteId,
                afinidad
            });

            const mensajeExito = esNuevoRegistro
                ? "Acudiente registrado en el sistema y asignado al estudiante exitosamente."
                : "El acudiente ha sido asignado al estudiante exitosamente.";

            return {
                mensaje: mensajeExito,
                acudienteId
            };

        } catch (error) {
            throw handleSequelizeError(error);
        }
    },

    async desvincularAcudiente(estudianteId, acudienteId) {
        const resultado = await acudienteRepository.desvincularAcudiente(estudianteId, acudienteId);
        if (!resultado) {
            throw new Error("No se pudo eliminar la relación entre estudiante y acudiente (o no existía).");
        }
        return true;
    },
};