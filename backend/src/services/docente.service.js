import { docenteRepository } from "../repositories/docente.repository.js";
import { Usuario } from "../models/usuario.js";
import { handleSequelizeError } from "../middleware/handleSequelizeError.js";
import { sequelize } from "../database/db.connect.js";

// --- FUNCIÓN AUXILIAR PARA LIMPIAR FECHAS ---
const formatearDatos = (data) => {
    // Creamos una copia para no mutar el original
    const payload = { ...data };

    // Lista de campos tipo FECHA que son opcionales
    const camposFecha = ["fechaNombrado", "fechaIngreso", "fechaRetiro"];

    camposFecha.forEach(campo => {
        // Si viene vacío o es un string vacío, lo forzamos a NULL
        if (!payload[campo] || payload[campo] === "") {
            payload[campo] = null;
        }
    });
    return payload;
};

export const docenteService = {

    /**
     * Listado con paginación y ordenamiento
     */
    async list(params) {
        return await docenteRepository.findAll(params);
    },

    /**
     * Obtener docente por ID
     */
    async get(id) {
        const registro = await docenteRepository.findById(id);
        if (!registro) {
            const err = new Error("No se encontró el docente solicitado.");
            err.status = 404;
            throw err;
        }
        return registro;
    },

    /**
     * Crear docente
     */
    async create(data) {
        const t = await sequelize.transaction();
        try {
            // Limpiamos las fechas vacías antes de guardar
            const datosLimpios = formatearDatos(data);

            // 1. Separamos los datos de identidad de los datos académicos
            const {
                nombre, apellidos, documento, email, telefono, password, activo,
                ...datosDocente
            } = datosLimpios;

            // 2. Creamos el Usuario primero
            const nuevoUsuario = await Usuario.create({
                nombre,
                apellidos,
                documento,
                email,
                telefono,
                password: password || documento, // Contraseña por defecto
                role: 'docente',
                activo: activo !== undefined ? activo : true
            }, { transaction: t });

            // 3. Le pasamos el ID del nuevo usuario al Docente y lo creamos
            datosDocente.usuarioId = nuevoUsuario.id;
            const nuevoDocente = await docenteRepository.create(datosDocente, t);

            await t.commit();

            const completo = await docenteRepository.findById(nuevoDocente.id);
            return { message: "Docente registrado exitosamente.", data: completo };
        } catch (error) {
            await t.rollback();
            throw handleSequelizeError(error);
        }
    },

    /**
     * Actualizar docente por ID
     */
    async update(id, data) {
        const t = await sequelize.transaction();
        try {
            // Limpiamos las fechas vacías antes de actualizar
            const datosLimpios = formatearDatos(data);
            const docenteActual = await docenteRepository.findById(id);

            if (!docenteActual) {
                throw new Error("No se encontró el docente solicitado.");
            }

            // 1. Separar datos
            const {
                nombre, apellidos, documento, email, telefono, password, activo,
                ...datosDocente
            } = datosLimpios;

            // 2. Actualizar el Usuario
            const datosUsuario = { nombre, apellidos, documento, email, telefono, activo };
            if (password) datosUsuario.password = password; // Solo si envían nueva clave

            await Usuario.update(datosUsuario, {
                where: { id: docenteActual.usuarioId },
                transaction: t,
                individualHooks: true // Obligatorio para que encripte la password si se cambió
            });

            // 3. Actualizar el Perfil Académico (Docente)
            await docenteRepository.updateById(id, datosDocente, t);

            await t.commit();

            // Retornamos el objeto completo con su área (si la tiene)
            const completo = await docenteRepository.findById(id);
            return { message: "Docente actualizado exitosamente.", data: completo };
        } catch (error) {
            await t.rollback();
            throw handleSequelizeError(error);
        }
    },

    /**
     * Eliminar docente
     */
    async remove(id) {
        const t = await sequelize.transaction();
        try {
            const docenteActual = await docenteRepository.findById(id);
            if (!docenteActual) {
                throw new Error("No se encontró el docente solicitado para eliminar.");
            }

            // Como configuramos onDelete: CASCADE en el modelo Docente,
            // si eliminamos el Usuario, el Docente se elimina automáticamente.
            // Si el Docente tiene cargas académicas (Carga), el error de FK saltará aquí.
            await Usuario.destroy({
                where: { id: docenteActual.usuarioId },
                transaction: t
            });

            await t.commit();
            return { message: "Docente y sus accesos eliminados exitosamente." };
        } catch (error) {
            await t.rollback();
            throw handleSequelizeError(error);
        }
    }
};