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

        // Agregar las 3 filas vacías al final
        /*const cantidadActual = estudiantesFormateados.length;
        for (let i = 1; i <= 3; i++) {
            estudiantesFormateados.push({
                numero: (cantidadActual + i).toString().padStart(2, '0'),
                nombreCompleto: '',
                documento: ''
            });
        }*/

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

        // Generar el PDF
        return await pdfService.crearPdfPlanillasNuevas(contextoHbs, tipoPlanilla);
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