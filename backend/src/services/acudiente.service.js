import { sequelize } from "../database/db.connect.js";
import { Usuario } from "../models/usuario.js";
import { acudienteRepository } from "../repositories/acudiente.repository.js";
import { handleSequelizeError } from "../middleware/handleSequelizeError.js";

export const acudienteService = {

    async list(params) {
        return await acudienteRepository.findAll(params);
    },

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
     * Crear Acudiente (Arquitectura de Fuente Única de Verdad)
     */
    async create(data) {
        const t = await sequelize.transaction();

        try {
            const {
                tipoDocumento, documento, nombre, apellidos,
                direccion, telefono, email
            } = data;

            let usuarioId;
            // Verificar si el documento ya existe en la tabla de Usuarios (podría ser un docente o admin que ahora se registra como papá)
            let usuarioExistente = await Usuario.findOne({ where: { documento }, transaction: t });

            if (usuarioExistente) {
                const acudienteExistente = await acudienteRepository.findByDocumento(documento);
                if (acudienteExistente) {
                    throw new Error("Esta persona ya está registrada como acudiente en el sistema.");
                }

                // Solo sobrescribimos los campos personales básicos, si vienen nuevos datos.
                // No tocamos el password ni el rol (a menos que sea un usuario "dormido" que ahora se activa como acudiente).
                if (nombre) usuarioExistente.nombre = nombre;
                if (apellidos) usuarioExistente.apellidos = apellidos;
                if (email) usuarioExistente.email = email;
                if (telefono) usuarioExistente.telefono = telefono;

                // Guardamos los cambios en la tabla usuarios asegurando la transacción
                await usuarioExistente.save({ transaction: t });

                usuarioId = usuarioExistente.id;
            } else {
                // Creamos el usuario "dormido" (esperando Onboarding)
                const nuevoUsuario = await Usuario.create({
                    nombre,
                    apellidos,
                    documento,
                    email,
                    telefono,
                    password: documento, // Por defecto
                    role: 'acudiente',
                    requiereCambioPassword: true,
                    activo: true
                }, { transaction: t });

                usuarioId = nuevoUsuario.id;
            }

            // Creamos el Acudiente apuntando al ID central
            const nuevoAcudiente = await acudienteRepository.create({
                usuarioId,
                tipoDocumento,
                direccion
            }, t);

            await t.commit();
            return await acudienteRepository.findById(nuevoAcudiente.id);

        } catch (error) {
            await t.rollback();
            throw handleSequelizeError(error);
        }
    },

    /**
     * Actualizar Acudiente (Separando datos en las 2 tablas)
     */
    async update(id, data) {
        const t = await sequelize.transaction();
        try {
            const acudienteActual = await acudienteRepository.findById(id);

            if (!acudienteActual) {
                const error = new Error("No se encontró el acudiente solicitado.");
                error.status = 404;
                throw error;
            }

            // Construir objeto de campos actualizables
            const { tipoDocumento, documento, nombre, apellidos, direccion, telefono, email } = data;

            // 1. Actualizamos el Usuario (Datos personales)
            const datosUsuario = {};
            if (nombre) datosUsuario.nombre = nombre;
            if (apellidos) datosUsuario.apellidos = apellidos;
            if (documento) datosUsuario.documento = documento;
            if (telefono !== undefined) datosUsuario.telefono = telefono;
            if (email !== undefined) datosUsuario.email = email;

            if (Object.keys(datosUsuario).length > 0) {
                await Usuario.update(datosUsuario, {
                    where: { id: acudienteActual.usuarioId },
                    transaction: t
                });
            }

            // 2. Actualizamos el Acudiente (Datos de Rol)
            const datosAcudiente = {};
            if (tipoDocumento) datosAcudiente.tipoDocumento = tipoDocumento;
            if (direccion !== undefined) datosAcudiente.direccion = direccion;

            if (Object.keys(datosAcudiente).length > 0) {
                await acudienteRepository.update(id, datosAcudiente, t);
            }

            await t.commit();
            return await acudienteRepository.findById(id);

        } catch (error) {
            await t.rollback();
            throw handleSequelizeError(error);
        }
    },

    /**
     * Eliminar Acudiente y su Identidad si es pertinente
     */
    async delete(id) {
        const t = await sequelize.transaction();
        try {
            const actual = await acudienteRepository.findById(id);
            if (!actual) {
                const error = new Error("No se encontró el acudiente solicitado.");
                error.status = 404;
                throw error;
            }

            // Destruimos al usuario central. Por el CASCADE en BD, el acudiente morirá automáticamente.
            await Usuario.destroy({ where: { id: actual.usuarioId }, transaction: t });

            await t.commit();
            return true;
        } catch (error) {
            await t.rollback();
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
            const { estudianteId, afinidad, ...datosAcudiente } = data;

            if (!estudianteId || !afinidad || !datosAcudiente.documento) {
                const err = new Error("Para realizar la asignación es obligatorio indicar el estudiante, el parentesco y el número de documento del acudiente.");
                err.status = 400;
                throw err;
            }

            let acudienteId;
            let esNuevoRegistro = false;

            // 1. Buscamos a la persona en la Fuente Única de Verdad (Usuarios)
            let usuario = await Usuario.findOne({ where: { documento: datosAcudiente.documento }, transaction: t });

            if (usuario) {
                // La persona existe, así que actualizamos su información personal
                usuario.nombre = datosAcudiente.nombre;
                usuario.apellidos = datosAcudiente.apellidos;
                if (datosAcudiente.email) usuario.email = datosAcudiente.email;
                if (datosAcudiente.telefono) usuario.telefono = datosAcudiente.telefono;

                await usuario.save({ transaction: t });

                // Ahora revisamos si YA tiene un perfil de acudiente
                const acudienteExistente = await acudienteRepository.findByDocumento(datosAcudiente.documento);

                if (acudienteExistente) {
                    // Ya era acudiente. Le actualizamos los datos de su rol.
                    await acudienteRepository.update(acudienteExistente.id, {
                        tipoDocumento: datosAcudiente.tipoDocumento,
                        direccion: datosAcudiente.direccion
                    }, t);
                    acudienteId = acudienteExistente.id;
                } else {
                    // Era un usuario (ej. docente) pero no acudiente. Le creamos el perfil.
                    const nuevoPerfil = await acudienteRepository.create({
                        usuarioId: usuario.id,
                        tipoDocumento: datosAcudiente.tipoDocumento,
                        direccion: datosAcudiente.direccion
                    }, t);
                    acudienteId = nuevoPerfil.id;
                    esNuevoRegistro = true;
                }

            } else {
                // No existe en absoluto. Creamos al Usuario y a su perfil de Acudiente.
                usuario = await Usuario.create({
                    nombre: datosAcudiente.nombre,
                    apellidos: datosAcudiente.apellidos,
                    documento: datosAcudiente.documento,
                    email: datosAcudiente.email,
                    telefono: datosAcudiente.telefono,
                    password: datosAcudiente.documento, // Por defecto
                    role: 'acudiente',
                    requiereCambioPassword: true,
                    activo: true
                }, { transaction: t });

                const nuevoPerfil = await acudienteRepository.create({
                    usuarioId: usuario.id,
                    tipoDocumento: datosAcudiente.tipoDocumento,
                    direccion: datosAcudiente.direccion
                }, t);

                acudienteId = nuevoPerfil.id;
                esNuevoRegistro = true;
            }

            // 2. El Escudo Anti-Duplicados (Lógica de la Tabla Pivote)
            const relacionExistente = await acudienteRepository.findRelacion(acudienteId, estudianteId);

            if (relacionExistente) {
                if (relacionExistente.afinidad !== afinidad) {
                    await acudienteRepository.updateRelacion(estudianteId, acudienteId, afinidad);
                    await t.commit();
                    return { mensaje: "Parentesco actualizado exitosamente.", acudienteId };
                } else {
                    const err = new Error(`Esta persona ya tiene el parentesco de: ${relacionExistente.afinidad} con el estudiante.`);
                    err.status = 409;
                    throw err;
                }
            }

            // 3. Crear el vínculo definitivo
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
            throw new Error("No se pudo eliminar la relación entre estudiante y acudiente (o no existía).");
        }
        return true;
    },
};