import { VentanaCalificacion } from "../models/ventana_calificacion.js";
import { Juicio } from "../models/juicio.js";

export const PORCENTAJES = {
    ACADEMICA: 0.50,
    ACUMULATIVA: 0.20,
    LABORAL: 0.15,
    SOCIAL: 0.15
};

export const DIM = {
    ACADEMICA: 1,
    SOCIAL: 2,
    LABORAL: 3,
    ACUMULATIVA: 4,
    COMPORTAMIENTO: 999
};

// Helper para limpiar el nombre de la hoja de Excel, eliminando caracteres no permitidos y limitando su longitud.
export const limpiarNombreHoja = (nombre) => {
    return nombre.replace(/[\/\\\?\*\[\]\:]/g, '').substring(0, 30).toUpperCase();
};

// Helper para identificar si una asignatura es de comportamiento, basándonos en su nombre.
export const esComportamiento = (nombreAsignatura) => {
    if (!nombreAsignatura) return false;
    const nombre = nombreAsignatura.toUpperCase().trim();
    return nombre.includes("COMPORTAMIENTO") || nombre.includes("DISCIPLINA") || nombre.includes("CONVIVENCIA");
};

// Helper para validar si la ventana de calificaciones está abierta o si el usuario tiene permisos para editar fuera de la ventana.
export const validarVentana = async (periodo, vigenciaId, data, esSoloCambioTexto = false) => {
    const ventana = await VentanaCalificacion.findOne({ where: { periodo, vigenciaId } });
    if (!ventana) throw new Error("Para este periodo aún no se ha creado la ventana de calificaciones.");

    const hoy = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const estaEnFecha = hoy >= ventana.fechaInicio && hoy <= ventana.fechaFin;

    if (estaEnFecha) return true;

    const ROLES_ADMINISTRATIVOS = ['admin', 'director', 'secretaria', 'coordinador'];
    const esAdministrativo = data.role ? ROLES_ADMINISTRATIVOS.includes(data.role) : false;

    // Solo los administrativos pueden editar fuera de la ventana, y aún así con restricciones.
    if (!esAdministrativo) throw new Error(`El periodo de calificaciones está cerrado (Finalizó: ${ventana.fechaFin}).`);

    if (data.notaDefinitivaInput !== undefined || esSoloCambioTexto || (data.observacion_cambio && data.observacion_cambio.trim().length > 5)) {
        return true;
    }

    const error = new Error("El periodo académico está cerrado. Se requiere justificación administrativa.");
    error.code = "REQ_JUSTIFICACION";
    throw error;
};

// Helper para obtener el juicio correspondiente a una nota, basándose en los rangos definidos y el contexto (dimensión, periodo, grado, asignatura).
export const obtenerJuicio = async (nota, rangos, context, dimensionId) => {
    if (nota === null || nota === undefined) return "PENDIENTE";
    if (!dimensionId) return "SIN DIMENSIÓN";

    const rango = rangos.find(r => nota >= r.minNota && nota <= r.maxNota);
    if (!rango) return "SIN RANGO";

    let idDesempenoBusqueda = rango.desempenoId;

    try {
        let whereClause = { vigenciaId: context.vigenciaId, dimensionId: dimensionId, activo: true };

        if (dimensionId === DIM.COMPORTAMIENTO) {
            Object.assign(whereClause, { periodo: 0, gradoId: null, asignaturaId: context.asignaturaId, desempenoId: idDesempenoBusqueda });
        } else if (dimensionId === DIM.ACUMULATIVA) {
            Object.assign(whereClause, { periodo: 0, gradoId: null, asignaturaId: null, desempenoId: idDesempenoBusqueda });
        } else if (dimensionId === DIM.SOCIAL || dimensionId === DIM.LABORAL) {
            let juicioPreescolar = await Juicio.findOne({
                where: { ...whereClause, periodo: context.periodo, gradoId: context.gradoId, asignaturaId: context.asignaturaId, desempenoId: idDesempenoBusqueda }
            });
            if (juicioPreescolar && juicioPreescolar.texto) return juicioPreescolar.texto;
            Object.assign(whereClause, { periodo: 0, gradoId: null, asignaturaId: null, desempenoId: idDesempenoBusqueda });
        } else if (dimensionId === DIM.ACADEMICA) {
            Object.assign(whereClause, { periodo: context.periodo, gradoId: context.gradoId, asignaturaId: context.asignaturaId });
            whereClause.desempenoId = context.nivelAcademico !== "PREESCOLAR" ? 5 : idDesempenoBusqueda;
        }

        const juicioEncontrado = await Juicio.findOne({ where: whereClause });
        if (juicioEncontrado && juicioEncontrado.texto) return juicioEncontrado.texto;

    } catch (error) {
        console.error(`Error recuperando juicio Dimensión ${dimensionId}:`, error);
    }
    return rango.desempeno ? rango.desempeno.nombre : "PENDIENTE";
};

// Helper para obtener el juicio de las áreas para el informe final, basándose en los rangos definidos
export const obtenerJucioArea = (desempeno, nombreArea, esPreescolar) => {
    const areaFormat = nombreArea.toUpperCase();
    const esComportamiento = areaFormat === 'COMPORTAMIENTO' || areaFormat === 'DISCIPLINA';

    // ==========================================
    // 1. JUICIOS EXCLUSIVOS PARA COMPORTAMIENTO
    // ==========================================
    if (esComportamiento) {
        if (esPreescolar) {
            // Comportamiento Preescolar
            switch (desempeno) {
                case 'SUPERIOR': return `Demuestra una excelente adaptación, participando en un clima de respeto y cariño con sus compañeros y docentes.`;
                case 'ALTO': return `Mantiene buenas relaciones con sus compañeros y sigue de forma adecuada los acuerdos de convivencia del aula.`;
                case 'BASICO':
                case 'BÁSICO': return `Se encuentra en proceso de comprender y aplicar los acuerdos de convivencia. Se recomienda seguir fortaleciendo el respeto y la escucha activa.`;
                case 'BAJO': return `Requiere acompañamiento constante para integrarse armónicamente y respetar los acuerdos básicos de convivencia en el aula.`;
                default: return `Presenta un desarrollo ${desempeno} en su proceso de socialización y convivencia.`;
            }
        } else {
            // Comportamiento Primaria / Secundaria / Ciclos
            switch (desempeno) {
                case 'SUPERIOR': return `Su comportamiento es excelente, demostrando un alto sentido de pertenencia, liderazgo positivo y un estricto respeto por el Manual de Convivencia.`;
                case 'ALTO': return `Evidencia un buen comportamiento y respeto por las normas de la institución, manteniendo un trato cordial con la comunidad educativa.`;
                case 'BASICO':
                case 'BÁSICO': return `Su comportamiento es aceptable, pero se hace necesario un mayor compromiso para acatar plenamente los acuerdos establecidos en el Manual de Convivencia.`;
                case 'BAJO': return `Presenta llamados de atención reiterados por el incumplimiento del Manual de Convivencia, afectando la armonía institucional.`;
                default: return `Evidencia un comportamiento ${desempeno} durante el año lectivo.`;
            }
        }
    }

    // ==========================================
    // 2. JUICIOS PARA ÁREAS ACADÉMICAS
    // ==========================================
    if (esPreescolar) {
        switch (desempeno) {
            case 'SUPERIOR': return `Participa de manera activa, alegre y sobresaliente en las experiencias propuestas para el área, demostrando un desarrollo excepcional de sus habilidades y talentos.`;
            case 'ALTO': return `Se involucra con entusiasmo y logra de manera favorable los propósitos de desarrollo esperados para el área durante este año lectivo.`;
            case 'BASICO':
            case 'BÁSICO': return `Se encuentra en proceso de afianzar sus habilidades en el área. Es muy importante seguir motivándolo y celebrando sus pequeños logros para fortalecer su confianza.`;
            case 'BAJO': return `Requiere mayor acompañamiento afectivo y estrategias lúdicas continuas, tanto en el aula como en casa, para potenciar su ritmo de desarrollo en el área.`;
            default: return `Continúa su hermoso proceso de descubrimiento y exploración en el área.`;
        }
    } else {
        switch (desempeno) {
            case 'SUPERIOR': return `Alcanzó de manera excepcional todas las competencias propuestas para el área, demostrando un nivel de apropiación y aplicación sobresaliente.`;
            case 'ALTO': return `Logró los objetivos y competencias del área con un buen nivel de comprensión y ejecución en las actividades propuestas durante el año lectivo.`;
            case 'BASICO':
            case 'BÁSICO': return `Alcanzó los niveles mínimos requeridos en las competencias del área, siendo necesario un mayor compromiso para superar sus debilidades.`;
            case 'BAJO': return `Presentó dificultades significativas para alcanzar las competencias mínimas del área, requiriendo acompañamiento constante y estrategias de refuerzo.`;
            default: return `Presentó un desempeño ${desempeno} en el área.`;
        }
    }
}