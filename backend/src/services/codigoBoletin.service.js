import { sequelize } from "../database/db.connect.js";
import { codigoBoletinRepository } from "../repositories/codigoBoletin.repository.js";
import { matriculaRepository } from "../repositories/matricula.repository.js"; // Para buscar los estudiantes del salón
import { handleSequelizeError } from "../middleware/handleSequelizeError.js";

/**
 * ==========================================
 * UTILERÍA: Generador de Tokens Legibles
 * ==========================================
 * Genera un código de 8 caracteres alfanuméricos separados por un guion.
 * Excluye caracteres ambiguos: O, 0, I, 1, L, l
 */
const generarCodigoSeguro = () => {
    const caracteres = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // Alfabeto limpio
    let codigo = "";
    for (let i = 0; i < 8; i++) {
        codigo += caracteres.charAt(Math.floor(Math.random() * caracteres.length));
    }
    // Formato final: XXXX-XXXX
    return `${codigo.substring(0, 4)}-${codigo.substring(4, 8)}`;
};

export const codigoBoletinService = {

    /**
     * ==========================================
     * ACCESO PÚBLICO (EL PUENTE DEL ACUDIENTE)
     * ==========================================
     */
    async descargarBoletinPublico(codigoStr) {
        // 1. Buscamos el código en la base de datos
        const registro = await codigoBoletinRepository.findByCodigoPublico(codigoStr);

        if (!registro) {
            const err = new Error("El código ingresado no existe, caducó o ha sido deshabilitado.");
            err.status = 404;
            throw err;
        }

        // 2. Si tiene fecha de expiración, validamos que no haya vencido
        if (registro.fechaExpiracion && new Date() > new Date(registro.fechaExpiracion)) {
            const err = new Error("Este código de descarga ha expirado.");
            err.status = 403;
            throw err;
        }

        // 3. Registramos la descarga (Auditoría)
        // Lo hacemos en segundo plano (sin await que bloquee) para que el PDF cargue más rápido
        codigoBoletinRepository.registrarDescarga(registro.id).catch(console.error);

        // 4. Devolvemos el "pasaporte" para que el Controller llame a tu función generadora de PDF
        return {
            matriculaId: registro.matriculaId,
            periodo: registro.periodo,
            vigenciaId: registro.vigenciaId,
            estudiante: registro.matricula.estudiante,
            grupo: registro.matricula.grupo,
            vigencia: registro.vigencia
        };
    },

    /**
     * ==========================================
     * GENERACIÓN MASIVA (SECRETARÍA)
     * ==========================================
     * Crea códigos para todos los estudiantes activos de un grupo en un periodo.
     */
    async generarCodigosLote(grupoId, vigenciaId, periodo, usuarioGeneracionId) {
        const t = await sequelize.transaction();

        try {
            // 1. Validar si ya se generaron códigos para evitar duplicar el trabajo
            const yaExisten = await codigoBoletinRepository.existenCodigosParaGrupo(grupoId, vigenciaId, periodo, { transaction: t });
            if (yaExisten) {
                const err = new Error(`Ya existen códigos generados para este grupo en el periodo ${periodo}.`);
                err.status = 409;
                throw err;
            }

            // 2. Buscar a todos los estudiantes ACTIVOS en ese grupo y vigencia
            const matriculasData = await matriculaRepository.findAll({
                grupoId,
                vigenciaId,
                estado: "ACTIVA",
                limit: 200 // Un límite alto para abarcar el salón completo
            });

            const matriculas = matriculasData.items;

            if (!matriculas || matriculas.length === 0) {
                const err = new Error("No se encontraron estudiantes activos matriculados en este grupo para generar códigos.");
                err.status = 404;
                throw err;
            }

            // 3. Fabricar el lote de códigos
            const codigosNuevos = matriculas.map((mat) => ({
                codigo: generarCodigoSeguro(),
                matriculaId: mat.id,
                vigenciaId: vigenciaId,
                periodo: periodo,
                activo: true,
                descargas: 0,
                usuarioGeneracion: usuarioGeneracionId
                // fechaExpiracion: Para calcularla aquí si el colegio tiene una regla de ej: +30 días
            }));

            // 4. Guardar masivamente en la base de datos
            await codigoBoletinRepository.createBulk(codigosNuevos, { transaction: t });

            await t.commit();
            return {
                mensaje: `Se generaron exitosamente ${codigosNuevos.length} códigos de descarga.`,
                totalGenerados: codigosNuevos.length
            };

        } catch (error) {
            await t.rollback();
            throw handleSequelizeError(error);
        }
    },

    /**
     * ==========================================
     * GESTIÓN ADMINISTRATIVA
     * ==========================================
     */
    async obtenerCodigosDeGrupo(filtros) {
        return await codigoBoletinRepository.findByGrupoYPeriodo(filtros);
    },

    async alternarEstado(id, estado) {
        const nuevoEstado = !estado; // Si era true pasa a false, y viceversa
        const exito = await codigoBoletinRepository.cambiarEstado(id, nuevoEstado);

        if (!exito) {
            throw new Error("No se pudo actualizar el estado del código.");
        }

        return {
            mensaje: nuevoEstado ? "Código habilitado correctamente." : "Código bloqueado temporalmente.",
            activo: nuevoEstado
        };
    },

    /**
     * Obtiene el código existente para un estudiante en un periodo
     */
    async obtenerCodigoPorMatricula(matriculaId, periodo) {
        return await codigoBoletinRepository.obtenerPorMatriculaYPeriodo(matriculaId, periodo);
    },

    /**
     * Genera y guarda un código nuevo para un estudiante
     */
    async generarCodigoUnitario(matriculaId, vigenciaId, periodo, usuarioGeneracionId) {
        const nuevoCodigo = generarCodigoSeguro(); // Usamos la función interna de este archivo

        // Delegamos la creación al repositorio
        return await codigoBoletinRepository.crear({
            codigo: nuevoCodigo,
            matriculaId,
            vigenciaId,
            periodo,
            activo: true,
            descargas: 0,
            usuarioGeneracion: usuarioGeneracionId
        });
    }
};