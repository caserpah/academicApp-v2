import { sequelize } from "../database/db.connect.js";
import { calificacionRepository } from "../repositories/calificacion.repository.js";
import { VentanaCalificacion } from "../models/ventana_calificacion.js";
import { Asignatura } from "../models/asignatura.js";
import { BancoRecomendacion } from "../models/banco_recomendacion.js";
import { Matricula } from "../models/matricula.js";
import { Estudiante } from "../models/estudiante.js";
import { Carga } from "../models/carga.js";
import { Grupo } from "../models/grupo.js";
import { Grado } from "../models/grado.js";
import { DesempenoRango } from "../models/desempeno_rango.js";
import { Desempeno } from "../models/desempeno.js";
import { handleSequelizeError } from "../middleware/handleSequelizeError.js";
import { Juicio } from "../models/juicio.js";
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';

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
 * Utilitario para limpiar nombres de hoja Excel.
 * Reemplaza caracteres prohibidos y recorta nombres a 30 caracteres
 */
const _limpiarNombreHoja = (nombre) => {
    return nombre.replace(/[\/\\\?\*\[\]\:]/g, '').substring(0, 30).toUpperCase();
};

// Helper para detectar si es comportamiento
const _esComportamiento = (nombreAsignatura) => {
    if (!nombreAsignatura) return false;
    const nombre = nombreAsignatura.toUpperCase().trim();
    return nombre.includes("COMPORTAMIENTO") || nombre.includes("DISCIPLINA") || nombre.includes("CONVIVENCIA");
};

/**
 * Helper: Validar Ventana de Calificaciones
 * Lógica Simplificada:
 * 1. La ventana se define ESTRICTAMENTE por fechas.
 * 2. Docentes: Solo pueden editar dentro de las fechas.
 * 3. Admins: Pueden editar fuera de fecha SI justifican o es solo texto.
 */
async function _validarVentana(periodo, vigenciaId, data, esSoloCambioTexto = false) {

    //Verificar existencia de la Ventana
    const ventana = await VentanaCalificacion.findOne({ where: { periodo, vigenciaId } });
    if (!ventana) throw new Error("Para este periodo aún no se ha creado la ventana de calificaciones.");

    // Verificar estado de la Ventana de calificaciones
    const hoy = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const estaEnFecha = hoy >= ventana.fechaInicio && hoy <= ventana.fechaFin;

    // Si está dentro de fechas todos pasan (Docentes y Admins)
    if (estaEnFecha) return true;

    // Verificamos si es un usuario con privilegios administrativos
    // Roles permitidos según BD: 'admin', 'director', 'coordinador'
    const ROLES_ADMINISTRATIVOS = ['admin', 'director', 'coordinador'];
    const esAdministrativo = data.role ? ROLES_ADMINISTRATIVOS.includes(data.role) : false;

    // CASO DOCENTE: Si la ventana está cerrada, SE BLOQUEA SIEMPRE.
    if (!esAdministrativo) throw new Error(`El periodo de calificaciones está cerrado (Finalizó: ${ventana.fechaFin}).`);

    // CASO ADMINISTRATIVO: Fuera de fecha
    if (esAdministrativo) {
        // Excepción 1: Es Comportamiento (No pide justificación). Detectamos comportamiento si viene el campo 'notaDefinitivaInput'
        if (data.notaDefinitivaInput !== undefined) return true;

        // Excepción 2: Es solo un cambio de recomendación/texto
        if (esSoloCambioTexto) return true;

        // Excepción 3: Cambio numérico (Académico) con justificación
        if (data.observacion_cambio && data.observacion_cambio.trim().length > 5) return true;
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
        if (dimensionId === DIM.COMPORTAMIENTO) {
            whereClause.periodo = 0;
            whereClause.gradoId = null;
            whereClause.asignaturaId = context.asignaturaId;
            whereClause.desempenoId = idDesempenoBusqueda; // Usa rango (1-4)
        }

        // CASO 2: COMPETENCIA ACUMULATIVA (ID 4)
        // Transversal Total: Periodo 0, Grado NULL, Asignatura NULL
        else if (dimensionId === DIM.ACUMULATIVA) {
            whereClause.periodo = 0;
            whereClause.gradoId = null;
            whereClause.asignaturaId = null;
            whereClause.desempenoId = idDesempenoBusqueda; // Usa rango (1-4)
        }

        // CASO 3: COMPETENCIA SOCIAL (ID 2) O LABORAL (ID 3)
        else if (dimensionId === DIM.SOCIAL || dimensionId === DIM.LABORAL) {
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
        else if (dimensionId === DIM.ACADEMICA) {
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
        if (juicioEncontrado && juicioEncontrado.texto) return juicioEncontrado.texto;

    } catch (error) {
        console.error(`Error recuperando juicio Dimensión ${dimensionId}:`, error);
    }
    return rango.desempeno ? rango.desempeno.nombre : "PENDIENTE"; // Fallback: Nombre del rango (Ej: "ALTO")
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

                    // Convertimos strings vacíos a null para comparar limpiamente
                    const inputLimpio = valInput === "" ? null : valInput;

                    if (valDB == null && inputLimpio == null) return false;
                    if (valDB == null || inputLimpio == null) return true; // Si uno es null y el otro no, hubo cambio

                    // Si son diferentes (con margen de error mínimo para decimales)
                    return Math.abs(parseFloat(valDB) - parseFloat(inputLimpio)) > 0.001;
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
            const esComportamiento = asignatura && _esComportamiento(asignatura.nombre);

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
                // Si no viene nota, lo dejamos como null
                const def = data.notaDefinitivaInput ? parseFloat(data.notaDefinitivaInput) : null;
                const juicio = def ? await _obtenerJuicio(def, rangos, contextJuicio, DIM.COMPORTAMIENTO) : "PENDIENTE";

                Object.assign(dataToSave, {
                    notaDefinitiva: def ? def.toFixed(2) : null,
                    notaAcademica: def ? def.toFixed(2) : null,
                    promedioAcademica: null,
                    juicioAcademica: juicio,
                    notaAcumulativa: null, promedioAcumulativa: null, juicioAcumulativa: "NO APLICA",
                    notaLaboral: null, promedioLaboral: null, juicioLaboral: "NO APLICA",
                    notaSocial: null, promedioSocial: null, juicioSocial: "NO APLICA",
                });

            } else {
                // Aceptamos null si la nota viene vacía
                const nAcad = data.notaAcademica ? parseFloat(data.notaAcademica) : null;
                const nAcum = data.notaAcumulativa ? parseFloat(data.notaAcumulativa) : null;
                const nLab = data.notaLaboral ? parseFloat(data.notaLaboral) : null;
                const nSoc = data.notaSocial ? parseFloat(data.notaSocial) : null;

                // Función auxiliar para redondear a 2 decimales EXACTOS evitando errores de coma flotante
                const round2 = (num) => Math.round((num + Number.EPSILON) * 100) / 100;

                // Calcular el aporte y redondear a 2 decimales ANTES de sumar
                const pAcad = nAcad !== null ? round2(nAcad * PORCENTAJES.ACADEMICA) : null;
                const pAcum = nAcum !== null ? round2(nAcum * PORCENTAJES.ACUMULATIVA) : null;
                const pLab = nLab !== null ? round2(nLab * PORCENTAJES.LABORAL) : null;
                const pSoc = nSoc !== null ? round2(nSoc * PORCENTAJES.SOCIAL) : null;

                let definitiva = null;

                // Solo calculamos definitiva si hay AL MENOS una nota digitada
                if (nAcad !== null || nAcum !== null || nLab !== null || nSoc !== null) {
                    // Ahora la suma utiliza los valores previamente redondeados, garantizando la exactitud visual
                    definitiva = (pAcad || 0) + (pAcum || 0) + (pLab || 0) + (pSoc || 0);

                    // Redondeamos el total por seguridad
                    definitiva = round2(definitiva);

                    if (definitiva >= 2.96 && definitiva < 3.0) { definitiva = 3.0; }
                }

                const [jAcad, jAcum, jLab, jSoc] = await Promise.all([
                    _obtenerJuicio(nAcad, rangos, contextJuicio, DIM.ACADEMICA),
                    _obtenerJuicio(nAcum, rangos, contextJuicio, DIM.ACUMULATIVA),
                    _obtenerJuicio(nLab, rangos, contextJuicio, DIM.LABORAL),
                    _obtenerJuicio(nSoc, rangos, contextJuicio, DIM.SOCIAL)
                ]);

                Object.assign(dataToSave, {
                    // Ahora guardamos pAcad, pAcum, etc. que serán null si la nota era null
                    notaAcademica: nAcad ? nAcad.toFixed(2) : null,
                    promedioAcademica: pAcad !== null ? pAcad.toFixed(2) : null,
                    juicioAcademica: jAcad,

                    notaAcumulativa: nAcum ? nAcum.toFixed(2) : null,
                    promedioAcumulativa: pAcum !== null ? pAcum.toFixed(2) : null,
                    juicioAcumulativa: jAcum,

                    notaLaboral: nLab ? nLab.toFixed(2) : null,
                    promedioLaboral: pLab !== null ? pLab.toFixed(2) : null,
                    juicioLaboral: jLab,

                    notaSocial: nSoc ? nSoc.toFixed(2) : null,
                    promedioSocial: pSoc !== null ? pSoc.toFixed(2) : null,
                    juicioSocial: jSoc,

                    notaDefinitiva: definitiva ? definitiva.toFixed(2) : null
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
    },

    /**
     * GENERAR PLANTILLA DE CARGA ACADÉMICA COMPLETA
     * Crea un libro con una hoja por cada registro en la tabla CARGA del docente.
     */
    async generarPlantillaDocente(docenteId, periodo, vigenciaId) {

        // Consultar la Carga Académica
        const cargas = await Carga.findAll({
            where: { docenteId, vigenciaId },
            include: [
                { model: Grupo, as: 'grupo', include: [{ model: Grado, as: 'grado' }] },
                { model: Asignatura, as: 'asignatura' }
            ]
        });

        if (!cargas.length) throw new Error("El docente no tiene carga académica asignada.");

        const workbook = new ExcelJS.Workbook();

        // Diccionario para rastrear nombres generados
        const hojasGeneradas = {};

        // Iterar sobre cada Carga para crear su Hoja (Worksheet)
        for (const carga of cargas) {

            // Construir nombre de hoja: "QUIMICA 6A"
            const codigoGrado = carga.grupo.grado.codigo ? carga.grupo.grado.codigo.trim() : "";
            const nombreRaw = `${carga.asignatura.nombre} ${codigoGrado}${carga.grupo.nombre}`;
            let nombreHoja = _limpiarNombreHoja(nombreRaw);

            // Garantizar nombre único (Contador). Si "ARITMETICA 6A" existe, prueba "ARITMETICA 6A (1)"
            let counter = 1;
            const originalName = nombreHoja;
            while (workbook.getWorksheet(nombreHoja)) {
                const sufijo = ` (${counter})`;
                const maxLen = 31 - sufijo.length; // Excel limita nombres a 31 caracteres
                nombreHoja = `${originalName.substring(0, maxLen)}${sufijo}`;
                counter++;
            }

            const worksheet = workbook.addWorksheet(nombreHoja); // Creamos nueva hoja

            const esComportamiento = _esComportamiento(carga.asignatura.nombre); // Verificar si es Comportamiento

            // SEGURIDAD (METADATOS OCULTOS EN A1) ---
            // Guardamos IDs clave para saber dónde guardar los datos al importar
            const securityMetadata = JSON.stringify({
                gid: carga.grupoId,
                aid: carga.asignaturaId,
                p: parseInt(periodo),
                v: parseInt(vigenciaId),
                esComp: esComportamiento,
                desc: `${carga.grupo.nombre} - ${carga.asignatura.nombre}`
            });
            worksheet.getCell('A1').value = securityMetadata;
            worksheet.getRow(1).hidden = true;

            // Datos de Estudiantes
            const matriculas = await Matricula.findAll({
                where: {
                    grupoId: carga.grupoId,
                    vigenciaId: vigenciaId,
                    estado: 'ACTIVA',
                    bloqueo_notas: false
                },
                include: [{
                    model: Estudiante, as: 'estudiante',
                    attributes: ['documento', 'primerApellido', 'segundoApellido', 'primerNombre', 'segundoNombre']
                }],
                order: [
                    [{ model: Estudiante, as: 'estudiante' }, 'primerApellido', 'ASC'],
                    [{ model: Estudiante, as: 'estudiante' }, 'segundoApellido', 'ASC']
                ]
            });

            // --- CASO COMPORTAMIENTO ---
            if (esComportamiento) {
                // Encabezados Simples
                worksheet.getCell('A2').value = 'ESTUDIANTE';
                worksheet.getCell('B2').value = 'IDENTIFICACIÓN';
                worksheet.getCell('C2').value = 'VALORACIÓN';
                worksheet.getCell('D2').value = 'OBSERVACIONES';

                // Estilos
                ['A2', 'B2', 'C2', 'D2'].forEach(c => {
                    const cell = worksheet.getCell(c);
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE699' } };
                    cell.font = { bold: true };
                    cell.alignment = { horizontal: 'center' };
                    cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
                });

                // Anchos
                worksheet.getColumn('A').width = 45;
                worksheet.getColumn('B').width = 15;
                worksheet.getColumn('C').width = 15;
                worksheet.getColumn('D').width = 40;

                let currentRow = 3;
                const dibujarFilaSimple = (estudiante, esReserva) => {
                    const r = currentRow;
                    const row = worksheet.getRow(r);
                    const nombre = esReserva ? "" : `${estudiante.primerApellido} ${estudiante.segundoApellido || ''} ${estudiante.primerNombre} ${estudiante.segundoNombre || ''}`.trim();
                    const doc = esReserva ? "" : estudiante.documento;

                    row.getCell(1).value = nombre;
                    row.getCell(2).value = doc;

                    // Bloqueos
                    row.getCell(1).protection = { locked: !esReserva };
                    row.getCell(2).protection = { locked: !esReserva };
                    row.getCell(3).protection = { locked: false }; // Nota desbloqueada
                    row.getCell(4).protection = { locked: false }; // Obs desbloqueada

                    if (esReserva) {
                        row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE0' } };
                        row.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE0' } };
                    }

                    // Bordes
                    [1, 2, 3, 4].forEach(c => row.getCell(c).border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } });
                    currentRow++;
                };

                matriculas.forEach(m => dibujarFilaSimple(m.estudiante, false));
                for (let k = 0; k < 5; k++) dibujarFilaSimple(null, true);

                // Validación de datos (Solo Columna C)
                const totalRows = currentRow - 1;
                for (let r = 3; r < currentRow; r++) {
                    worksheet.getCell(`C${r}`).dataValidation = {
                        type: 'decimal', operator: 'between', formulae: [1, 5],
                        showErrorMessage: true, error: 'La nota debe estar entre 1.0 y 5.0'
                    };
                }
            }

            // --- CASO ASIGNATURA NORMAL ---
            else {
                // Títulos Agrupadores
                worksheet.mergeCells('A2:A3'); worksheet.getCell('A2').value = 'ESTUDIANTE';
                worksheet.mergeCells('B2:B3'); worksheet.getCell('B2').value = 'IDENTIF.';

                worksheet.mergeCells('C2:I2'); worksheet.getCell('C2').value = 'ACADEMICA';
                worksheet.mergeCells('J2:J3'); worksheet.getCell('J2').value = 'EVAL.\nACUM';
                worksheet.mergeCells('K2:O2'); worksheet.getCell('K2').value = 'LABORAL';
                worksheet.mergeCells('P2:T2'); worksheet.getCell('P2').value = 'SOCIAL';

                worksheet.mergeCells('U2:U3'); worksheet.getCell('U2').value = 'NOTA\nPRD.';
                worksheet.mergeCells('V2:V3'); worksheet.getCell('V2').value = 'FALLAS';

                worksheet.mergeCells('W2:X2'); worksheet.getCell('W2').value = 'RECOMENDACIÓN';
                worksheet.mergeCells('Y2:Y3'); worksheet.getCell('Y2').value = 'OBSERVACIONES';

                // Sub-títulos (1, 2, 3, Nota...)
                const row3 = worksheet.getRow(3);

                // Académica (6 notas + Promedio)
                ['C', 'D', 'E', 'F', 'G', 'H'].forEach((col, i) => row3.getCell(col).value = (i + 1));
                row3.getCell('I').value = 'NOTA'; // Promedio Acad

                // Laboral (4 notas + Promedio)
                ['K', 'L', 'M', 'N'].forEach((col, i) => row3.getCell(col).value = (i + 1));
                row3.getCell('O').value = 'NOTA'; // Promedio Lab

                // Social (4 notas + Promedio)
                ['P', 'Q', 'R', 'S'].forEach((col, i) => row3.getCell(col).value = (i + 1));
                row3.getCell('T').value = 'NOTA'; // Promedio Soc

                // Reconmendaciones
                row3.getCell('W').value = '1';
                row3.getCell('X').value = '2';

                // Estilos
                const centerStyle = { vertical: 'middle', horizontal: 'center', wrapText: true };
                const borderStyle = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };

                ['A2', 'B2', 'J2', 'U2', 'V2', 'Y2'].forEach(c => {
                    const cell = worksheet.getCell(c);
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'D9E1F2' } };
                    cell.alignment = centerStyle;
                    cell.font = { bold: true, size: 9 };
                    cell.border = borderStyle;
                });

                // Colores por dimensión
                worksheet.getCell('C2').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'D9E1F2' } }; // Azul
                worksheet.getCell('K2').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2CC' } }; // Naranja
                worksheet.getCell('P2').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E2EFDA' } }; // Verde
                worksheet.getCell('W2').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FCE4D6' } }; // Rojo

                row3.font = { bold: true, size: 9 };
                row3.alignment = centerStyle;

                // Anchos de Columna
                worksheet.getColumn('A').width = 45; // Nombre Largo
                worksheet.getColumn('B').width = 15; // Documento
                ['C', 'D', 'E', 'F', 'G', 'H', 'K', 'L', 'M', 'N', 'P', 'Q', 'R', 'S'].forEach(c => worksheet.getColumn(c).width = 4); // Inputs
                ['I', 'O', 'T'].forEach(c => worksheet.getColumn(c).width = 6); // Promedios
                worksheet.getColumn('J').width = 6; // Acum
                worksheet.getColumn('U').width = 7; // Definitiva
                worksheet.getColumn('V').width = 7; // Fallas
                worksheet.getColumn('Y').width = 60; // Obs

                let currentRow = 4; // Los datos empiezan en la fila 4

                // Función Helper para dibujar filas
                const dibujarFila = (estudiante, esFilaReserva) => {
                    const r = currentRow;
                    const row = worksheet.getRow(r);

                    const nombreCompleto = esFilaReserva ? "" : `${estudiante.primerApellido} ${estudiante.segundoApellido || ''} ${estudiante.primerNombre} ${estudiante.segundoNombre || ''}`.trim();
                    const documento = esFilaReserva ? "" : estudiante.documento;

                    // Set Values
                    row.getCell('A').value = nombreCompleto;
                    row.getCell('B').value = documento;

                    // --- Formulas para calcular los promedios (Académica, Laboral y Social) y la nota definitiva
                    // Los promedios parciales (notas visuales) muestren 1 solo decimal
                    row.getCell('I').value = { formula: `IFERROR(ROUND(AVERAGE(C${r}:H${r}), 1), 0)` };
                    row.getCell('O').value = { formula: `IFERROR(ROUND(AVERAGE(K${r}:N${r}), 1), 0)` };
                    row.getCell('T').value = { formula: `IFERROR(ROUND(AVERAGE(P${r}:S${r}), 1), 0)` };

                    // --- Fórmula para la nota definitiva
                    // Redondeamos CADA fragmento a 2 decimales antes de sumarlos
                    row.getCell('U').value = {
                        formula: `ROUND(ROUND(I${r}*0.5, 2) +
                        ROUND(IF(ISNUMBER(J${r}),J${r},0)*0.2, 2) +
                        ROUND(O${r}*0.15, 2) +
                        ROUND(T${r}*0.15, 2), 2)`
                    };

                    // Nombre y Documento: Bloqueados si es estudiante existente, Desbloqueados si es Reserva
                    row.getCell('A').protection = { locked: !esFilaReserva };
                    row.getCell('B').protection = { locked: !esFilaReserva };

                    // Si es reserva, coloreamos suavemente para indicar "Escriba aquí"
                    if (esFilaReserva) {
                        row.getCell('A').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE0' } };
                        row.getCell('B').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE0' } };
                    }

                    // Inputs de Notas: SIEMPRE DESBLOQUEADOS
                    const inputCols = ['C', 'D', 'E', 'F', 'G', 'H', 'J', 'K', 'L', 'M', 'N', 'P', 'Q', 'R', 'S', 'V', 'W', 'X', 'Y'];
                    inputCols.forEach(col => row.getCell(col).protection = { locked: false });

                    ['J'].forEach(col => {
                        const cell = row.getCell(col);
                        cell.font = { bold: true };
                    });

                    // Celdas Calculadas (Promedios): BLOQUEADAS y Grisáceas
                    ['I', 'O', 'T', 'U'].forEach(col => {
                        const cell = row.getCell(col);
                        cell.protection = { locked: true };
                        cell.font = { bold: true };
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F2F2F2' } };
                    });

                    // Bordes a toda la fila (hasta col Y=25)
                    for (let i = 1; i <= 25; i++) row.getCell(i).border = borderStyle;
                    currentRow++;
                };

                // Dibujar Estudiantes Matriculados
                matriculas.forEach(m => dibujarFila(m.estudiante, false));
                for (let k = 0; k < 5; k++) dibujarFila(null, true); // Dibujar 5 Filas de Reserva (Para estudiantes nuevos)

                // Rango 1.0 a 5.0
                const notasCols = ['C', 'D', 'E', 'F', 'G', 'H', 'J', 'K', 'L', 'M', 'N', 'P', 'Q', 'R', 'S'];
                notasCols.forEach(col => {
                    for (let r = 4; r < currentRow; r++) {
                        worksheet.getCell(`${col}${r}`).dataValidation = {
                            type: 'decimal', operator: 'between', formulae: [1, 5],
                            showErrorMessage: true, error: 'La nota debe estar entre 1.0 y 5.0'
                        };
                    }
                });
                // IDs de Recomendación (Enteros positivos)
                ['W', 'X'].forEach(col => {
                    for (let r = 4; r < currentRow; r++) {
                        worksheet.getCell(`${col}${r}`).dataValidation = {
                            type: 'whole', operator: 'greaterThanOrEqual', formulae: [1],
                            showErrorMessage: true, error: 'ID Recomendación'
                        };
                    }
                });
            }

            // Proteger Hoja
            worksheet.protect('SecretSystemPass', {
                selectLockedCells: true, selectUnlockedCells: true, formatCells: false, insertRows: false
            });
        }

        return workbook.xlsx.writeBuffer();
    },

    /**
     * IMPORTAR ARCHIVO EXCEL DEL DOCENTE
     * Lee todas las hojas, valida seguridad por hoja y busca estudiantes por Documento.
     */
    async importarArchivoDocente(fileBuffer, docenteId, userId, userRole) {
        const transaction = await sequelize.transaction();
        const reporte = { procesados: 0, errores: [], hojasIgnoradas: 0 };
        const recomendacionesCache = new Map();
        // Variables de contexto para validar ventana una vez por archivo
        let ventanaValidada = false;
        let contextoVigencia = null;
        let contextoPeriodo = null;

        try {
            // Precargar Recomendaciones para no consultar DB por cada celda
            const recs = await BancoRecomendacion.findAll({ where: { activo: true } });
            recs.forEach(r => recomendacionesCache.set(r.id, r.descripcion));
            let rangosCache = null;

            // Leer Excel
            const workbook = XLSX.read(fileBuffer, { type: 'buffer' });

            // Iterar hojas
            for (const sheetName of workbook.SheetNames) {
                const sheet = workbook.Sheets[sheetName];

                // LEER METADATA (Celda A1)
                const metaCell = sheet['A1'] ? sheet['A1'].v : null;
                if (!metaCell) { reporte.hojasIgnoradas++; continue; } // Hoja sin firma digital, ignorar

                let meta; // metaCell tiene: { gid, aid, p, v, desc }
                try { meta = JSON.parse(metaCell); } catch (e) { reporte.hojasIgnoradas++; continue; }


                // Validamos ventana de calificaciones (Solo la primera vez que detectamos el contexto)
                if (!ventanaValidada) {
                    // Preparamos datos para validación de permisos. userRole debe venir desde el controller
                    const dataPermisos = { role: userRole };
                    await _validarVentana(meta.p, meta.v, dataPermisos);
                    ventanaValidada = true;
                    contextoVigencia = meta.v;
                    contextoPeriodo = meta.p;
                } else {
                    // Safety check: Si por alguna razón mezclan hojas de periodos diferentes (hacking), bloqueamos.
                    if (meta.p !== contextoPeriodo || meta.v !== contextoVigencia) {
                        reporte.errores.push(`Hoja "${sheetName}" ignorada: Pertenece a un periodo y/o vigencia diferente al validado inicialmente.`);
                        continue;
                    }
                }

                // Cargar Rangos si no se han cargado (usando la vigencia de la metadata)
                if (!rangosCache) {
                    rangosCache = await DesempenoRango.findAll({
                        where: { vigenciaId: meta.v },
                        include: [{ model: Desempeno, as: "desempeno" }]
                    });
                }

                // LEER DATOS (A partir de Fila 4)

                const range = XLSX.utils.decode_range(sheet['!ref']);
                const startRow = meta.esComp ? 2 : 3;

                for (let R = startRow; R <= range.e.r; ++R) {
                    // Función local para obtener valor seguro
                    const v = (colIndex) => {
                        const cell = sheet[XLSX.utils.encode_cell({ c: colIndex, r: R })];
                        return cell ? cell.v : undefined;
                    };

                    const documento = v(1); // Col B (Indice 1) es IDENTIF.

                    // Si no hay documento, saltamos (fila vacía o fila de reserva no usada)
                    if (!documento) continue;

                    // VALIDAR ESTUDIANTE
                    // Buscamos en MATRICULA usando el documento y el grupoId de la metadata (meta.gid)
                    // Esto valida tanto las filas precargadas como las filas de reserva escritas manualmente.
                    const matricula = await Matricula.findOne({
                        where: { grupoId: meta.gid, vigenciaId: meta.v },
                        include: [{ model: Estudiante, as: 'estudiante', where: { documento: String(documento) } },
                        { model: Grupo, as: 'grupo', include: [{ model: Grado, as: 'grado' }] }],
                        transaction
                    });

                    if (!matricula) {
                        reporte.errores.push(`Hoja "${sheetName}" Fila ${R + 1}: Documento ${documento} no matriculado en este grupo.`);
                        continue;
                    }

                    // Contexto para Juicios
                    const contextJuicio = {
                        vigenciaId: meta.v, asignaturaId: meta.aid, gradoId: matricula.grupo.gradoId,
                        periodo: meta.p, nivelAcademico: matricula.grupo.grado.nivelAcademico
                    };

                    let dataToSave = {
                        estudianteId: matricula.estudiante.id, asignaturaId: meta.aid, periodo: meta.p,
                        vigenciaId: meta.v, docenteId: docenteId, usuarioId: userId, fecha_edicion: new Date()
                    };

                    // --- LOGICA CONDICIONAL DE LECTURA ---
                    if (meta.esComp) {
                        const notaVal = v(2) ? parseFloat(v(2)) : null; // Col C (Index 2) es la NOTA
                        const juicio = notaVal ? await _obtenerJuicio(notaVal, rangosCache, contextJuicio, DIM.COMPORTAMIENTO) : "PENDIENTE";

                        dataToSave = {
                            ...dataToSave,
                            notaDefinitiva: notaVal ? notaVal.toFixed(2) : null,

                            // REUTILIZACIÓN DE CAMPOS (Espejo de procesarGuardado)
                            notaAcademica: notaVal ? notaVal.toFixed(2) : null, // Guardamos la nota también aquí
                            promedioAcademica: null,              // Promedio en 0 para no afectar cálculos globales si los hubiera
                            juicioAcademica: juicio,
                            notaAcumulativa: null, promedioAcumulativa: null, juicioAcumulativa: "NO APLICA",
                            notaLaboral: null, promedioLaboral: null, juicioLaboral: "NO APLICA",
                            notaSocial: null, promedioSocial: null, juicioSocial: "NO APLICA",
                            fallas: 0
                        };

                    } else {
                        // --- CASO ASIGNATURA NORMAL ---
                        // Extraer notas (Aceptamos null si vienen vacías)
                        const nAcad = v(8) ? parseFloat(v(8)) : null;
                        const nAcum = v(9) ? parseFloat(v(9)) : null;
                        const nLab = v(14) ? parseFloat(v(14)) : null;
                        const nSoc = v(19) ? parseFloat(v(19)) : null;
                        const fallas = parseInt(v(21) || 0);

                        // Porcentajes para base de datos (conservan el null)
                        const pAcad = nAcad !== null ? (nAcad * 0.50) : null;
                        const pAcum = nAcum !== null ? (nAcum * 0.20) : null;
                        const pLab = nLab !== null ? (nLab * 0.15) : null;
                        const pSoc = nSoc !== null ? (nSoc * 0.15) : null;

                        // Cálculo nota definitiva
                        let def = null;
                        // Solo calculamos si al menos digitó una nota en esa fila
                        if (nAcad !== null || nAcum !== null || nLab !== null || nSoc !== null) {
                            // Sumamos usando ceros temporales
                            def = (pAcad || 0) + (pAcum || 0) + (pLab || 0) + (pSoc || 0);
                            if (def >= 2.96 && def < 3.0) def = 3.0;
                        }

                        // Calcular juicios (Promise.all para velocidad)
                        const [jAcad, jAcum, jLab, jSoc] = await Promise.all([
                            _obtenerJuicio(nAcad, rangosCache, contextJuicio, DIM.ACADEMICA),
                            _obtenerJuicio(nAcum, rangosCache, contextJuicio, DIM.ACUMULATIVA),
                            _obtenerJuicio(nLab, rangosCache, contextJuicio, DIM.LABORAL),
                            _obtenerJuicio(nSoc, rangosCache, contextJuicio, DIM.SOCIAL)
                        ]);

                        dataToSave = {
                            ...dataToSave,
                            notaAcademica: nAcad ? nAcad.toFixed(2) : null,
                            promedioAcademica: pAcad !== null ? pAcad.toFixed(2) : null,
                            juicioAcademica: jAcad,

                            notaAcumulativa: nAcum ? nAcum.toFixed(2) : null,
                            promedioAcumulativa: pAcum !== null ? pAcum.toFixed(2) : null,
                            juicioAcumulativa: jAcum,

                            notaLaboral: nLab ? nLab.toFixed(2) : null,
                            promedioLaboral: pLab !== null ? pLab.toFixed(2) : null,
                            juicioLaboral: jLab,

                            notaSocial: nSoc ? nSoc.toFixed(2) : null,
                            promedioSocial: pSoc !== null ? pSoc.toFixed(2) : null,
                            juicioSocial: jSoc,

                            notaDefinitiva: def ? def.toFixed(2) : null,
                            fallas: fallas,
                            recomendacionUno: v(22) ? recomendacionesCache.get(v(22)) : null,
                            recomendacionDos: v(23) ? recomendacionesCache.get(v(23)) : null
                        };
                    }

                    // PERSISTENCIA
                    const existingCal = await calificacionRepository.findOne(
                        matricula.estudiante.id, meta.aid, meta.p, meta.v, transaction
                    );

                    if (existingCal) {
                        await calificacionRepository.update(existingCal, dataToSave, transaction);
                    } else {
                        await calificacionRepository.create(dataToSave, transaction);
                    }
                    reporte.procesados++;
                }
            }

            // Archivo vacío o sin hojas válidas
            if (reporte.procesados === 0 && reporte.errores.length === 0) throw new Error("El archivo no contiene hojas válidas generadas por el sistema.");
            await transaction.commit();
            return { exito: true, reporte };
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    },

    /**
     * AUDITORÍA DE DOCENTES: Busca estudiantes a los que les falten notas en periodos anteriores.
     * Agrupado por estudiante e incluyendo el nombre de la Asignatura.
     */
    async auditarNotasPendientesAnteriores(grupoId, asignaturaId, periodoActual, vigenciaId) {
        // Si es el periodo 1, no hay periodos anteriores que auditar
        if (periodoActual <= 1) return { hayPendientes: false, detalles: [] };

        const periodosAnteriores = Array.from({ length: periodoActual - 1 }, (_, i) => i + 1);

        // 1. Obtener el nombre de la asignatura para el reporte
        const asignatura = await Asignatura.findByPk(asignaturaId);
        const asignaturaNombre = asignatura ? asignatura.nombre : "Asignatura desconocida";

        // Determinamos si es comportamiento usando tu helper
        const esComportamiento = _esComportamiento(asignaturaNombre);

        // 2. Obtener estudiantes activos del grupo
        const todasLasMatriculas = await calificacionRepository.findMatriculasPorGrupo(grupoId, vigenciaId);

        // Filtramos y sacamos de la lista a los estudiantes con bloqueo_notas
        const matriculas = todasLasMatriculas.filter(m => !m.bloqueo_notas);

        if (matriculas.length === 0) return { hayPendientes: false, detalles: [] };

        const estudiantesIds = matriculas.map(m => m.estudiante.id);

        // 3. Obtener las notas que SÍ existen para esos estudiantes en periodos anteriores
        const notasExistentes = await calificacionRepository.findCalificacionesPorEstudiantes(
            estudiantesIds, asignaturaId, periodosAnteriores, vigenciaId
        );

        // Diccionario rápido: dict[estId][periodo] = true
        const notasDict = {};
        notasExistentes.forEach(n => {
            let notaCompletada = false;

            if (esComportamiento) {
                // Comportamiento solo exige que exista la nota definitiva
                notaCompletada = n.notaDefinitiva !== null;
            } else {
                // Las materias normales EXIGEN las 4 notas parciales
                notaCompletada = (
                    n.notaAcademica !== null &&
                    n.notaAcumulativa !== null &&
                    n.notaLaboral !== null &&
                    n.notaSocial !== null
                );
            }

            // SOLO si la nota está 100% completa, le decimos al auditor que todo está en orden.
            // Si le falta aunque sea UN componente, no la registramos, forzando a que salga la alerta naranja.
            if (notaCompletada) {
                if (!notasDict[n.estudianteId]) notasDict[n.estudianteId] = {};
                notasDict[n.estudianteId][n.periodo] = true;
            }
        });

        const detalles = [];
        let totalFaltantes = 0; // Contador para el total de notas faltantes

        // 3. Cruzar y buscar los vacíos por estudiante y periodo
        matriculas.forEach(m => {
            const periodosFaltantesDelEstudiante = [];

            periodosAnteriores.forEach(per => {
                if (!notasDict[m.estudiante.id]?.[per]) {
                    periodosFaltantesDelEstudiante.push(per);
                    totalFaltantes++;
                }
            });

            // Si le falta al menos un periodo, lo agregamos al reporte
            if (periodosFaltantesDelEstudiante.length > 0) {
                detalles.push({
                    estudianteId: m.estudiante.id,
                    documento: m.estudiante.documento,
                    nombreCompleto: `${m.estudiante.primerApellido} ${m.estudiante.primerNombre}`,
                    asignatura: asignaturaNombre, // Agregamos la asignatura
                    periodosFaltantes: periodosFaltantesDelEstudiante.join(", ") // Ej: "1, 2"
                });
            }
        });

        return {
            hayPendientes: detalles.length > 0,
            totalFaltantes, // Total de casillas en blanco
            totalEstudiantes: detalles.length, // Total de alumnos involucrados
            detalles
        };
    }

};