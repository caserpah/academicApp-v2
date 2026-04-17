/**
 * Archivo: matriculaMapper.js
 * Descripción: Funciones para mapear y formatear datos de matrícula para reportes PDF.
 */
const diccionarios = {
    sexo: { M: "MASCULINO", F: "FEMENINO", I: "INTERSEXUAL" },
    situacion: { APROBO: "APROBÓ", REPROBO: "REPROBÓ", NO_ESTUDIO: "NO ESTUDIÓ", NO_CULMINO: "NO CULMINÓ", SIN_INFO: "SIN INFORMACIÓN" },
    victimas: { DPZ: "DESPLAZADO", DGA: "DESMOVILIZADO G.A.", HDZ: "HIJO DESMOVILIZADO", OTR: "OTRO", NA: "NO APLICA" },
    etnia: { INDIGENA: "INDÍGENA", AFROCOLOMBIANO: "AFROCOLOMBIANO", RAIZAL: "RAIZAL", ROM_GITANO: "ROM/GITANO", NO_APLICA: "NINGUNA" },
    discapacidad: { NINGUNA: "NINGUNA", FISICA: "FÍSICA", AUDITIVA: "AUDITIVA", VISUAL: "VISUAL", SORDOCEGUERA: "SORDOCEGUERA", INTELECTUAL: "INTELECTUAL", PSICOSOCIAL: "PSICOSOCIAL", MULTIPLE: "MÚLTIPLE", OTRA: "OTRA" },
    nivel: { PREESCOLAR: "PREESCOLAR", PRIMARIA: "PRIMARIA", SECUNDARIA: "SECUNDARIA", MEDIA_ACADEMICA: "MEDIA ACADÉMICA", MEDIA_TECNICA: "MEDIA TÉCNICA" },
    jornada: { MANANA: "MAÑANA", TARDE: "TARDE", NOCTURNA: "NOCTURNA", FIN_DE_SEMANA: "FIN DE SEMANA", UNICA: "ÚNICA" }
};

const formatEnum = (valor, dict) => valor && dict[valor] ? dict[valor] : (valor || "N/A");

// Función: Conversor inteligente de fechas y horas
export const formatearFecha = (fecha, incluirHora = false) => {
    if (!fecha) return "N/A";
    try {
        // Convertir a texto para extraer partes de forma segura (Ej: "2020-07-28")
        const fechaStr = fecha instanceof Date ? fecha.toISOString() : String(fecha);

        // Buscar el patrón de fecha YYYY-MM-DD
        const match = fechaStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (match) {
            const [_, year, month, day] = match;
            let resultado = `${day}/${month}/${year}`;

            // Agregar hora si se solicita y el dato la contiene
            if (incluirHora && fechaStr.includes('T')) {
                const d = new Date(fecha);
                let hours = d.getHours();
                const minutes = String(d.getMinutes()).padStart(2, '0');
                const ampm = hours >= 12 ? 'PM' : 'AM';
                hours = hours % 12 || 12;
                resultado += ` ${String(hours).padStart(2, '0')}:${minutes} ${ampm}`;
            }
            return resultado;
        }
        return fechaStr; // Si no es una fecha válida, devuelve lo que llegó
    } catch (e) {
        return fecha;
    }
};

export const mapearDatosMatricula = (matriculaRaw, esBlanco = false) => {
    // FORMATO EN BLANCO
    if (esBlanco) {
        return {
            esFormatoBlanco: true,
            esPrematricula: false,
            tituloReporte: "MATRÍCULA",
            vigencia: { anio: "________" },
            folio: "________________",
            fechaFormateada: "________________",
            sedeNombre: "___________",
            grupo: { nivel: "________", grado: "________", nombre: "________", jornada: "________" },
            metodologia: "________________",
            esNuevo: "________",
            esRepitente: "________",
            situacionAnterior: "________________",
            estudiante: {
                apellidos: "____________________________________",
                nombres: "____________________________________",
                tipoDoc: "____",
                documento: "____________________",
                lugarExpedicion: "____________________",
                mupioExp: "________________", deptoExp: "",
                fechaNac: "________________",
                mupioNac: "________________", deptoNac: "",
                genero: "________", rh: "____",
                direccion: "____________________________________",
                barrio: "____________________", estrato: "____",
                mupioResidencia: "____________________", zona: "________",
                telefono: "____________________",
                eps: "____________________", ars: "________________", sisben: "________",
                pobVictima: "____________________",
                etnia: "____________________", resguardo: "",
                discapacidad: "____________________",
                capacidadExcepcional: "____________________"
            },
            acudiente: {
                nombre: "________________________________________",
                parentesco: "________________",
                telefono: "____________________",
                tipoDoc: "____",
                documento: "____________________",
                fechaNac: "________________",
                direccion: "____________________________________",
                email: "____________________________________"
            },
            observaciones: ""
        };
    }

    // MAPEO DE DATOS REALES
    const est = matriculaRaw.estudiante || {};
    // Extraemos el primer acudiente si existe
    const acu = (est.acudientes && est.acudientes.length > 0) ? est.acudientes[0] : {};
    const parentescoExtraido = acu.acudiente_estudiantes?.afinidad || acu.AcudienteEstudiantes?.afinidad || "";

    const grupo = matriculaRaw.grupo || {};
    const grado = grupo.grado || {};

    return {
        esFormatoBlanco: false,
        esPrematricula: matriculaRaw.estado === "PREMATRICULADO",
        tituloReporte: matriculaRaw.estado === "PREMATRICULADO" ? "PRE-MATRÍCULA" : "MATRÍCULA",
        vigencia: { anio: matriculaRaw.vigencia?.anio || "" },
        sedeNombre: matriculaRaw.sede?.dataValues?.nombre || matriculaRaw.sede?.nombre || "" ,
        folio: matriculaRaw.folio,
        fechaFormateada: formatearFecha(matriculaRaw.fechaHora, true),
        grupo: {
            nivel: formatEnum(grado.nivelAcademico, diccionarios.nivel),
            grado: grado.nombre ? grado.nombre.replace(/_/g, " ") : "",
            nombre: grupo.nombre || "",
            jornada: formatEnum(grupo.jornada, diccionarios.jornada)
        },
        metodologia: matriculaRaw.metodologia,
        esNuevo: matriculaRaw.es_nuevo ? "SÍ" : "NO",
        esRepitente: matriculaRaw.es_repitente ? "SÍ" : "NO",
        situacionAnterior: formatEnum(matriculaRaw.situacion_ano_anterior, diccionarios.situacion),
        estudiante: {
            apellidos: `${est.primerApellido || ''} ${est.segundoApellido || ''}`.trim(),
            nombres: `${est.primerNombre || ''} ${est.segundoNombre || ''}`.trim(),
            tipoDoc: est.tipoDocumento || "",
            documento: est.documento || "",
            lugarExpedicion: est.lugarExpedicion || "",
            fechaNac: formatearFecha(est.fechaNacimiento, false),
            lugarNacimiento: est.lugarNacimiento || "",
            genero: formatEnum(est.sexo, diccionarios.sexo),
            rh: est.rh || "",
            direccion: est.direccion || "",
            barrio: est.barrio || "",
            estrato: est.estrato || "",
            municipioResidencia: est.municipioResidencia || "",
            zona: "",
            telefono: est.contacto || "",
            eps: est.eps || "",
            sisben: est.sisben || "",
            pobVictima: formatEnum(est.victimas, diccionarios.victimas),
            etnia: formatEnum(est.etnia, diccionarios.etnia),
            resguardo: "",
            discapacidad: formatEnum(est.discapacidad, diccionarios.discapacidad),
            capacidadExcepcional: formatEnum(est.capacidades, diccionarios.victimas)
        },
        acudiente: {
            nombre: acu.nombres ? `${acu.nombres} ${acu.apellidos}` : "NO REGISTRADO",
            parentesco: parentescoExtraido,
            telefono: acu.telefono || "",
            tipoDoc: acu.tipoDocumento || "",
            documento: acu.documento || "",
            lugarExpedicion: acu.lugarExpedicion || "",
            fechaNac: formatearFecha(acu.usuario?.fechaNacimiento || acu.fechaNacimiento, false),
            direccion: acu.direccion || "",
            email: acu.usuario?.email || acu.email || ""
        },
        observaciones: matriculaRaw.observaciones
    };
};