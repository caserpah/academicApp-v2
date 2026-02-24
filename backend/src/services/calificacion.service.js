import { sequelize } from "../database/db.connect.js";
import { calificacionRepository } from "../repositories/calificacion.repository.js";
import { VentanaCalificacion } from "../models/ventana_calificacion.js";
import { Asignatura } from "../models/asignatura.js";
import { DesempenoRango } from "../models/desempeno_rango.js";
import { Desempeno } from "../models/desempeno.js";
import { handleSequelizeError } from "../middleware/handleSequelizeError.js";
import { Juicio } from "../models/juicio.js";
import { Matricula } from "../models/matricula.js";
import { Estudiante } from "../models/estudiante.js";
import { Grado } from "../models/grado.js";
import { Grupo } from "../models/grupo.js";
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
 * Helper: Validar Ventana de Calificaciones
 * Lógica Simplificada:
 * 1. La ventana se define ESTRICTAMENTE por fechas.
 * 2. Docentes: Solo pueden editar dentro de las fechas.
 * 3. Admins: Pueden editar fuera de fecha SI justifican o es solo texto.
 */
async function _validarVentana(periodo, vigenciaId, data, esSoloCambioTexto = false) {

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
        throw new Error(`El periodo de calificaciones está cerrado (Finalizó: ${ventana.fechaFin}).`);
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
    },

    /**
     * GENERAR PLANTILLA EXCEL CON FÓRMULAS Y BLOQUEOS
     */
    async generarPlantillaExcel(grupoId, asignaturaId, periodo, vigenciaId) {
        // Validar Asignatura (Para saber qué columnas mostrar)
        const asignatura = await Asignatura.findByPk(asignaturaId);
        const esComportamiento = asignatura && asignatura.nombre.trim().toUpperCase() === "COMPORTAMIENTO";

        // Obtener Estudiantes del Grupo
        const matriculas = await Matricula.findAll({
            where: { grupoId, vigenciaId, estado: 'ACTIVA', bloqueo_notas: false },
            include: [{
                model: Estudiante,
                as: 'estudiante',
                attributes: ['id', 'documento', 'primerApellido', 'segundoApellido', 'primerNombre', 'segundoNombre']
            }],
            order: [
                [{ model: Estudiante, as: 'estudiante' }, 'primerApellido', 'ASC'],
                [{ model: Estudiante, as: 'estudiante' }, 'segundoApellido', 'ASC']
            ]
        });

        if (!matriculas.length) throw new Error("No hay estudiantes matriculados en este grupo.");

        // Crear Workbook con ExcelJS
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Plantilla Notas');

        // Definir Columnas
        // Clave: 'key' nos ayuda a mapear, 'width' es estético
        let columns = [
            { header: 'ID_ESTUDIANTE', key: 'id', width: 10, hidden: false }, // Col A
            { header: 'DOCUMENTO', key: 'doc', width: 15 },      // Col B
            { header: 'ESTUDIANTE', key: 'nom', width: 60 },     // Col C
        ];

        if (esComportamiento) {
            // Comportamiento es simple: Una sola nota
            columns.push(
                { header: 'NOTA_DEFINITIVA', key: 'def', width: 15 } // Col D
            );
        } else {
            // Asignatura Normal: Notas + Promedios Calculados
            columns.push(
                { header: 'NOTA_ACAD', key: 'n_acad', width: 12 },        // Col D (Input)
                { header: 'AVG_ACAD (50%)', key: 'p_acad', width: 15 },   // Col E (Formula)
                { header: 'NOTA_ACUM', key: 'n_acum', width: 12 },        // Col F (Input)
                { header: 'AVG_ACUM (20%)', key: 'p_acum', width: 15 },   // Col G (Formula)
                { header: 'NOTA_LAB', key: 'n_lab', width: 12 },          // Col H (Input)
                { header: 'AVG_LAB (15%)', key: 'p_lab', width: 15 },     // Col I (Formula)
                { header: 'NOTA_SOC', key: 'n_soc', width: 12 },          // Col J (Input)
                { header: 'AVG_SOC (15%)', key: 'p_soc', width: 15 },     // Col K (Formula)
                { header: 'DEFINITIVA', key: 'definitiva', width: 15 },   // Col L (Formula Suma)
                { header: 'FALLAS', key: 'fallas', width: 10 }            // Col M (Input)
            );
        }

        worksheet.columns = columns;

        // Estilizar Encabezado
        const headerRow = worksheet.getRow(1);
        headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
        headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '2563EB' } }; // Azul
        headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

        // Llenar Datos y Aplicar Fórmulas
        matriculas.forEach((mat, index) => {
            const est = mat.estudiante;
            const rowIndex = index + 2; // Fila Excel (1 es Header)
            const nombre = `${est.primerApellido} ${est.segundoApellido || ''} ${est.primerNombre} ${est.segundoNombre || ''}`.trim();

            const rowData = {
                id: est.id,
                doc: est.documento,
                nom: nombre
            };

            if (esComportamiento) {
                rowData.def = null; // Input directo
            } else {
                // Inputs vacíos
                rowData.n_acad = null;
                rowData.n_acum = null;
                rowData.n_lab = null;
                rowData.n_soc = null;
                rowData.fallas = 0;

                // FÓRMULAS (ExcelJS permite inyectarlas)
                // D=Acad, F=Acum, H=Lab, J=Soc
                rowData.p_acad = { formula: `IF(ISNUMBER(D${rowIndex}), D${rowIndex}*0.5, 0)` };
                rowData.p_acum = { formula: `IF(ISNUMBER(F${rowIndex}), F${rowIndex}*0.2, 0)` };
                rowData.p_lab = { formula: `IF(ISNUMBER(H${rowIndex}), H${rowIndex}*0.15, 0)` };
                rowData.p_soc = { formula: `IF(ISNUMBER(J${rowIndex}), J${rowIndex}*0.15, 0)` };

                // Sumatoria Definitiva (E+G+I+K)
                rowData.definitiva = { formula: `E${rowIndex}+G${rowIndex}+I${rowIndex}+K${rowIndex}` };
            }

            worksheet.addRow(rowData);
        });

        // Configurar Bloqueo/Protección de Celdas
        // Por defecto, bloqueamos TODA la hoja y luego desbloqueamos solo los inputs.

        const totalRows = matriculas.length + 1;

        // Iterar sobre las filas de datos
        for (let r = 2; r <= totalRows; r++) {
            const row = worksheet.getRow(r);

            // Bloquear ID, Doc, Nombre por defecto (ya lo hace la hoja protegida)

            if (esComportamiento) {
                // Desbloquear Nota Definitiva (Col 4 / D)
                row.getCell(4).protection = { locked: false };
            } else {
                // Desbloquear Inputs:
                row.getCell('D').protection = { locked: false }; // Académica
                row.getCell('F').protection = { locked: false }; // Acumulativa
                row.getCell('H').protection = { locked: false }; // Laboral
                row.getCell('J').protection = { locked: false }; // Social
                row.getCell('M').protection = { locked: false }; // Fallas

                // Estilo visual para columnas calculadas (Grisáceo para indicar ReadOnly)
                ['E', 'G', 'I', 'K', 'L'].forEach(col => {
                    row.getCell(col).fill = {
                        type: 'pattern',
                        pattern: 'solid',
                        fgColor: { argb: 'F3F4F6' } // Gris claro
                    };
                    row.getCell(col).font = { italic: true, color: { argb: '374151' } };
                });

                // Estilo negrita para Definitiva
                row.getCell('L').font = { bold: true };
            }
        }

        // Aplicar Validaciones de Datos (Evitar notas > 5.0)
        if (!esComportamiento) {
            ['D', 'F', 'H', 'J'].forEach(colChar => {
                // Aplicar validación desde fila 2 hasta el final
                for (let r = 2; r <= totalRows; r++) {
                    worksheet.getCell(`${colChar}${r}`).dataValidation = {
                        type: 'decimal',
                        operator: 'between',
                        formulae: [1, 5],
                        showErrorMessage: true,
                        errorTitle: 'Error',
                        error: 'La nota debe estar entre 1.0 y 5.0'
                    };
                }
            });
        }

        // Proteger Hoja con Contraseña
        // Esto hace efectivo el 'locked: true/false'
        await worksheet.protect('SecretSystemPass', {
            selectLockedCells: true,
            selectUnlockedCells: true,
            formatCells: false,
            insertRows: false,
            deleteRows: false
        });

        // Retornar Buffer
        return workbook.xlsx.writeBuffer();
    },

    /**
     * IMPORTAR MASIVO (Excel)
     */
    async importarMasivo(fileBuffer, grupoId, asignaturaId, periodo, vigenciaId, userRole, userId) {
        const transaction = await sequelize.transaction();
        const errores = [];
        const registrosParaUpsert = [];

        try {
            // Validar Ventana (CRÍTICO: Reutilizamos tu lógica blindada)
            // Si la ventana está cerrada, _validarVentana lanzará error para docentes.
            // Pasamos un objeto data dummy con el rol.
            try {
                await _validarVentana(periodo, vigenciaId, { role: userRole });
            } catch (err) {
                // Si es error de ventana, abortamos de inmediato
                throw err;
            }

            // Configuración Contexto
            const asignatura = await Asignatura.findByPk(asignaturaId);
            const esComportamiento = asignatura && asignatura.nombre.trim().toUpperCase() === "COMPORTAMIENTO";

            // Obtener IDs de estudiantes válidos del grupo (Para evitar inyección de estudiantes de otros grupos)
            const matriculasValidas = await Matricula.findAll({
                where: { grupoId, vigenciaId },
                attributes: ['estudianteId']
            });
            const estudiantesPermitidos = new Set(matriculasValidas.map(m => m.estudianteId));

            // Leer Excel
            const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
            const sheet = workbook.Sheets[workbook.SheetNames[0]];
            const registrosRaw = XLSX.utils.sheet_to_json(sheet, { defval: "" });

            if (registrosRaw.length === 0) throw new Error("El archivo está vacío.");

            // Validar Fila por Fila
            for (let i = 0; i < registrosRaw.length; i++) {
                const fila = registrosRaw[i];
                const linea = i + 2;

                try {
                    const estudianteId = Number(fila['ID_ESTUDIANTE']);
                    if (!estudianteId) throw new Error("Falta ID_ESTUDIANTE o es inválido.");

                    // Verificar pertenencia al grupo
                    if (!estudiantesPermitidos.has(estudianteId)) {
                        throw new Error(`El estudiante con ID ${estudianteId} no pertenece al grupo seleccionado.`);
                    }

                    // Objeto base
                    const registro = {
                        estudianteId,
                        asignaturaId,
                        periodo,
                        vigenciaId,
                        docenteId: null, // Podrías buscar el docente si es necesario
                        usuarioAuditoriaId: userId,
                        fecha_edicion: new Date(),
                        // Campos de auditoría automática
                        observacion_cambio: userRole === 'admin' ? 'Carga Masiva Excel' : null
                    };

                    // Función helper para validar rangos
                    const validarNota = (val, nombreCampo) => {
                        if (val === "" || val === null || val === undefined) return 0; // Asumimos 0 o null
                        const num = parseFloat(val);
                        if (isNaN(num) || num < 1.0 || num > 5.0) {
                            // Opcional: Permitir 0 como "sin nota"
                            if (num === 0) return 0;
                            throw new Error(`${nombreCampo} inválida (${val}). Debe estar entre 1.0 y 5.0`);
                        }
                        return num;
                    };

                    if (esComportamiento) {
                        const def = validarNota(fila['NOTA_DEFINITIVA'], 'Nota Definitiva');
                        // Aquí deberías llamar a tu lógica de Juicios si la tienes centralizada,
                        // o calcularla simple. Por brevedad, asigno valores base:
                        registro.notaDefinitiva = def.toFixed(2);
                        registro.notaAcademica = def;
                        // ... resto de campos en 0 o "NO APLICA"
                    } else {
                        const nAcad = validarNota(fila['NOTA_ACAD'], 'Nota Académica');
                        const nAcum = validarNota(fila['NOTA_ACUM'], 'Nota Acumulativa');
                        const nLab = validarNota(fila['NOTA_LAB'], 'Nota Laboral');
                        const nSoc = validarNota(fila['NOTA_SOC'], 'Nota Social');
                        const fallas = parseInt(fila['FALLAS'] || 0);

                        if (isNaN(fallas) || fallas < 0) throw new Error("Fallas inválidas.");

                        // Cálculos (Reutiliza tus constantes de porcentajes)
                        const def = (nAcad * 0.5) + (nAcum * 0.2) + (nLab * 0.15) + (nSoc * 0.15);

                        registro.notaAcademica = nAcad;
                        registro.notaAcumulativa = nAcum;
                        registro.notaLaboral = nLab;
                        registro.notaSocial = nSoc;
                        registro.notaDefinitiva = def.toFixed(2);
                        registro.fallas = fallas;

                        // IMPORTANTE: Aquí faltaría calcular los Juicios (jAcad, jLab, etc)
                        // Si quieres que la importación sea rápida, quizás debas omitir juicios
                        // o calcularlos aquí mismo llamando a _obtenerJuicio.
                    }

                    registrosParaUpsert.push(registro);

                } catch (error) {
                    errores.push(`Fila ${linea}: ${error.message}`);
                }
            }

            // Resultado
            if (errores.length > 0) {
                await transaction.rollback();
                return { exito: false, errores };
            }

            // Bulk Upsert (Crear o Actualizar)
            await Calificacion.bulkCreate(registrosParaUpsert, {
                transaction,
                updateOnDuplicate: [
                    'notaAcademica', 'notaAcumulativa', 'notaLaboral', 'notaSocial', 'notaDefinitiva',
                    'fallas', 'fecha_edicion', 'observacion_cambio', 'usuarioAuditoriaId'
                ]
            });

            await transaction.commit();
            return { exito: true, total: registrosParaUpsert.length };

        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
};