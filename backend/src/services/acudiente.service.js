import { sequelize } from "../database/db.connect.js";
import { Usuario } from "../models/usuario.js";
import { acudienteRepository } from "../repositories/acudiente.repository.js";
import { handleSequelizeError } from "../middleware/handleSequelizeError.js";
import { BusinessWarning, BusinessInfo } from "../utils/AppError.js";

export const acudienteService = {

    async list(params) {
        return await acudienteRepository.findAll(params);
    },

    async get(id) {
        const acudiente = await acudienteRepository.findById(id);
        if (!acudiente) {
            throw new BusinessInfo("No se encontró el acudiente solicitado.", "Registro no encontrado", 404);
        }
        return acudiente;
    },

    /**
     * Crear Acudiente (Independiente para Matrículas)
     */
    async create(data) {
        try {

            // --- Limpiamos la fecha antes de procesarla ---
            if (!data.fechaNacimiento || String(data.fechaNacimiento).trim() === "" || data.fechaNacimiento === "Invalid date") {
                data.fechaNacimiento = null;
            }

            // Verificar si el acudiente ya existe por documento
            const existente = await acudienteRepository.findOne({ where: { documento: data.documento } });
            if (existente) {
                throw new BusinessWarning("Ya existe un acudiente registrado con este número de documento.", "Acudiente duplicado", 409);
            }

            // Crear directamente en la tabla Acudientes (usuarioId quedará en NULL)
            const nuevoAcudiente = await acudienteRepository.create(data);
            return await acudienteRepository.findById(nuevoAcudiente.id);

        } catch (error) {
            throw handleSequelizeError(error);
        }
    },

    /**
     * Actualizar Acudiente
     */
    async update(id, data) {
        try {
            const acudienteActual = await acudienteRepository.findById(id);

            // --- Limpiamos la fecha antes de procesarla ---
            if (!data.fechaNacimiento || String(data.fechaNacimiento).trim() === "" || data.fechaNacimiento === "Invalid date") {
                data.fechaNacimiento = null;
            }

            if (!acudienteActual) {
                throw new BusinessInfo("No se encontró el acudiente solicitado.", "Registro no encontrado", 404);
            }

            await acudienteRepository.update(id, data);
            return await acudienteRepository.findById(id);

        } catch (error) {
            throw handleSequelizeError(error);
        }
    },

    /**
     * Eliminar Acudiente (Solo elimina el registro de Acudientes)
     */
    async delete(id) {
        try {
            const actual = await acudienteRepository.findById(id);
            if (!actual) {
                throw new BusinessInfo("No se encontró el acudiente solicitado.", "Registro no encontrado", 404);
            }

            await acudienteRepository.delete(id);
            return true;
        } catch (error) {
            throw handleSequelizeError(error);
        }
    },

    /**
     * LÓGICA DE NEGOCIO AVANZADA:
     * 1. Busca si el acudiente existe (por documento).
     * 2. Si no existe, lo crea.
     * 3. Si existe, actualiza sus datos básicos
     * 4. Crea la relación con el estudiante (si no existía ya).
     */
    async asignarEstudiante(data) {
        const t = await sequelize.transaction();

        try {
            let { estudianteId, afinidad, ...datosAcudiente } = data;

            // --- Limpiamos la fecha antes de procesarla ---
            if (!datosAcudiente.fechaNacimiento || String(datosAcudiente.fechaNacimiento).trim() === "" || datosAcudiente.fechaNacimiento === "Invalid date") {
                datosAcudiente.fechaNacimiento = null;
            }

            if (!estudianteId || !afinidad || !datosAcudiente.documento) {
                throw new BusinessWarning("Para realizar la asignación es obligatorio indicar el estudiante, el parentesco y el número de documento del acudiente.", "Datos incompletos", 400);
            }

            let acudienteId;
            let esNuevoRegistro = false;

            // 1. Verificar si el acudiente ya existe por su número de documento
            let acudiente = await acudienteRepository.findOne({ where: { documento: datosAcudiente.documento }, transaction: t });

            if (acudiente) {
                // Actualizamos datos por si cambiaron de teléfono o dirección
                await acudienteRepository.update(acudiente.id, datosAcudiente, t);
                acudienteId = acudiente.id;
            } else {
                // Lo creamos limpio
                const nuevoPerfil = await acudienteRepository.create(datosAcudiente, t);
                acudienteId = nuevoPerfil.id;
                esNuevoRegistro = true;
            }

            // 2. Lógica de la Tabla Pivote

            // A) Verificar si el estudiante YA tiene a ALGUIEN MÁS asignado en ese parentesco (Ej: Ya tiene una "MADRE")
            const parentescoOcupado = await acudienteRepository.verificarParentesco(estudianteId, afinidad);

            if (parentescoOcupado && parentescoOcupado.acudienteId !== acudienteId) {
                throw new BusinessWarning(
                    `El estudiante ya tiene registrado a alguien con el parentesco de ${afinidad}. Debe desvincularlo primero si desea reemplazarlo.`,
                    "Parentesco ocupado",
                    409
                );
            }

            // B) Verificar si ESTA PERSONA ya está vinculada al estudiante
            const relacionExistente = await acudienteRepository.findRelacion(acudienteId, estudianteId);

            if (relacionExistente) {
                if (relacionExistente.afinidad !== afinidad) {
                    await acudienteRepository.updateRelacion(estudianteId, acudienteId, afinidad, t);
                    await t.commit();
                    return { mensaje: "Parentesco actualizado exitosamente.", acudienteId };
                } else {
                    await t.commit();
                    return { mensaje: "Datos del acudiente actualizados exitosamente.", acudienteId };
                }
            }

            // 3. Crear el vínculo
            await acudienteRepository.crearRelacion({ acudienteId, estudianteId, afinidad }, t);

            await t.commit();
            return {
                mensaje: esNuevoRegistro ? "Acudiente registrado y asignado exitosamente." : "Acudiente asignado exitosamente.",
                acudienteId
            };

        } catch (error) {
            await t.rollback();
            throw handleSequelizeError(error);
        }
    },

    async desvincularAcudiente(estudianteId, acudienteId) {
        const resultado = await acudienteRepository.desvincularAcudiente(estudianteId, acudienteId);
        if (!resultado) {
            throw new BusinessInfo("No se pudo eliminar la relación entre estudiante y acudiente (o no existía).", "Relación no encontrada", 404);
        }
        return true;
    },

    /**
     * Habilitar Acceso Web (Crea el Usuario y lo vincula al Acudiente)
     */
    async habilitarAccesoWeb(acudienteId) {
        const t = await sequelize.transaction();

        try {
            const acudiente = await acudienteRepository.findById(acudienteId);

            if (!acudiente) {
                throw new BusinessInfo("Acudiente no encontrado.", "Registro no encontrado", 404);
            }
            if (acudiente.usuarioId) {
                throw new BusinessWarning("Este acudiente ya tiene una cuenta web habilitada.", "Cuenta ya existente", 409);
            }

            // 1. Verificamos si, por casualidad, el documento ya existe en usuarios (ej: es un profesor)
            let usuario = await Usuario.findOne({ where: { documento: acudiente.documento }, transaction: t });

            // 2. Si no existe, le creamos su cuenta nueva
            if (!usuario) {
                usuario = await Usuario.create({
                    nombre: acudiente.nombres,
                    apellidos: acudiente.apellidos,
                    documento: acudiente.documento,
                    email: acudiente.email || null, // Si no tiene correo, queda nulo
                    telefono: acudiente.telefono || null,
                    password: acudiente.documento, // Por defecto, su cédula será su contraseña
                    role: 'acudiente',
                    requiereCambioPassword: true, // Para que cambie la clave al entrar por primera vez
                    activo: true
                }, { transaction: t });
            }

            // 3. Vinculamos el ID del usuario recién creado/encontrado al acudiente
            await acudienteRepository.update(acudiente.id, { usuarioId: usuario.id }, t);

            await t.commit();
            return {
                mensaje: "Acceso web habilitado exitosamente.",
                usuarioId: usuario.id
            };

        } catch (error) {
            await t.rollback();
            throw handleSequelizeError(error);
        }
    }
};