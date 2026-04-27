import { listadoRepository } from "../repositories/listado.repository.js";
import { pdfService } from "./pdf.service.js";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const _calcularEdad = (fechaNacimiento) => {
    if (!fechaNacimiento) return "-";
    const hoy = new Date();
    const cumple = new Date(fechaNacimiento);
    let edad = hoy.getFullYear() - cumple.getFullYear();
    const mes = hoy.getMonth() - cumple.getMonth();
    if (mes < 0 || (mes === 0 && hoy.getDate() < cumple.getDate())) {
        edad--;
    }
    return edad;
};

// Formatear texto para el PDF (Ej: "PRE_JARDIN" -> "PRE JARDIN", "MANANA" -> "MAÑANA")
const _formatearTexto = (texto) => {
    if (!texto) return texto;
    return texto
        .replace(/_/g, ' ')   // Cambia todos los guiones bajos por espacios (PRE_JARDIN -> PRE JARDIN)
        .replace(/MANANA/g, 'MAÑANA'); // Agrega la Ñ a la jornada
};

// Logo institucional
async function _obtenerLogoBase64() {
    try {
        const logoPath = path.join(__dirname, '../../public/uploads/institucional/escudo-instecau.png');
        const imageBuffer = await fs.readFile(logoPath);
        const ext = path.extname(logoPath).substring(1);
        const mimeType = ext === 'jpg' ? 'jpeg' : ext;
        return `data:image/${mimeType};base64,${imageBuffer.toString('base64')}`;
    } catch (error) {
        console.warn("⚠️ No se pudo cargar el logo para el listado.");
        return "";
    }
}

// ==========================================================
// SERVICIO PRINCIPAL DE LISTADOS
// ==========================================================
export const listadoService = {

    /** * 1. Obtener catálogo para los selectores del frontend
     */
    async obtenerCatalogoFiltros(vigenciaId) {
        const sedesDB = await listadoRepository.getCatalogoFiltros(vigenciaId);

        // Convertimos a JSON puro para poder modificar las propiedades
        const sedes = sedesDB.map(s => s.toJSON());

        // Limpiamos los nombres de grados y jornadas antes de enviarlos al frontend
        sedes.forEach(sede => {
            if (sede.grupos) {
                sede.grupos.forEach(grupo => {
                    if (grupo.grado?.nombre) {
                        grupo.grado.nombre = _formatearTexto(grupo.grado.nombre);
                    }
                    if (grupo.jornada) {
                        grupo.jornada = _formatearTexto(grupo.jornada);
                    }
                });
            }
        });

        return sedes;
    },

    /** * 2. Generador Masivo de Estudiantes
     */
    async generarListadoEstudiantes(vigenciaId, anioLectivo, filtros) {
        const { rangoInicial, rangoFinal } = filtros;

        const nombreInstitucion = await listadoRepository.getDatosInstitucionales();

        rangoInicial.sedeId = Number(rangoInicial.sedeId);
        rangoInicial.gradoOrden = Number(rangoInicial.gradoOrden);
        rangoFinal.sedeId = Number(rangoFinal.sedeId);
        rangoFinal.gradoOrden = Number(rangoFinal.gradoOrden);

        // Determinar qué sedes buscar (Rango numérico de IDs)
        // Construimos un array con los IDs de las sedes que están entre la inicial y la final.
        const sedesIds = [];
        for (let i = rangoInicial.sedeId; i <= rangoFinal.sedeId; i++) {
            sedesIds.push(i);
        }

        // Traemos los datos "delgados" de la base de datos
        const matriculasRaw = await listadoRepository.findEstudiantesOptimizados(vigenciaId, sedesIds);

        // Agruparemos por "Llave de Grupo" (Ej: "1-6-A" -> Sede 1, Orden Grado 6, Grupo A)
        const diccionarioGrupos = {};

        matriculasRaw.forEach(matricula => {
            const est = matricula.estudiante;
            const sId = matricula.sede.id;
            const gOrd = matricula.grupo.grado.orden;
            const gNom = matricula.grupo.nombre;

            // --- LÓGICA DE TIJERA: ¿Está dentro del rango? ---
            let pasaInicial = false;
            if (sId > rangoInicial.sedeId) pasaInicial = true;
            else if (sId === rangoInicial.sedeId) {
                if (gOrd > rangoInicial.gradoOrden) pasaInicial = true;
                else if (gOrd === rangoInicial.gradoOrden && gNom.localeCompare(rangoInicial.grupoNombre) >= 0) pasaInicial = true;
            }

            let pasaFinal = false;
            if (sId < rangoFinal.sedeId) pasaFinal = true;
            else if (sId === rangoFinal.sedeId) {
                if (gOrd < rangoFinal.gradoOrden) pasaFinal = true;
                else if (gOrd === rangoFinal.gradoOrden && gNom.localeCompare(rangoFinal.grupoNombre) <= 0) pasaFinal = true;
            }

            // Si está dentro del rango, lo guardamos en su grupo
            if (pasaInicial && pasaFinal) {
                const llaveGrupo = `${sId}-${gOrd}-${gNom}`;

                if (!diccionarioGrupos[llaveGrupo]) {
                    const dir = matricula.grupo.director?.identidad;
                    diccionarioGrupos[llaveGrupo] = {
                        institucion: nombreInstitucion.toUpperCase(),
                        anioLectivo: anioLectivo,
                        sedeNombre: matricula.sede.nombre.toUpperCase(),
                        gradoNombre: _formatearTexto(matricula.grupo.grado.nombre).toUpperCase(),
                        grupoNombre: gNom,
                        jornada: _formatearTexto(matricula.grupo.jornada).toUpperCase(),
                        directorNombre: dir ? `${dir.apellidos} ${dir.nombre}`.toUpperCase() : "SIN ASIGNAR",
                        estudiantes: []
                    };
                }

                diccionarioGrupos[llaveGrupo].estudiantes.push({
                    tipoDoc: est.tipoDocumento,
                    documento: est.documento,
                    apellidosNombres: `${est.primerApellido} ${est.segundoApellido || ''} ${est.primerNombre} ${est.segundoNombre || ''}`.replace(/\s+/g, ' ').trim(),
                    edad: _calcularEdad(est.fechaNacimiento),
                    sexo: est.sexo
                });
            }
        });

        // Convertimos el diccionario a un Array y le añadimos numeración consecutiva
        const gruposFinales = Object.values(diccionarioGrupos).map(grupo => {
            grupo.estudiantes = grupo.estudiantes.map((est, index) => ({
                nro: index + 1,
                ...est
            }));
            return grupo;
        });

        if (gruposFinales.length === 0) throw new Error("No se encontraron estudiantes en el rango seleccionado.");

        // Construir Contexto PDF
        const contextoHbs = {
            urlEscudo: await _obtenerLogoBase64(),
            fechaGeneracion: new Date().toLocaleDateString('es-CO'),
            grupos: gruposFinales
        };

        return await pdfService.crearPdfListado(contextoHbs, 'listado-estudiantes.hbs');
    },

    /** * 3. Listado de Directores de Grupo
     */
    async generarListadoDirectores(vigenciaId, sedeId) {
        const grupos = await listadoRepository.findDirectoresGrupo(vigenciaId, sedeId);

        const nombreInstitucion = await listadoRepository.getDatosInstitucionales();

        // Agrupar por sede para facilitar la vista en el PDF
        const sedesDict = {};
        grupos.forEach(grupo => {
            const sedeNombre = grupo.sede.nombre.toUpperCase();
            if (!sedesDict[sedeNombre]) {
                sedesDict[sedeNombre] = { nombreSede: sedeNombre, registros: [] };
            }

            const director = grupo.director?.identidad;
            sedesDict[sedeNombre].registros.push({
                grado: _formatearTexto(grupo.grado.nombre),
                grupo: grupo.nombre,
                jornada: _formatearTexto(grupo.jornada),
                directorNombre: director ? `${director.apellidos} ${director.nombre}`.toUpperCase() : "SIN ASIGNAR"
            });
        });

        const sedesFinales = Object.values(sedesDict).map(sede => {
            sede.registros = sede.registros.map((reg, index) => ({ nro: index + 1, ...reg }));
            return sede;
        });

        const contextoHbs = {
            urlEscudo: await _obtenerLogoBase64(),
            nombreInstitucion: nombreInstitucion.toUpperCase(),
            titulo: "DIRECTORES DE GRUPO",
            sedes: sedesFinales
        };
        return await pdfService.crearPdfListado(contextoHbs, 'listado-directores.hbs');
    },

    /** * 4. Listado de Docentes
     */
    async generarListadoDocentes(sedeId) {
        const docentes = await listadoRepository.findDocentesListado(sedeId);
        const nombreInstitucion = await listadoRepository.getDatosInstitucionales();

        const sedesDict = {};
        docentes.forEach(doc => {
            const sedeNombre = doc.sede.nombre.toUpperCase();
            if (!sedesDict[sedeNombre]) {
                sedesDict[sedeNombre] = { nombreSede: sedeNombre, registros: [] };
            }

            const iden = doc.identidad;
            sedesDict[sedeNombre].registros.push({
                documento: iden.documento,
                docenteNombre: `${iden.apellidos} ${iden.nombre}`.toUpperCase()
            });
        });

        const sedesFinales = Object.values(sedesDict).map(sede => {
            sede.registros = sede.registros.map((reg, index) => ({ nro: index + 1, ...reg }));
            return sede;
        });

        const contextoHbs = {
            urlEscudo: await _obtenerLogoBase64(),
            nombreInstitucion: nombreInstitucion.toUpperCase(),
            titulo: "PLANTEL DOCENTE",
            sedes: sedesFinales
        };
        return await pdfService.crearPdfListado(contextoHbs, 'listado-docentes.hbs');
    },

    /** * 5. Listado de Áreas y Asignaturas
     */
    async generarListadoAreasAsignaturas(vigenciaId, incluirAsignaturas = true) {
        const areas = await listadoRepository.findAreasYAsignaturas(vigenciaId);
        const nombreInstitucion = await listadoRepository.getDatosInstitucionales();

        const contextoHbs = {
            urlEscudo: await _obtenerLogoBase64(),
            nombreInstitucion: nombreInstitucion.toUpperCase(),
            incluirAsignaturas,
            areas: areas.map(a => ({
                codigo: a.codigo,
                nombre: a.nombre,
                asignaturas: a.asignaturas.map(asig => ({
                    codigo: asig.codigo,
                    nombre: asig.nombre,
                    peso: asig.porcentual
                }))
            }))
        };
        return await pdfService.crearPdfListado(contextoHbs, 'listado-areas.hbs');
    }
};