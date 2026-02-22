import { sequelize } from "../database/db.connect.js";
import { calificacionRepository } from "../repositories/calificacion.repository.js";
import { VentanaCalificacion } from "../models/ventana_calificacion.js";
import { Asignatura } from "../models/asignatura.js";
import { DesempenoRango } from "../models/desempeno_rango.js";
import { Desempeno } from "../models/desempeno.js";
import { handleSequelizeError } from "../middleware/handleSequelizeError.js";
import { Juicio } from "../models/juicio.js";
import { Matricula } from "../models/matricula.js";
import { Grado } from "../models/grado.js";
import { Grupo } from "../models/grupo.js";

// Porcentajes Institucionales
const PORCENTAJES = {
    ACADEMICA: 0.50,
    ACUMULATIVA: 0.20,
    LABORAL: 0.15,
    SOCIAL: 0.15
};

// Competencias
const DIM = {
    ACADEMICA: 1,
    SOCIAL: 2,
    LABORAL: 3,
    ACUMULATIVA: 4,
    COMPORTAMIENTO: 999
};

/**
 * Helper: Validar Ventana de Calificaciones
 * Lógica Simplificada:
 * 1. La ventana se define ESTRICTAMENTE por fechas.
 * 2. Docentes: Solo pueden editar dentro de las fechas.
 * 3. Admins: Pueden editar fuera de fecha SI justifican o es solo texto.
 */
async function _validarVentana(periodo, vigenciaId, data, esSoloCambioTexto = false) {

    // // Si data.notaDefinitivaInput existe, es comportamiento
    // if (data.notaDefinitivaInput !== undefined && data.notaAcademica === undefined) {
    //      return true; // Comportamiento no pide justificación
    // }

    //Verificar existencia de la Ventana
    const ventana = await VentanaCalificacion.findOne({ where: { periodo, vigenciaId } });

    if (!ventana) {
        throw new Error("Para este periodo aún no se ha creado la ventana de calificaciones. Comuníquese con el administrador del sistema.");
    }

    // Verificar estado de la Ventana de calificaciones
    const hoy = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const estaEnFecha = hoy >= ventana.fechaInicio && hoy <= ventana.fechaFin;

    // Si está dentro de fechas todos pasan (Docentes y Admins)
    if (estaEnFecha) return true;

    // Verificamos si es un usuario con privilegios administrativos
    // Roles permitidos según BD: 'admin', 'director', 'coordinador'
    const ROLES_ADMINISTRATIVOS = ['admin', 'director', 'coordinador'];
    const esAdministrativo = ROLES_ADMINISTRATIVOS.includes(data.role);

    // CASO DOCENTE: Si la ventana está cerrada, SE BLOQUEA SIEMPRE.
    if (!esAdministrativo) {
        throw new Error(`El periodo de calificaciones está cerrado (Cierre: ${ventana.fechaFin}).`);
    }

    // CASO ADMINISTRATIVO: Fuera de fecha
    if (esAdministrativo) {
        // Excepción 1: Es Comportamiento (No pide justificación)
        // Detectamos comportamiento si viene el campo 'notaDefinitivaInput'
        if (data.notaDefinitivaInput !== undefined) {
            return true;
        }

        // Excepción 2: Es solo un cambio de recomendación/texto
        if (esSoloCambioTexto) return true;

        // Excepción 3: Cambio numérico (Académico) con justificación
        if (data.observacion_cambio && data.observacion_cambio.trim().length > 5) {
            return true; // Acceso concedido por excepción
        }
    }

    // Si falla todo lo anterior: REQ_JUSTIFICACION
    const error = new Error("El periodo académico está cerrado. Se requiere justificación administrativa.");
    error.code = "REQ_JUSTIFICACION";
    throw error;
}

/**
 * Helper: Determinar el Texto del Juicio aplicando TODAS las Reglas de Negocio.
 */
async function _obtenerJuicio(nota, rangos, context, dimensionId) {
    // Validaciones básicas
    if (nota === null || nota === undefined) return "PENDIENTE";
    if (!dimensionId) return "SIN DIMENSIÓN";

    // Encontrar en qué rango numérico cae la nota (Ej: 4.5 cae en Alto)
    const rango = rangos.find(r => nota >= r.minNota && nota <= r.maxNota);
    if (!rango) return "SIN RANGO";


    // Guardamos el ID calculado (1, 2, 3 o 4)
    let idDesempenoBusqueda = rango.desempenoId;

    // Intentar buscar el TEXTO ESPECÍFICO en la tabla Juicios
    try {
        // Preparamos el filtro base
        let whereClause = {
            vigenciaId: context.vigenciaId,
            dimensionId: dimensionId,
            activo: true
        };

        // --- APLICACIÓN DE REGLAS DE NEGOCIO ---

        // CASO 1: COMPORTAMIENTO (ID 999)
        // Global por Asignatura: Periodo 0, Grado NULL, Asignatura ESPECÍFICA
        if (dimensionId === 999) {
            whereClause.periodo = 0;
            whereClause.gradoId = null;
            whereClause.asignaturaId = context.asignaturaId;
            whereClause.desempenoId = idDesempenoBusqueda; // Usa rango (1-4)
        }

        // CASO 2: COMPETENCIA ACUMULATIVA (ID 4)
        // Transversal Total: Periodo 0, Grado NULL, Asignatura NULL
        else if (dimensionId === 4) {
            whereClause.periodo = 0;
            whereClause.gradoId = null;
            whereClause.asignaturaId = null;
            whereClause.desempenoId = idDesempenoBusqueda; // Usa rango (1-4)
        }

        // CASO 3: COMPETENCIA SOCIAL (ID 2) O LABORAL (ID 3)
        else if (dimensionId === 2 || dimensionId === 3) {
            // A. Intentamos PREESCOLAR (Específico)
            let juicioPreescolar = await Juicio.findOne({
                where: {
                    ...whereClause,
                    periodo: context.periodo,
                    gradoId: context.gradoId,
                    asignaturaId: context.asignaturaId,
                    desempenoId: idDesempenoBusqueda // Usa rango (1-4)
                }
            });
            if (juicioPreescolar && juicioPreescolar.texto) return juicioPreescolar.texto;

            // B. Si no existe, aplicamos Global (Primaria/Secundaria)
            whereClause.periodo = 0;
            whereClause.gradoId = null;
            whereClause.asignaturaId = null;
            whereClause.desempenoId = idDesempenoBusqueda; // Usa rango (1-4)
        }

        // CASO 4: COMPETENCIA ACADÉMICA (ID 1)
        else if (dimensionId === 1) {
            whereClause.periodo = context.periodo;
            whereClause.gradoId = context.gradoId;
            whereClause.asignaturaId = context.asignaturaId;

            // Si NO es Preescolar, forzamos buscar el ID 5 (Rango de desempeño UNICO)
            // ignorando si sacó nota alta, baja, etc.
            if (context.nivelAcademico !== "PREESCOLAR") {
                whereClause.desempenoId = 5; // <--- FORZAMOS ID desempeño UNICO
            } else {
                whereClause.desempenoId = idDesempenoBusqueda; // Preescolar sí usa rangos
            }
        }

        // --- EJECUCIÓN FINAL ---
        const juicioEncontrado = await Juicio.findOne({ where: whereClause });

        if (juicioEncontrado && juicioEncontrado.texto) {
            return juicioEncontrado.texto;
        }

    } catch (error) {
        console.error(`Error recuperando juicio Dimensión ${dimensionId}:`, error);
    }

    // Fallback: Nombre del rango (Ej: "ALTO")
    return rango.desempeno ? rango.desempeno.nombre : "PENDIENTE";
}

export const calificacionService = {

    /**
     * Obtiene y arma la grilla de calificaciones optimizada
     */
    async obtenerGrilla(grupoId, asignaturaId, periodo, vigenciaId) {

        const matriculas = await calificacionRepository.findMatriculasPorGrupo(grupoId, vigenciaId);

        if (!matriculas.length) return [];

        const estudiantesIds = matriculas.map(m => m.estudianteId);
        const calificaciones = await calificacionRepository.findCalificacionesPorEstudiantes(
            estudiantesIds, asignaturaId, periodo, vigenciaId
        );

        // Mapear calificaciones por estudianteId para acceso O(1) en el paso de armado de grilla
        const calificacionesMap = new Map(calificaciones.map(c => [c.estudianteId, c]));

        // Construir la grilla cruzando matriculas con calificaciones (si existen)
        return matriculas.map(m => {
            const { estudiante } = m;
            const apellidos = `${estudiante.primerApellido} ${estudiante.segundoApellido ?? ""}`.trim();
            const nombres = `${estudiante.primerNombre} ${estudiante.segundoNombre ?? ""}`.trim();

            return {
                matriculaId: m.id,
                estudianteId: estudiante.id,
                documento: estudiante.documento,
                nombreCompleto: `${apellidos} ${nombres}`.trim(),
                bloqueo_notas: m.bloqueo_notas,
                calificacion: calificacionesMap.get(estudiante.id) ?? null
            };
        });
    },

    /**
     * Procesa y guarda una calificación (Transaction, Cálculos, Validaciones)
     */
    async procesarGuardado(data) {
        const t = await sequelize.transaction();

        try {
            const { asignaturaId, periodo, vigenciaId, estudianteId, docenteId, usuarioId } = data;

            // Buscamos si ya existe calificación (Necesario para comparar cambios)
            const existingCal = await calificacionRepository.findOne(estudianteId, asignaturaId, periodo, vigenciaId, t);

            let esSoloCambioTexto = false;

            if (existingCal) {
                // Función auxiliar para comparar notas
                const hayCambioNumerico = (valDB, valInput) => {
                    // Si el input no viene (undefined), no se está intentando cambiar ese campo
                    if (valInput === undefined) return false;

                    const numDB = parseFloat(valDB || 0);
                    const numInput = parseFloat(valInput || 0);

                    // Si son diferentes (con margen de error mínimo para decimales)
                    return Math.abs(numDB - numInput) > 0.001;
                };

                const cambioNotas =
                    hayCambioNumerico(existingCal.notaAcademica, data.notaAcademica) ||
                    hayCambioNumerico(existingCal.notaAcumulativa, data.notaAcumulativa) ||
                    hayCambioNumerico(existingCal.notaLaboral, data.notaLaboral) ||
                    hayCambioNumerico(existingCal.notaSocial, data.notaSocial) ||
                    hayCambioNumerico(existingCal.notaDefinitiva, data.notaDefinitivaInput);

                // Si NO cambiaron las notas, asumimos que es solo recomendación/fallas
                if (!cambioNotas) {
                    esSoloCambioTexto = true;
                }
            } else {
                // Si NO existe calificación (es un INSERT), definitivamente es un cambio numérico.
                esSoloCambioTexto = false;
            }

            // Validaciones de Negocio (Ventana y Permisos)
            await _validarVentana(periodo, vigenciaId, data, esSoloCambioTexto);

            // Preparar Datos Auxiliares (Asignatura y Rangos)
            const asignatura = await Asignatura.findByPk(asignaturaId);
            const esComportamiento = asignatura && asignatura.nombre.trim().toUpperCase() === "COMPORTAMIENTO";

            const rangos = await DesempenoRango.findAll({
                where: { vigenciaId },
                include: [{ model: Desempeno, as: "desempeno" }]
            });

            // Obtener Matrícula, Grado y Nivel Académico
            const matricula = await Matricula.findOne({
                where: { estudianteId, vigenciaId },
                include: [{
                    model: Grupo,
                    as: "grupo",
                    include: [{ model: Grado, as: "grado" }]
                }]
            });

            if (!matricula || !matricula.grupo) {
                throw new Error("El estudiante no tiene matrícula o grupo asignado.");
            }
            const gradoId = matricula.grupo.gradoId;
            const nivelAcademico = matricula.grupo.grado.nivelAcademico; // "PREESCOLAR", "PRIMARIA", etc.

            // Preparamos el contexto para la búsqueda de juicios
            const contextJuicio = { vigenciaId, asignaturaId, gradoId, periodo, nivelAcademico };

            // Preparar objeto base
            let dataToSave = {
                estudianteId, asignaturaId, periodo, vigenciaId, docenteId, usuarioId,
                fallas: data.fallas,
                recomendacionUno: data.recomendacionUno,
                recomendacionDos: data.recomendacionDos,
                fecha_edicion: new Date()
            };

            // Guardamos auditoria si viene
            if (data.observacion_cambio) {
                dataToSave.observacion_cambio = data.observacion_cambio;
                dataToSave.url_evidencia_cambio = data.url_evidencia_cambio;
            }

            // Cálculos y Búsqueda de Juicios
            if (esComportamiento) {
                const def = parseFloat(data.notaDefinitivaInput || 0);
                const juicio = await _obtenerJuicio(def, rangos, contextJuicio, DIM.COMPORTAMIENTO); // Pasamos ID 999 (COMPORTAMIENTO) explícitamente

                Object.assign(dataToSave, {
                    notaDefinitiva: def.toFixed(2),
                    notaAcademica: def, promedioAcademica: 0, juicioAcademica: juicio,
                    notaAcumulativa: 0, promedioAcumulativa: 0, juicioAcumulativa: "NO APLICA",
                    notaLaboral: 0, promedioLaboral: 0, juicioLaboral: "NO APLICA",
                    notaSocial: 0, promedioSocial: 0, juicioSocial: "NO APLICA",
                });

            } else {
                const nAcad = parseFloat(data.notaAcademica || 0);
                const nAcum = parseFloat(data.notaAcumulativa || 0);
                const nLab = parseFloat(data.notaLaboral || 0);
                const nSoc = parseFloat(data.notaSocial || 0);

                const pAcad = nAcad * PORCENTAJES.ACADEMICA;
                const pAcum = nAcum * PORCENTAJES.ACUMULATIVA;
                const pLab = nLab * PORCENTAJES.LABORAL;
                const pSoc = nSoc * PORCENTAJES.SOCIAL;
                const definitiva = pAcad + pAcum + pLab + pSoc;

                // Calculamos juicios pasando el contexto
                // Usamos await Promise.all para hacerlo paralelo y más rápido
                const [jAcad, jAcum, jLab, jSoc] = await Promise.all([
                    _obtenerJuicio(nAcad, rangos, contextJuicio, DIM.ACADEMICA),   // ID 1
                    _obtenerJuicio(nAcum, rangos, contextJuicio, DIM.ACUMULATIVA), // ID 4
                    _obtenerJuicio(nLab, rangos, contextJuicio, DIM.LABORAL),      // ID 3
                    _obtenerJuicio(nSoc, rangos, contextJuicio, DIM.SOCIAL)        // ID 2
                ]);

                Object.assign(dataToSave, {
                    notaAcademica: nAcad.toFixed(2), promedioAcademica: pAcad.toFixed(2), juicioAcademica: jAcad,
                    notaAcumulativa: nAcum.toFixed(2), promedioAcumulativa: pAcum.toFixed(2), juicioAcumulativa: jAcum,
                    notaLaboral: nLab.toFixed(2), promedioLaboral: pLab.toFixed(2), juicioLaboral: jLab,
                    notaSocial: nSoc.toFixed(2), promedioSocial: pSoc.toFixed(2), juicioSocial: jSoc,
                    notaDefinitiva: definitiva.toFixed(2)
                });
            }

            // Persistencia (Upsert)
            let result;
            if (existingCal) {
                result = await calificacionRepository.update(existingCal, dataToSave, t);
            } else {
                result = await calificacionRepository.create(dataToSave, t);
            }

            await t.commit();
            return result;

        } catch (error) {
            await t.rollback();
            throw handleSequelizeError(error);
        }
    }
};