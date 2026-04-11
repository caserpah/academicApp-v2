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
 */
async function _validarVentana(periodo, vigenciaId, data, esSoloCambioTexto = false) {
    const ventana = await VentanaCalificacion.findOne({ where: { periodo, vigenciaId } });
    if (!ventana) throw new Error("Para este periodo aún no se ha creado la ventana de calificaciones.");

    const hoy = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const estaEnFecha = hoy >= ventana.fechaInicio && hoy <= ventana.fechaFin;

    if (estaEnFecha) return true;

    const ROLES_ADMINISTRATIVOS = ['admin', 'director', 'coordinador'];
    const esAdministrativo = data.role ? ROLES_ADMINISTRATIVOS.includes(data.role) : false;

    if (!esAdministrativo) throw new Error(`El periodo de calificaciones está cerrado (Finalizó: ${ventana.fechaFin}).`);

    if (esAdministrativo) {
        if (data.notaDefinitivaInput !== undefined) return true;
        if (esSoloCambioTexto) return true;
        if (data.observacion_cambio && data.observacion_cambio.trim().length > 5) return true;
    }

    const error = new Error("El periodo académico está cerrado. Se requiere justificación administrativa.");
    error.code = "REQ_JUSTIFICACION";
    throw error;
}

/**
 * Helper: Determinar el Texto del Juicio
 */
async function _obtenerJuicio(nota, rangos, context, dimensionId) {
    if (nota === null || nota === undefined) return "PENDIENTE";
    if (!dimensionId) return "SIN DIMENSIÓN";

    const rango = rangos.find(r => nota >= r.minNota && nota <= r.maxNota);
    if (!rango) return "SIN RANGO";

    let idDesempenoBusqueda = rango.desempenoId;

    try {
        let whereClause = {
            vigenciaId: context.vigenciaId,
            dimensionId: dimensionId,
            activo: true
        };

        if (dimensionId === DIM.COMPORTAMIENTO) {
            whereClause.periodo = 0;
            whereClause.gradoId = null;
            whereClause.asignaturaId = context.asignaturaId;
            whereClause.desempenoId = idDesempenoBusqueda;
        }
        else if (dimensionId === DIM.ACUMULATIVA) {
            whereClause.periodo = 0;
            whereClause.gradoId = null;
            whereClause.asignaturaId = null;
            whereClause.desempenoId = idDesempenoBusqueda;
        }
        else if (dimensionId === DIM.SOCIAL || dimensionId === DIM.LABORAL) {
            let juicioPreescolar = await Juicio.findOne({
                where: {
                    ...whereClause,
                    periodo: context.periodo,
                    gradoId: context.gradoId,
                    asignaturaId: context.asignaturaId,
                    desempenoId: idDesempenoBusqueda
                }
            });
            if (juicioPreescolar && juicioPreescolar.texto) return juicioPreescolar.texto;

            whereClause.periodo = 0;
            whereClause.gradoId = null;
            whereClause.asignaturaId = null;
            whereClause.desempenoId = idDesempenoBusqueda;
        }
        else if (dimensionId === DIM.ACADEMICA) {
            whereClause.periodo = context.periodo;
            whereClause.gradoId = context.gradoId;
            whereClause.asignaturaId = context.asignaturaId;

            if (context.nivelAcademico !== "PREESCOLAR") {
                whereClause.desempenoId = 5;
            } else {
                whereClause.desempenoId = idDesempenoBusqueda;
            }
        }

        const juicioEncontrado = await Juicio.findOne({ where: whereClause });
        if (juicioEncontrado && juicioEncontrado.texto) return juicioEncontrado.texto;

    } catch (error) {
        console.error(`Error recuperando juicio Dimensión ${dimensionId}:`, error);
    }
    return rango.desempeno ? rango.desempeno.nombre : "PENDIENTE";
}

export const calificacionService = {

    async obtenerGrilla(grupoId, asignaturaId, periodo, vigenciaId) {
        const matriculas = await calificacionRepository.findMatriculasPorGrupo(grupoId, vigenciaId);
        if (!matriculas.length) return [];

        const estudiantesIds = matriculas.map(m => m.estudianteId);
        const calificaciones = await calificacionRepository.findCalificacionesPorEstudiantes(
            estudiantesIds, asignaturaId, periodo, vigenciaId
        );

        const calificacionesMap = new Map(calificaciones.map(c => [c.estudianteId, c]));

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

    async procesarGuardado(data) {
        const t = await sequelize.transaction();

        try {
            const { asignaturaId, periodo, vigenciaId, estudianteId, docenteId, usuarioId } = data;

            const existingCal = await calificacionRepository.findOne(estudianteId, asignaturaId, periodo, vigenciaId, t);
            let esSoloCambioTexto = false;

            if (existingCal) {
                const hayCambioNumerico = (valDB, valInput) => {
                    if (valInput === undefined) return false;
                    const inputLimpio = valInput === "" ? null : valInput;
                    if (valDB == null && inputLimpio == null) return false;
                    if (valDB == null || inputLimpio == null) return true;
                    return Math.abs(parseFloat(valDB) - parseFloat(inputLimpio)) > 0.001;
                };

                const cambioNotas =
                    hayCambioNumerico(existingCal.notaAcademica, data.notaAcademica) ||
                    hayCambioNumerico(existingCal.notaAcumulativa, data.notaAcumulativa) ||
                    hayCambioNumerico(existingCal.notaLaboral, data.notaLaboral) ||
                    hayCambioNumerico(existingCal.notaSocial, data.notaSocial) ||
                    hayCambioNumerico(existingCal.notaDefinitiva, data.notaDefinitivaInput);

                if (!cambioNotas) {
                    esSoloCambioTexto = true;
                }
            } else {
                esSoloCambioTexto = false;
            }

            await _validarVentana(periodo, vigenciaId, data, esSoloCambioTexto);

            const asignatura = await Asignatura.findByPk(asignaturaId);
            const esComportamiento = asignatura && _esComportamiento(asignatura.nombre);

            const rangos = await DesempenoRango.findAll({
                where: { vigenciaId },
                include: [{ model: Desempeno, as: "desempeno" }]
            });

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
            const nivelAcademico = matricula.grupo.grado.nivelAcademico;

            const contextJuicio = { vigenciaId, asignaturaId, gradoId, periodo, nivelAcademico };

            let dataToSave = {
                estudianteId, asignaturaId, periodo, vigenciaId, docenteId, usuarioId,
                fallas: data.fallas,
                recomendacionUno: data.recomendacionUno,
                recomendacionDos: data.recomendacionDos,
                fecha_edicion: new Date()
            };

            if (data.observacion_cambio) {
                dataToSave.observacion_cambio = data.observacion_cambio;
                dataToSave.url_evidencia_cambio = data.url_evidencia_cambio;
            }

            if (esComportamiento) {
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
                const nAcad = data.notaAcademica ? parseFloat(data.notaAcademica) : null;
                const nAcum = data.notaAcumulativa ? parseFloat(data.notaAcumulativa) : null;
                const nLab = data.notaLaboral ? parseFloat(data.notaLaboral) : null;
                const nSoc = data.notaSocial ? parseFloat(data.notaSocial) : null;

                const round2 = (num) => Math.round((num + Number.EPSILON) * 100) / 100;

                const pAcad = nAcad !== null ? round2(nAcad * PORCENTAJES.ACADEMICA) : null;
                const pAcum = nAcum !== null ? round2(nAcum * PORCENTAJES.ACUMULATIVA) : null;
                const pLab = nLab !== null ? round2(nLab * PORCENTAJES.LABORAL) : null;
                const pSoc = nSoc !== null ? round2(nSoc * PORCENTAJES.SOCIAL) : null;

                let definitiva = null;

                if (nAcad !== null || nAcum !== null || nLab !== null || nSoc !== null) {
                    definitiva = (pAcad || 0) + (pAcum || 0) + (pLab || 0) + (pSoc || 0);
                    definitiva = round2(definitiva);
                }

                const [jAcad, jAcum, jLab, jSoc] = await Promise.all([
                    _obtenerJuicio(nAcad, rangos, contextJuicio, DIM.ACADEMICA),
                    _obtenerJuicio(nAcum, rangos, contextJuicio, DIM.ACUMULATIVA),
                    _obtenerJuicio(nLab, rangos, contextJuicio, DIM.LABORAL),
                    _obtenerJuicio(nSoc, rangos, contextJuicio, DIM.SOCIAL)
                ]);

                Object.assign(dataToSave, {
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

            let result;
            if (existingCal) {
                result = await calificacionRepository.update(existingCal, dataToSave, t);
            } else {
                try {
                    result = await calificacionRepository.create(dataToSave, t);
                } catch (err) {
                    if (err.name === 'SequelizeUniqueConstraintError') {
                        const calificacionRecuperada = await calificacionRepository.findOne(estudianteId, asignaturaId, periodo, vigenciaId, t);
                        result = await calificacionRepository.update(calificacionRecuperada, dataToSave, t);
                    } else {
                        throw err;
                    }
                }
            }

            await t.commit();
            return result;

        } catch (error) {
            await t.rollback();
            throw handleSequelizeError(error);
        }
    },

    async generarPlantillaDocente(docenteId, periodo, vigenciaId) {
        const cargasReales = await Carga.findAll({
            where: { docenteId, vigenciaId },
            include: [
                { model: Grupo, as: 'grupo', include: [{ model: Grado, as: 'grado' }] },
                { model: Asignatura, as: 'asignatura' }
            ]
        });

        let cargasTotales = [...cargasReales];

        const gruposDirigidos = await Grupo.findAll({
            where: { directorId: docenteId, vigenciaId },
            include: [{ model: Grado, as: 'grado' }]
        });

        if (gruposDirigidos.length > 0) {
            const asignaturaComportamiento = await Asignatura.findOne({
                where: { nombre: 'COMPORTAMIENTO', vigenciaId: vigenciaId }
            });

            if (asignaturaComportamiento) {
                for (const grupo of gruposDirigidos) {
                    const yaTieneCarga = cargasTotales.some(
                        c => c.grupoId === grupo.id && c.asignaturaId === asignaturaComportamiento.id
                    );

                    if (!yaTieneCarga) {
                        cargasTotales.push({
                            grupoId: grupo.id,
                            asignaturaId: asignaturaComportamiento.id,
                            grupo: grupo,
                            asignatura: asignaturaComportamiento,
                            esVirtual: true
                        });
                    }
                }
            }
        }

        if (!cargasTotales.length) throw new Error("El docente no tiene carga académica asignada ni es director de ningún grupo.");

        const workbook = new ExcelJS.Workbook();
        const hojasGeneradas = {};

        for (const carga of cargasTotales) {
            const codigoGrado = carga.grupo.grado.codigo ? carga.grupo.grado.codigo.trim() : "";
            const nombreAsignatura = carga.asignatura.nombreCorto || carga.asignatura.nombre;
            const nombreRaw = `${nombreAsignatura} ${codigoGrado}${carga.grupo.nombre}`;
            let nombreHoja = _limpiarNombreHoja(nombreRaw);

            let counter = 1;
            const originalName = nombreHoja;
            while (workbook.getWorksheet(nombreHoja)) {
                const sufijo = ` (${counter})`;
                const maxLen = 31 - sufijo.length;
                nombreHoja = `${originalName.substring(0, maxLen)}${sufijo}`;
                counter++;
            }

            const worksheet = workbook.addWorksheet(nombreHoja);
            const esComportamiento = _esComportamiento(carga.asignatura.nombre);

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

            const matriculas = await Matricula.findAll({
                where: { grupoId: carga.grupoId, vigenciaId: vigenciaId, estado: 'ACTIVA', bloqueo_notas: false },
                include: [{
                    model: Estudiante, as: 'estudiante',
                    attributes: ['documento', 'primerApellido', 'segundoApellido', 'primerNombre', 'segundoNombre']
                }],
                order: [
                    [{ model: Estudiante, as: 'estudiante' }, 'primerApellido', 'ASC'],
                    [{ model: Estudiante, as: 'estudiante' }, 'segundoApellido', 'ASC']
                ]
            });

            if (esComportamiento) {
                worksheet.getCell('A2').value = 'ESTUDIANTE';
                worksheet.getCell('B2').value = 'IDENTIFICACIÓN';
                worksheet.getCell('C2').value = 'VALORACIÓN';
                worksheet.getCell('D2').value = 'OBSERVACIONES';

                ['A2', 'B2', 'C2', 'D2'].forEach(c => {
                    const cell = worksheet.getCell(c);
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE699' } };
                    cell.font = { bold: true };
                    cell.alignment = { horizontal: 'center' };
                    cell.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
                });

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

                    row.getCell(1).protection = { locked: !esReserva };
                    row.getCell(2).protection = { locked: !esReserva };
                    row.getCell(3).protection = { locked: false };
                    row.getCell(4).protection = { locked: false };

                    if (esReserva) {
                        row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE0' } };
                        row.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE0' } };
                    }

                    [1, 2, 3, 4].forEach(c => row.getCell(c).border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } });
                    currentRow++;
                };

                matriculas.forEach(m => dibujarFilaSimple(m.estudiante, false));
                for (let k = 0; k < 5; k++) dibujarFilaSimple(null, true);

                for (let r = 3; r < currentRow; r++) {
                    worksheet.getCell(`C${r}`).dataValidation = {
                        type: 'decimal', operator: 'between', formulae: [1, 5],
                        showErrorMessage: true, error: 'La nota debe estar entre 1.0 y 5.0'
                    };
                }

                // --- FORMATO CONDICIONAL PARA COMPORTAMIENTO (Celdas vacías) ---
                worksheet.addConditionalFormatting({
                    ref: `C3:C${currentRow - 1}`,
                    rules: [{
                        type: 'containsText', operator: 'containsBlanks',
                        style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFFFE5E5' } } }
                    }]
                });

            }
            else {
                worksheet.mergeCells('A2:A3'); worksheet.getCell('A2').value = 'ESTUDIANTE';
                worksheet.mergeCells('B2:B3'); worksheet.getCell('B2').value = 'DOCUMENTO';

                worksheet.mergeCells('C2:L2'); worksheet.getCell('C2').value = 'ACADEMICA';
                worksheet.mergeCells('M2:M3'); worksheet.getCell('M2').value = 'PROM.\nACAD';
                worksheet.mergeCells('N2:N3'); worksheet.getCell('N2').value = 'EVAL.\nACUM';
                worksheet.mergeCells('O2:S2'); worksheet.getCell('O2').value = 'LABORAL';
                worksheet.mergeCells('T2:X2'); worksheet.getCell('T2').value = 'SOCIAL';

                worksheet.mergeCells('Y2:Y3'); worksheet.getCell('Y2').value = 'NOTA\nPRD.';
                worksheet.mergeCells('Z2:Z3'); worksheet.getCell('Z2').value = 'DESEMPEÑO';
                worksheet.mergeCells('AA2:AA3'); worksheet.getCell('AA2').value = 'FALLAS';
                worksheet.mergeCells('AB2:AC2'); worksheet.getCell('AB2').value = 'RECOMENDACIÓN';
                worksheet.mergeCells('AD2:AD3'); worksheet.getCell('AD2').value = 'OBSERVACIONES';

                const row3 = worksheet.getRow(3);

                ['C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'].forEach((col, i) => row3.getCell(col).value = (i + 1));
                row3.getCell('M').value = 'NOTA';
                ['O', 'P', 'Q', 'R'].forEach((col, i) => row3.getCell(col).value = (i + 1));
                row3.getCell('S').value = 'NOTA';
                ['T', 'U', 'V', 'W'].forEach((col, i) => row3.getCell(col).value = (i + 1));
                row3.getCell('X').value = 'NOTA';
                row3.getCell('AB').value = 'UNO';
                row3.getCell('AC').value = 'DOS';

                const centerStyle = { vertical: 'middle', horizontal: 'center', wrapText: true };
                const borderStyle = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };

                ['A2', 'B2', 'C2', 'M2', 'N2', 'O2', 'T2', 'Y2', 'Z2', 'AA2', 'AB2', 'AD2'].forEach(c => {
                    const cell = worksheet.getCell(c);
                    cell.alignment = centerStyle;
                    cell.font = { bold: true, size: 9 };
                    cell.border = borderStyle;
                });

                ['A2', 'B2', 'M2', 'N2', 'Y2', 'Z2', 'AA2', 'AD2'].forEach(c => worksheet.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'D9E1F2' } });
                worksheet.getCell('C2').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'D9E1F2' } };
                worksheet.getCell('O2').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF2CC' } };
                worksheet.getCell('T2').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'E2EFDA' } };
                worksheet.getCell('AB2').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FCE4D6' } };

                row3.font = { bold: true, size: 9 };
                row3.alignment = centerStyle;

                worksheet.getColumn('A').width = 45;
                worksheet.getColumn('B').width = 15;
                ['C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'O', 'P', 'Q', 'R', 'T', 'U', 'V', 'W'].forEach(c => worksheet.getColumn(c).width = 4);
                ['M', 'S', 'X', 'N'].forEach(c => worksheet.getColumn(c).width = 6);
                worksheet.getColumn('Y').width = 7;
                worksheet.getColumn('Z').width = 13;
                worksheet.getColumn('AA').width = 7;
                worksheet.getColumn('AB').width = 60;
                worksheet.getColumn('AC').width = 60;
                worksheet.getColumn('AD').width = 60;

                let currentRow = 4;

                const dibujarFila = (estudiante, esFilaReserva) => {
                    const r = currentRow;
                    const row = worksheet.getRow(r);

                    const nombreCompleto = esFilaReserva ? "" : `${estudiante.primerApellido} ${estudiante.segundoApellido || ''} ${estudiante.primerNombre} ${estudiante.segundoNombre || ''}`.trim();
                    const documento = esFilaReserva ? "" : estudiante.documento;

                    row.getCell('A').value = nombreCompleto;
                    row.getCell('B').value = documento;

                    row.getCell('M').value = { formula: `IFERROR(ROUND(AVERAGE(C${r}:L${r}), 1), "")` };
                    row.getCell('S').value = { formula: `IFERROR(ROUND(AVERAGE(O${r}:R${r}), 1), "")` };
                    row.getCell('X').value = { formula: `IFERROR(ROUND(AVERAGE(T${r}:W${r}), 1), "")` };

                    row.getCell('Y').value = {
                        formula: `IF(COUNT(C${r}:W${r})=0, "", ROUND((IF(ISNUMBER(M${r}),M${r},0)*0.5) + (IF(ISNUMBER(N${r}),N${r},0)*0.2) + (IF(ISNUMBER(S${r}),S${r},0)*0.15) + (IF(ISNUMBER(X${r}),X${r},0)*0.15), 2))`
                    };

                    row.getCell('Z').value = {
                        formula: `IF(OR(Y${r}="",Y${r}<=0),"",IF(Y${r}<3,"BAJO",IF(Y${r}<4,"BÁSICO",IF(Y${r}<4.6,"ALTO","SUPERIOR"))))`
                    };

                    row.getCell('A').protection = { locked: !esFilaReserva };
                    row.getCell('B').protection = { locked: !esFilaReserva };

                    if (esFilaReserva) {
                        row.getCell('A').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE0' } };
                        row.getCell('B').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE0' } };
                    }

                    const inputCols = ['C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'N', 'O', 'P', 'Q', 'R', 'T', 'U', 'V', 'W', 'AA', 'AB', 'AC', 'AD'];
                    inputCols.forEach(col => row.getCell(col).protection = { locked: false });

                    ['N'].forEach(col => {
                        const cell = row.getCell(col);
                        cell.font = { bold: true };
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F2F2F2' } };
                    });

                    ['M', 'S', 'X', 'Y'].forEach(col => {
                        const cell = row.getCell(col);
                        cell.protection = { locked: true };
                        cell.font = { bold: true };
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F2F2F2' } };
                    });

                    const cellZ = row.getCell('Z');
                    cellZ.protection = { locked: true };
                    cellZ.font = { bold: true };
                    cellZ.alignment = centerStyle;

                    for (let i = 1; i <= 30; i++) row.getCell(i).border = borderStyle;
                    currentRow++;
                };

                matriculas.forEach(m => dibujarFila(m.estudiante, false));
                for (let k = 0; k < 5; k++) dibujarFila(null, true);

                const notasCols = ['C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'N', 'O', 'P', 'Q', 'R', 'T', 'U', 'V', 'W'];
                notasCols.forEach(col => {
                    for (let r = 4; r < currentRow; r++) {
                        worksheet.getCell(`${col}${r}`).dataValidation = {
                            type: 'decimal', operator: 'between', formulae: [1, 5],
                            showErrorMessage: true, error: 'La nota debe estar entre 1.0 y 5.0'
                        };
                    }
                });

                // --- FORMATO CONDICIONAL: DEFINITIVAS VACÍAS (ROSADO CLARO) ---

                // 1. Para Evaluación Acumulativa (Columna N) - Ingreso manual
                worksheet.addConditionalFormatting({
                    ref: `N4:N${currentRow - 1}`,
                    rules: [{
                        type: 'containsText',
                        operator: 'containsBlanks',
                        style: {
                            fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFFFE5E5' } }
                        }
                    }]
                });

                // 2. Para Promedios Calculados (M, S, X, Y) - Fórmulas
                const columnasDefinitivas = [
                    `M4:M${currentRow - 1}`, // Académica
                    `N4:N${currentRow - 1}`, // Acumulativa
                    `S4:S${currentRow - 1}`, // Laboral
                    `X4:X${currentRow - 1}`, // Social
                    `Y4:Y${currentRow - 1}`  // Nota Prd.
                ];

                columnasDefinitivas.forEach(rango => {
                    worksheet.addConditionalFormatting({
                        ref: rango,
                        rules: [{
                            type: 'containsText',
                            operator: 'containsBlanks',
                            style: {
                                fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFFFE5E5' } }
                            }
                        }]
                    });
                });

                worksheet.addConditionalFormatting({
                    ref: `Y4:Y${currentRow - 1}`,
                    rules: [{
                        type: 'cellIs', operator: 'between', formulae: [0.01, 2.99],
                        style: {
                            font: { color: { argb: 'FF9C0006' }, bold: true },
                            fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFFFC7CE' } }
                        }
                    }]
                });

                worksheet.addConditionalFormatting({
                    ref: `Z4:Z${currentRow - 1}`,
                    rules: [
                        {
                            type: 'cellIs', operator: 'equal', formulae: ['"BAJO"'],
                            style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFFFC7CE' } }, font: { color: { argb: 'FF9C0006' }, bold: true } }
                        },
                        {
                            type: 'cellIs', operator: 'equal', formulae: ['"BÁSICO"'],
                            style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFFFEB9C' } }, font: { color: { argb: 'FF9C6500' }, bold: true } }
                        },
                        {
                            type: 'cellIs', operator: 'equal', formulae: ['"ALTO"'],
                            style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FFC6EFCE' } }, font: { color: { argb: 'FF006100' }, bold: true } }
                        },
                        {
                            type: 'cellIs', operator: 'equal', formulae: ['"SUPERIOR"'],
                            style: { fill: { type: 'pattern', pattern: 'solid', bgColor: { argb: 'FF9BC2E6' } }, font: { color: { argb: 'FF1F4E78' }, bold: true } }
                        }
                    ]
                });
            }

            worksheet.protect('SecretSystemPass', {
                selectLockedCells: true, selectUnlockedCells: true, formatCells: false, insertRows: false
            });
        }

        return workbook.xlsx.writeBuffer();
    },

    async importarArchivoDocente(fileBuffer, docenteId, userId, userRole) {
        const transaction = await sequelize.transaction();
        const reporte = { procesados: 0, errores: [], hojasIgnoradas: 0 };
        const recomendacionesCache = new Map();
        let ventanaValidada = false;
        let contextoVigencia = null;
        let contextoPeriodo = null;

        try {
            const recs = await BancoRecomendacion.findAll({ where: { activo: true } });
            recs.forEach(r => recomendacionesCache.set(r.id, r.descripcion));
            let rangosCache = null;

            const workbook = XLSX.read(fileBuffer, { type: 'buffer' });

            for (const sheetName of workbook.SheetNames) {
                const sheet = workbook.Sheets[sheetName];

                const metaCell = sheet['A1'] ? sheet['A1'].v : null;
                if (!metaCell) { reporte.hojasIgnoradas++; continue; }

                let meta;
                try { meta = JSON.parse(metaCell); } catch (e) { reporte.hojasIgnoradas++; continue; }

                if (!ventanaValidada) {
                    const dataPermisos = { role: userRole };
                    await _validarVentana(meta.p, meta.v, dataPermisos);
                    ventanaValidada = true;
                    contextoVigencia = meta.v;
                    contextoPeriodo = meta.p;
                } else {
                    if (meta.p !== contextoPeriodo || meta.v !== contextoVigencia) {
                        reporte.errores.push(`Hoja "${sheetName}" ignorada: Pertenece a un periodo y/o vigencia diferente al validado inicialmente.`);
                        continue;
                    }
                }

                if (!rangosCache) {
                    rangosCache = await DesempenoRango.findAll({
                        where: { vigenciaId: meta.v },
                        include: [{ model: Desempeno, as: "desempeno" }]
                    });
                }

                const range = XLSX.utils.decode_range(sheet['!ref']);
                const startRow = meta.esComp ? 2 : 3;

                for (let R = startRow; R <= range.e.r; ++R) {
                    const v = (colIndex) => {
                        const cell = sheet[XLSX.utils.encode_cell({ c: colIndex, r: R })];
                        return cell ? cell.v : undefined;
                    };

                    const documento = v(1);
                    if (!documento) continue;

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

                    // --- INICIO DE MERGE INTELIGENTE ---
                    const existingCal = await calificacionRepository.findOne(
                        matricula.estudiante.id, meta.aid, meta.p, meta.v, transaction
                    );

                    const obtenerNotaFusionada = (colIndex, valorEnBD, startPartial, endPartial) => {
                        let valExcel = v(colIndex);
                        if ((valExcel === 0 || valExcel === "0") && startPartial !== undefined && endPartial !== undefined) {
                            let tienePartiales = false;
                            for (let i = startPartial; i <= endPartial; i++) {
                                const cellVal = v(i);
                                if (cellVal !== undefined && cellVal !== null && String(cellVal).trim() !== "") {
                                    tienePartiales = true;
                                    break;
                                }
                            }
                            if (!tienePartiales) valExcel = null; // Anulamos el 0 falso
                        }

                        if (valExcel !== undefined && valExcel !== null && String(valExcel).trim() !== "") {
                            return parseFloat(valExcel);
                        }
                        return existingCal && valorEnBD !== null ? parseFloat(valorEnBD) : null;
                    };

                    const obtenerTextoFusionado = (colIndex, valorEnBD) => {
                        const valExcel = v(colIndex);
                        if (valExcel !== undefined && valExcel !== null && String(valExcel).trim() !== "") {
                            return valExcel;
                        }
                        return existingCal ? valorEnBD : null;
                    };

                    const contextJuicio = {
                        vigenciaId: meta.v, asignaturaId: meta.aid, gradoId: matricula.grupo.gradoId,
                        periodo: meta.p, nivelAcademico: matricula.grupo.grado.nivelAcademico
                    };

                    let dataToSave = {
                        estudianteId: matricula.estudiante.id, asignaturaId: meta.aid, periodo: meta.p,
                        vigenciaId: meta.v, docenteId: docenteId, usuarioId: userId, fecha_edicion: new Date()
                    };

                    if (meta.esComp) {
                        const notaVal = obtenerNotaFusionada(2, existingCal?.notaDefinitiva);
                        const juicio = notaVal ? await _obtenerJuicio(notaVal, rangosCache, contextJuicio, DIM.COMPORTAMIENTO) : "PENDIENTE";

                        dataToSave = {
                            ...dataToSave,
                            notaDefinitiva: notaVal ? notaVal.toFixed(2) : null,
                            notaAcademica: notaVal ? notaVal.toFixed(2) : null,
                            promedioAcademica: null,
                            juicioAcademica: juicio,
                            notaAcumulativa: null, promedioAcumulativa: null, juicioAcumulativa: "NO APLICA",
                            notaLaboral: null, promedioLaboral: null, juicioLaboral: "NO APLICA",
                            notaSocial: null, promedioSocial: null, juicioSocial: "NO APLICA",
                            fallas: 0
                        };

                    } else {
                        const nAcad = obtenerNotaFusionada(12, existingCal?.notaAcademica, 2, 11);
                        const nAcum = obtenerNotaFusionada(13, existingCal?.notaAcumulativa); // N no tiene hijas
                        const nLab = obtenerNotaFusionada(18, existingCal?.notaLaboral, 14, 17);
                        const nSoc = obtenerNotaFusionada(23, existingCal?.notaSocial, 19, 22);
                        const fallas = obtenerNotaFusionada(26, existingCal?.fallas) || 0;

                        const rec1Raw = obtenerTextoFusionado(27, existingCal?.recomendacionUno); // AB
                        const rec2Raw = obtenerTextoFusionado(28, existingCal?.recomendacionDos); // AC

                        const procesarRecomendacion = (val) => {
                            if (val === undefined || val === null || val === "") return null;
                            const strVal = String(val).trim();
                            const esSoloNumero = /^\d+$/.test(strVal);
                            if (esSoloNumero) {
                                const id = parseInt(strVal, 10);
                                if (recomendacionesCache.has(id)) return recomendacionesCache.get(id);
                                return null;
                            }
                            return strVal;
                        };

                        const pAcad = nAcad !== null ? (nAcad * 0.50) : null;
                        const pAcum = nAcum !== null ? (nAcum * 0.20) : null;
                        const pLab = nLab !== null ? (nLab * 0.15) : null;
                        const pSoc = nSoc !== null ? (nSoc * 0.15) : null;

                        let def = null;
                        if (nAcad !== null || nAcum !== null || nLab !== null || nSoc !== null) {
                            def = (pAcad || 0) + (pAcum || 0) + (pLab || 0) + (pSoc || 0);
                        }

                        const [jAcad, jAcum, jLab, jSoc] = await Promise.all([
                            _obtenerJuicio(nAcad, rangosCache, contextJuicio, DIM.ACADEMICA),
                            _obtenerJuicio(nAcum, rangosCache, contextJuicio, DIM.ACUMULATIVA),
                            _obtenerJuicio(nLab, rangosCache, contextJuicio, DIM.LABORAL),
                            _obtenerJuicio(nSoc, rangosCache, contextJuicio, DIM.SOCIAL)
                        ]);

                        const roundExcel = (num) => {
                            if (num === null || num === undefined) return null;
                            return Number(Math.round(parseFloat(num) + "e+2") + "e-2").toFixed(2);
                        };

                        dataToSave = {
                            ...dataToSave,
                            notaAcademica: roundExcel(nAcad),
                            promedioAcademica: roundExcel(pAcad),
                            juicioAcademica: jAcad,
                            notaAcumulativa: roundExcel(nAcum),
                            promedioAcumulativa: roundExcel(pAcum),
                            juicioAcumulativa: jAcum,
                            notaLaboral: roundExcel(nLab),
                            promedioLaboral: roundExcel(pLab),
                            juicioLaboral: jLab,
                            notaSocial: roundExcel(nSoc),
                            promedioSocial: roundExcel(pSoc),
                            juicioSocial: jSoc,
                            notaDefinitiva: roundExcel(def),
                            fallas: fallas,
                            recomendacionUno: procesarRecomendacion(rec1Raw),
                            recomendacionDos: procesarRecomendacion(rec2Raw)
                        };
                    }

                    if (existingCal) {
                        await calificacionRepository.update(existingCal, dataToSave, transaction);
                    } else {
                        // Evita crear registro basura si no hay ninguna nota a procesar
                        if (dataToSave.notaAcademica || dataToSave.notaAcumulativa || dataToSave.notaLaboral || dataToSave.notaSocial || dataToSave.notaDefinitiva) {
                            await calificacionRepository.create(dataToSave, transaction);
                        }
                    }
                    reporte.procesados++;
                }
            }

            if (reporte.procesados === 0 && reporte.errores.length === 0) throw new Error("El archivo no contiene hojas válidas generadas por el sistema.");
            await transaction.commit();
            return { exito: true, reporte };
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    },

    async auditarNotasPendientesAnteriores(grupoId, asignaturaId, periodoActual, vigenciaId) {
        if (periodoActual <= 1) return { hayPendientes: false, detalles: [] };

        const periodosAnteriores = Array.from({ length: periodoActual - 1 }, (_, i) => i + 1);
        const asignatura = await Asignatura.findByPk(asignaturaId);
        const asignaturaNombre = asignatura ? asignatura.nombre : "Asignatura desconocida";
        const esComportamiento = _esComportamiento(asignaturaNombre);

        const todasLasMatriculas = await calificacionRepository.findMatriculasPorGrupo(grupoId, vigenciaId);
        const matriculas = todasLasMatriculas.filter(m => !m.bloqueo_notas);

        if (matriculas.length === 0) return { hayPendientes: false, detalles: [] };

        const estudiantesIds = matriculas.map(m => m.estudiante.id);
        const notasExistentes = await calificacionRepository.findCalificacionesPorEstudiantes(
            estudiantesIds, asignaturaId, periodosAnteriores, vigenciaId
        );

        const notasDict = {};
        notasExistentes.forEach(n => {
            let notaCompletada = false;

            if (esComportamiento) {
                notaCompletada = n.notaDefinitiva !== null;
            } else {
                notaCompletada = (
                    n.notaAcademica !== null &&
                    n.notaAcumulativa !== null &&
                    n.notaLaboral !== null &&
                    n.notaSocial !== null
                );
            }

            if (notaCompletada) {
                if (!notasDict[n.estudianteId]) notasDict[n.estudianteId] = {};
                notasDict[n.estudianteId][n.periodo] = true;
            }
        });

        const detalles = [];
        let totalFaltantes = 0;

        matriculas.forEach(m => {
            const periodosFaltantesDelEstudiante = [];

            periodosAnteriores.forEach(per => {
                if (!notasDict[m.estudiante.id]?.[per]) {
                    periodosFaltantesDelEstudiante.push(per);
                    totalFaltantes++;
                }
            });

            if (periodosFaltantesDelEstudiante.length > 0) {
                detalles.push({
                    estudianteId: m.estudiante.id,
                    documento: m.estudiante.documento,
                    nombreCompleto: `${m.estudiante.primerApellido} ${m.estudiante.primerNombre}`,
                    asignatura: asignaturaNombre,
                    periodosFaltantes: periodosFaltantesDelEstudiante.join(", ")
                });
            }
        });

        return {
            hayPendientes: detalles.length > 0,
            totalFaltantes,
            totalEstudiantes: detalles.length,
            detalles
        };
    },

    async verificarEstadoVentana(periodo, vigenciaId) {
        const ventana = await calificacionRepository.findVentana(periodo, vigenciaId);

        if (!ventana) {
            return { abierta: false, mensaje: "El periodo seleccionado no tiene ventana de calificaciones configurada" };
        }

        const hoy = new Date().toISOString().split('T')[0];
        const estaAbierta = hoy >= ventana.fechaInicio && hoy <= ventana.fechaFin;

        return {
            abierta: estaAbierta,
            ventana
        };
    }
};