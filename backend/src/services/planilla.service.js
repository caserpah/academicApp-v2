import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import { planillaRepository } from "../repositories/planilla.repository.js";
import { pdfService } from "./pdf.service.js";

// Configuración de rutas absolutas
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TITULOS_PLANILLA = {
    'ASISTENCIA': 'CONTROL DE ASISTENCIAS',
    'SEGUIMIENTO': 'PLANILLA DE ACTIVIDADES DE SEGUIMIENTO',
    'CALIFICACIONES': 'PLANILLA DE CALIFICACIONES',
    'COMPORTAMIENTO': 'PLANILLA DE COMPORTAMIENTO'
};

export const planillaService = {

    async generarPlanilla({ grupoId, tipoPlanilla, usuario, vigencia }) {

        // Obtener la información mediante el Repositorio
        const grupo = await planillaRepository.findGrupoConDetalles(grupoId, vigencia.id);

        if (!grupo) throw new Error("El grupo solicitado no existe en la vigencia actual.");

        // Validar permisos para COMPORTAMIENTO
        if (tipoPlanilla === 'COMPORTAMIENTO' && usuario.role === 'docente') {
            const docente = await planillaRepository.findDocentePorUsuarioId(usuario.id);

            if (!docente || grupo.directorId !== docente.id) {
                const error = new Error("Acceso denegado. Solo el director de grupo puede generar la planilla de comportamiento.");
                error.status = 403;
                throw error;
            }
        }

        // Consultamos el nombre del colegio a la BD
        const colegio = await planillaRepository.findColegio();
        const nombreColegio = colegio ? colegio.nombre : "INSTITUCIÓN EDUCATIVA";

        // Obtener los estudiantes activos desde el Repositorio
        const matriculas = await planillaRepository.findMatriculasActivasPorGrupo(grupoId, vigencia.id);

        // Formatear la lista de estudiantes para Handlebars
        const estudiantesFormateados = matriculas.map((m, index) => {
            const est = m.estudiante;
            return {
                numero: (index + 1).toString().padStart(2, '0'),
                nombreCompleto: `${est.primerApellido} ${est.segundoApellido || ''} ${est.primerNombre} ${est.segundoNombre || ''}`.trim(),
                documento: est.documento,
            };
        });

        const logoBase64 = await _obtenerLogoBase64();

        // Preparar el contexto para Handlebars
        const contextoHbs = {
            nombreInstitucion: nombreColegio,
            urlEscudo: logoBase64,
            tituloPlanilla: TITULOS_PLANILLA[tipoPlanilla] || 'PLANILLA INSTITUCIONAL',
            sedeNombre: grupo.sede.nombre,
            gradoNombre: grupo.grado.nombre,
            grupoNombre: grupo.nombre,
            jornada: grupo.jornada === 'MANANA' ? 'MAÑANA' : grupo.jornada,
            anioLectivo: vigencia.anio,
            estudiantes: estudiantesFormateados,
            columnasAsistencia: Array.from({ length: 20 }, (_, i) => i + 1),
            columnasSeguimiento: Array.from({ length: 10 }, (_, i) => i + 1)
        };

        // Las planillas de asistencia, seguimiento y comportamiento leerán las variables directas (...contextoHbs).
        // La planilla de calificaciones leerá el arreglo (paginas: [contextoHbs]) para iterar sobre cada asignatura que dicta el docente.
        const contextoFinal = {
            ...contextoHbs,
            paginas: [contextoHbs]
        };

        // Generar el PDF
        return await pdfService.crearPdfPlanillasNuevas(contextoFinal, tipoPlanilla);
    },

    async generarPlanillaMasivaDocente({ docenteId, tipoPlanilla, periodo, usuario, vigencia }) {
        // 1. Resolver el ID del docente
        let idDocenteTarget = docenteId;
        if (usuario.role === 'docente') {
            const docenteDB = await planillaRepository.findDocentePorUsuarioId(usuario.id);
            if (!docenteDB) throw new Error("No se encontró el perfil de docente para este usuario.");
            idDocenteTarget = docenteDB.id;
        }

        let itemsParaProcesar = [];

        // 2. BIFURCACIÓN DE LÓGICA: ¿Dirección de Grupo o Carga Académica?
        if (tipoPlanilla === 'COMPORTAMIENTO') {

            // RUTA A: Buscar por Dirección de Grupo
            const gruposDirigidos = await planillaRepository.findGruposDirigidos(idDocenteTarget, vigencia.id);
            if (!gruposDirigidos || gruposDirigidos.length === 0) {
                throw new Error("El docente no tiene asignada la dirección de ningún grupo en esta vigencia.");
            }

            // Normalizamos para el ciclo
            itemsParaProcesar = gruposDirigidos.map(grupo => {
                const docenteNombre = grupo.director ? `${grupo.director.identidad?.nombre} ${grupo.director.identidad?.apellidos}`.toUpperCase() : "SIN ASIGNAR";
                return {
                    grupo: grupo,
                    asignaturaNombre: 'COMPORTAMIENTO',
                    docenteNombre: docenteNombre
                };
            });

        } else {

            // RUTA B: Buscar por Carga Académica (Asistencia, Notas, Seguimiento)
            const cargas = await planillaRepository.findCargasPorDocente(idDocenteTarget, vigencia.id);
            if (!cargas || cargas.length === 0) {
                throw new Error("El docente no tiene asignaturas en su carga académica para esta vigencia.");
            }

            // Normalizamos para el ciclo
            itemsParaProcesar = cargas.map(carga => {
                const docenteNombre = carga.docente ? `${carga.docente.identidad?.nombre} ${carga.docente.identidad?.apellidos}`.toUpperCase() : "SIN ASIGNAR";
                return {
                    grupo: carga.grupo,
                    asignaturaNombre: carga.asignatura.nombre,
                    docenteNombre: docenteNombre
                };
            });
        }

        // 3. Generación del PDF (Ciclo unificado)
        const colegio = await planillaRepository.findColegio();
        const logoBase64 = await _obtenerLogoBase64();
        const paginas = [];
        const cacheMatriculas = {};

        const columnasAsistencia = Array.from({ length: 20 }, (_, i) => i + 1);
        const columnasSeguimiento = Array.from({ length: 10 }, (_, i) => i + 1);

        for (const item of itemsParaProcesar) {
            const { grupo, asignaturaNombre, docenteNombre } = item;

            if (!cacheMatriculas[grupo.id]) {
                cacheMatriculas[grupo.id] = await planillaRepository.findMatriculasActivasPorGrupo(grupo.id, vigencia.id);
            }
            const matriculas = cacheMatriculas[grupo.id];

            const estudiantesFormateados = matriculas.map((m, index) => {
                const est = m.estudiante;
                return {
                    numero: (index + 1).toString().padStart(2, '0'),
                    nombreCompleto: `${est.primerApellido} ${est.segundoApellido || ''} ${est.primerNombre} ${est.segundoNombre || ''}`.trim(),
                    documento: est.documento
                };
            });

            paginas.push({
                nombreInstitucion: colegio ? colegio.nombre : "INSTITUCIÓN EDUCATIVA",
                urlEscudo: logoBase64,
                tituloPlanilla: TITULOS_PLANILLA[tipoPlanilla] || 'PLANILLA INSTITUCIONAL',
                sedeNombre: grupo.sede.nombre,
                gradoNombre: grupo.grado.nombre,
                grupoNombre: grupo.nombre,
                jornada: grupo.jornada === 'MANANA' ? 'MAÑANA' : grupo.jornada,
                anioLectivo: vigencia.anio,
                periodo: periodo,
                docenteNombre: docenteNombre,
                asignaturaNombre: asignaturaNombre,
                estudiantes: estudiantesFormateados,
                columnasAsistencia,
                columnasSeguimiento
            });
        }

        return await pdfService.crearPdfPlanillasNuevas({ paginas }, tipoPlanilla);
    }
};

// Función auxiliar para obtener el logo en base64
async function _obtenerLogoBase64() {
    try {
        const logoPath = path.join(__dirname, '../../public/uploads/institucional/escudo-instecau.png');
        const imageBuffer = await fs.readFile(logoPath);
        const ext = path.extname(logoPath).substring(1);
        const mimeType = ext === 'jpg' ? 'jpeg' : ext;
        return `data:image/${mimeType};base64,${imageBuffer.toString('base64')}`;
    } catch (error) {
        console.warn("⚠️ No se pudo cargar el logo para el PDF de planillas.");
        return "";
    }
}