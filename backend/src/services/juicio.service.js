import { sequelize } from "../database/db.connect.js";
import { juicioRepository } from "../repositories/juicio.repository.js";
import { Grado } from "../models/grado.js"; // Necesario para validar nivel
import { Asignatura } from "../models/asignatura.js";
import { Dimension } from "../models/dimension.js";
import { Desempeno } from "../models/desempeno.js";
import { Juicio } from "../models/juicio.js";
import { handleSequelizeError } from "../middleware/handleSequelizeError.js";
import { formatearErrorForaneo } from "../utils/dbUtils.js";
import * as XLSX from 'xlsx';

// Constantes para mejorar la legibilidad del código
const DIMENSION = {
    ACADEMICA: 1,
    SOCIAL: 2,
    LABORAL: 3,
    ACUMULATIVA: 4,
    COMPORTAMIENTO: 999 // ID 999 para NO APLICA
};

const NIVEL = {
    PREESCOLAR: "PREESCOLAR"
};

export const juicioService = {

    /**
     * Listado con filtros, ordenamiento y paginación.
     */
    async list(params, vigenciaId) {
        const page = Number(params.page) || 1;
        const limit = Number(params.limit) || 10;
        const orderBy = params.orderBy || "gradoId";
        const order = params.order || "DESC";

        return juicioRepository.findAll({
            ...params,
            page,
            limit,
            orderBy,
            order,
            vigenciaId
        });
    },

    async get(id, vigenciaId) {
        const registro = await juicioRepository.findById(id, vigenciaId);
        if (!registro) {
            const err = new Error("No se encontró el juicio solicitado.");
            err.status = 404;
            throw err;
        }
        return registro;
    },

    /**
     * CREAR JUICIO (Con Reglas de Negocio)
     */
    async create(data, vigenciaId) {

        try {
            const vigenciaSegura = Number(vigenciaId);
            if (isNaN(vigenciaSegura)) {
                throw new Error("El ID de la vigencia no es válido.");
            }

            // 1. Validar reglas de negocio y formatear datos (Global vs Específico)
            const payloadValidado = await this._aplicarReglasNegocio(data);

            // 2. Verificar duplicados manualmente (para manejar NULLs correctamente)
            await this._verificarDuplicados(payloadValidado, vigenciaSegura);

            // 3. Crear el registro
            const nuevo = await juicioRepository.create({
                ...payloadValidado,
                vigenciaId: vigenciaSegura, // Se inyecta la vigencia del usuario
            });

            return juicioRepository.findById(nuevo.id, vigenciaSegura);
        } catch (error) {
            throw handleSequelizeError(error);
        }
    },

    /**
     * ACTUALIZAR JUICIO (Con Reglas de Negocio)
     */
    async update(id, data, vigenciaId) {
        try {
            const vigenciaSegura = Number(vigenciaId);
            const actual = await juicioRepository.findById(id, vigenciaSegura);
            if (!actual) {
                const err = new Error("No se encontró el juicio solicitado.");
                err.status = 404;
                throw err;
            }

            // Combinamos datos actuales con los nuevos para validar el estado final
            const datosAProcesar = { ...actual.toJSON(), ...data };

            // 1. Re-validar reglas de negocio
            const payloadValidado = await this._aplicarReglasNegocio(datosAProcesar);

            // 2. Verificar duplicados (excluyendo el ID actual)
            await this._verificarDuplicados(payloadValidado, vigenciaSegura, id);

            // 3. Actualizar
            await juicioRepository.updateById(id, payloadValidado);

            return juicioRepository.findById(id, vigenciaSegura);
        } catch (error) {
            throw handleSequelizeError(error);
        }
    },

    async remove(id, vigenciaId) {
        try {
            const registro = await juicioRepository.findById(id, vigenciaId);
            if (!registro) {
                const err = new Error("No se encontró el juicio solicitado.");
                err.status = 404;
                throw err;
            }
            await juicioRepository.deleteById(id, vigenciaId);
            return true;
        } catch (error) {
            throw formatearErrorForaneo(
                error,
                "este juicio",
                "calificaciones asociadas"
            );
        }
    },

    // ==========================================
    // LÓGICA PRIVADA DE NEGOCIO
    // ==========================================

    /**
     * Define si el juicio es global o específico y limpia los datos.
     */
    async _aplicarReglasNegocio(data) {
        let { gradoId, dimensionId, asignaturaId, periodo, desempenoId, texto, activo } = data;

        // Convertir a número para comparaciones seguras
        const idDimension = Number(dimensionId);
        const idDesempeno = Number(desempenoId);

        if (isNaN(idDimension)) throw new Error("La competencia es obligatoria.");
        if (isNaN(idDesempeno)) throw new Error("El rango de desempeño es obligatorio.");

        // Normalizar gradoId: Si viene vacío o "0", lo tratamos como null (global)
        if (!gradoId || gradoId === "" || gradoId === "0") {
            gradoId = null;
        }

        // Validar Grado SOLO si viene un ID (Si es null, es modo Global)
        let esPreescolar = false;

        if (gradoId) {
            const grado = await Grado.findByPk(gradoId);
            if (!grado) throw new Error("El grado seleccionado no existe.");
            esPreescolar = grado.nivelAcademico === NIVEL.PREESCOLAR;
        }

        // NORMALIZACIÓN DE PERIODO (String "0" -> Numero 0)
        let periodoFinal = null;
        if (periodo !== undefined && periodo !== null && periodo !== "") {
            periodoFinal = Number(periodo); // Convierte "0" a 0, "1" a 1
            if (isNaN(periodoFinal)) periodoFinal = null;
        }

        // Objeto base limpio
        const payload = {
            gradoId,
            dimensionId: idDimension,
            desempenoId: idDesempeno,
            texto,
            activo: activo ?? true,
            asignaturaId: asignaturaId || null,
            periodo: periodoFinal
        };

        // --- APLICACIÓN DE CASOS ---

        // Registrar Juicio de COMPORTAMIENTO (999)
        if (idDimension === DIMENSION.COMPORTAMIENTO) {
            payload.gradoId = null;           // Global
            payload.dimensionId = 999;        // Forzamos ID NO APLICA
            payload.periodo = 0;            // Periodo Cero
            // asignaturaId SE RESPETA (viene del form)
        }

        // Registrar Juicio para la dimensión ACUMULATIVA (4)
        else if (idDimension === DIMENSION.ACUMULATIVA) {
            payload.gradoId = null;           // Global
            payload.asignaturaId = null;      // Sin Asignatura
            payload.periodo = 0;            // Periodo Cero
        }

        // Registrar Juicio para la dimensión LABORAL O SOCIAL (2, 3)
        else if (idDimension === DIMENSION.SOCIAL || idDimension === DIMENSION.LABORAL) {
            if (!payload.gradoId) {
                // Si NO hay grado -> Es Global (Primaria/Secundaria)
                payload.asignaturaId = null;
                payload.periodo = 0;
            } else {
                // Si HAY grado -> Debe ser Preescolar (validado visualmente en front)
                if (esPreescolar) {
                    if (!payload.asignaturaId) throw new Error("Para grados de Preescolar se requiere Asignatura.");
                    if (payload.periodo === null || payload.periodo === 0) throw new Error("Los grados de Preescolar requieren un periodo específico.");
                } else {
                    // Fallback seguridad: Si mandaron grado no preescolar, limpiar.
                    payload.gradoId = null;
                    payload.asignaturaId = null;
                    payload.periodo = 0;
                }
            }
        }

        // Registrar Juicio para la dimensión ACADÉMICA (1)
        else if (idDimension === DIMENSION.ACADEMICA) {
            if (!payload.gradoId) throw new Error("La competencia Académica requiere seleccionar un Grado.");
            if (!payload.asignaturaId) throw new Error("La competencia Académica requiere seleccionar una Asignatura.");
            if (payload.periodo === null || payload.periodo === 0) throw new Error("La competencia Académica requiere un Periodo específico.");
        }

        return payload;
    },

    /**
     * Simula un índice único estricto que considera NULLs como valores iguales.
     */
    async _verificarDuplicados(payload, vigenciaId, excludeId = null) {
        // Preparamos los filtros básicos
        const filtros = {
            vigenciaId,
            dimensionId: payload.dimensionId,
            desempenoId: payload.desempenoId,
            excludeId: excludeId, // Pasamos el excludeId directamente al repositorio actualizado
            page: 1,
            limit: 1
        };

        // Asignación explícita de campos para evitar ambigüedad en la búsqueda
        // IMPORTANTE: Pasamos NULL explícito si no hay dato, o el valor si lo hay.

        filtros.gradoId = payload.gradoId || null;
        filtros.asignaturaId = payload.asignaturaId || null;

        // Manejo del cero en periodo
        filtros.periodo = (payload.periodo !== undefined && payload.periodo !== null) ? payload.periodo : null;

        const existe = await juicioRepository.findAll(filtros);

        if (existe.items && existe.items.length > 0) {
            throw new Error("Ya existe un juicio configurado para esta combinación de Grado, Asignatura, Periodo e Indicador de Desempeño.");
        }
    },

    //=========================================
    // FUNCIONALIDAD DE IMPORTACIÓN MASIVA
    //=========================================

    async generarPlantilla() {
        // Definimos las columnas exactas que esperamos
        const headers = [
            'CODIGO_GRADO',      // Ej: 1, 2, 6, TR, JD, C3, C6 (Si es global, dejar vacío)
            'CODIGO_ASIGNATURA', // Ej: MAT04, CNT01
            'CODIGO_DIMENSION',  // Ej: ACAD, ACU, SOC (o use los IDs: 1, 4, 2)
            'CODIGO_DESEMPENO',  // Ej: BA, BS, AL, SU
            'PERIODO',           // 1, 2, 3, 4, 0 (Si no aplica, dejar 0 o vacío)
            'TEXTO_JUICIO',
            'ESTADO'
        ];

        // Datos de Ejemplo:
        // Grado: 2 (Segundo) - Asignatura: CNT01 (Biología) - Dimensión: ACAD (Académica - ID 1) - Desempeño: BS (Básico)
        const data = [
            {
                CODIGO_GRADO: '2',
                CODIGO_ASIGNATURA: 'CNT01',
                CODIGO_DIMENSION: 'ACAD',
                CODIGO_DESEMPENO: 'BS',
                PERIODO: 1,
                TEXTO_JUICIO: 'Identificar los seres vivos...',
                ESTADO: 'ACTIVO'
            }
        ];

        // Crear Libro y Hoja
        const worksheet = XLSX.utils.json_to_sheet(data, { header: headers });
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Plantilla Juicios");

        // Ajustar ancho de columnas
        const wscols = [
            { wch: 15 }, { wch: 20 }, { wch: 15 }, { wch: 15 }, { wch: 10 }, { wch: 50 }, { wch: 10 }
        ];
        worksheet['!cols'] = wscols;

        // Generar Buffer binario
        const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
        return buffer;
    },

    /**
     * IMPORTAR MASIVO DESDE EXCEL (.xlsx)
     * Valida todo el archivo antes de guardar. Si hay un error, rechaza todo.
     */
    async importarMasivo(fileBuffer, vigenciaId) {
        const transaction = await sequelize.transaction();
        const errores = [];
        const registrosParaCrear = [];

        // Set de duplicados detectados en el XLSX para evitar que traiga 2 veces el mismo juicio en el mismo archivo
        const firmasEnExcel = new Set();

        try {
            // Leer el buffer como Workbook
            const workbook = XLSX.read(fileBuffer, { type: 'buffer' });

            // Obtener la primera hoja
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];

            // Convertir a JSON
            // defval: "" asegura que celdas vacías no sean undefined
            // raw: false fuerza a que todo se lea como texto (ayuda con los '001')
            const registrosRaw = XLSX.utils.sheet_to_json(sheet, { defval: "" });

            if (registrosRaw.length === 0) throw new Error("El archivo está vacío.");

            // Cargar Catálogos en Memoria (Para no consultar la BD por cada fila)

            // Grados (Mapeamos Código -> Objeto Completo para validar nivel académico)
            const grados = await Grado.findAll({ attributes: ['id', 'codigo', 'nivelAcademico'], raw: true });
            const mapGrados = new Map(grados.map(g => [String(g.codigo).trim(), g])); // Convertimos g.codigo a String por seguridad si viene numérico

            const asignaturas = await Asignatura.findAll({ attributes: ['id', 'codigo'], raw: true });
            const mapAsignaturas = new Map(asignaturas.map(a => [String(a.codigo).trim(), a.id]));

            const dimensiones = await Dimension.findAll({ attributes: ['id', 'codigo'], raw: true });
            const mapDimensiones = new Map();
            dimensiones.forEach(d => {
                mapDimensiones.set(String(d.id), d.id); // Soporta "1", "4", "999"
                if (d.codigo) mapDimensiones.set(String(d.codigo).trim(), d.id); // Soporta "ACAD", "ACU", "ND"
            });

            const desempenos = await Desempeno.findAll({ attributes: ['id', 'codigo'], raw: true });
            const mapDesempenos = new Map(desempenos.map(d => [String(d.codigo).trim(), d.id])); // Soporta "BA", "BS", "UN"

            // CARGAMOS JUICIOS EXISTENTES (OPTIMIZACIÓN DE RENDIMIENTO)

            // Traemos todos los juicios de la vigencia en una sola consulta
            const juiciosExistentes = await juicioRepository.findAllForValidation(vigenciaId);

            // Creamos un Set de "Firmas" de los juicios que ya existen en BD
            const firmasExistentesDB = new Set(
                juiciosExistentes.map(j => this._generarFirma(j))
            );

            // Iterar y Validar en Memoria
            for (let i = 0; i < registrosRaw.length; i++) {
                const fila = registrosRaw[i];
                const linea = i + 2; // Excel empieza en 1, Header es 1, Datos desde 2

                try {
                    const codGrado = fila['CODIGO_GRADO'] !== undefined ? String(fila['CODIGO_GRADO']).trim() : "";
                    const codAsig = fila['CODIGO_ASIGNATURA'] !== undefined ? String(fila['CODIGO_ASIGNATURA']).trim() : "";
                    const codDim = fila['CODIGO_DIMENSION'] !== undefined ? String(fila['CODIGO_DIMENSION']).trim() : "";
                    const codDesp = fila['CODIGO_DESEMPENO'] !== undefined ? String(fila['CODIGO_DESEMPENO']).trim() : "";
                    const txtPeriodo = fila['PERIODO'];

                    // Validar Existencia en Catálogos y Obtener IDs
                    let gradoId = null;
                    let esPreescolar = false;

                    if (codGrado) {
                        const g = mapGrados.get(codGrado);
                        if (!g) throw new Error(`Grado '${codGrado}' no existe.`);
                        gradoId = g.id;
                        esPreescolar = g.nivelAcademico === NIVEL.PREESCOLAR;
                    }

                    let asignaturaId = null;
                    if (codAsig) {
                        const aId = mapAsignaturas.get(codAsig);
                        if (!aId) throw new Error(`Asignatura '${codAsig}' no existe.`);
                        asignaturaId = aId;
                    }

                    const dimensionId = mapDimensiones.get(codDim);
                    if (!dimensionId) throw new Error(`Dimensión '${codDim}' inválida.`);

                    const desempenoId = mapDesempenos.get(codDesp);
                    if (!desempenoId) throw new Error(`Indicador de Desempeño '${codDesp}' no existe.`);

                    const periodo = (txtPeriodo === '0' || txtPeriodo === '') ? 0 : Number(txtPeriodo);
                    if (isNaN(periodo)) throw new Error(`Periodo '${txtPeriodo}' inválido.`);

                    const texto = fila['TEXTO_JUICIO'];
                    if (!texto) throw new Error("Falta la descripción del juicio.");
                    const activo = fila['ESTADO']?.toUpperCase() === 'ACTIVO';

                    // Construir Payload Preliminar
                    const datosRaw = {
                        gradoId,
                        asignaturaId,
                        dimensionId,
                        desempenoId,
                        periodo,
                        texto,
                        activo,
                        vigenciaId
                    };

                    // OPTIMIZACIÓN REAL: Replicamos la limpieza lógica aquí en memoria para no llamar a la BD
                    const payloadFinal = this._limpiarDatosEnMemoria(datosRaw, esPreescolar);

                    // --- VALIDACIÓN DE DUPLICADOS EN MEMORIA (INSTANTÁNEA) ---
                    const firmaActual = this._generarFirma(payloadFinal);

                    // Chequeo contra la BD (usando el Set en memoria)
                    if (firmasExistentesDB.has(firmaActual)) {
                        throw new Error("Ya existe un juicio idéntico (misma Competencia y Desempeño) registrado previamente en la base de datos.");
                    }

                    // Chequeo contra el propio CSV (Duplicados en el archivo)
                    if (firmasEnExcel.has(firmaActual)) {
                        throw new Error("Estás intentando cargar este mismo juicio más de una vez dentro del archivo. Elimina las filas repetidas.");
                    }

                    // Si pasa, guardamos la firma y agregamos al lote
                    firmasEnExcel.add(firmaActual);
                    registrosParaCrear.push({ ...payloadFinal, vigenciaId });

                } catch (error) {
                    errores.push(`Fila ${linea}: ${error.message}`);
                }
            }

            // Decisión Final: Todo o Nada
            if (errores.length > 0) {
                // Si hay errores, no guardamos nada y reportamos
                await transaction.rollback();
                return { exito: false, errores };
            }

            // Guardar Masivamente
            await Juicio.bulkCreate(registrosParaCrear, { transaction });
            await transaction.commit();

            return { exito: true, total: registrosParaCrear.length };

        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    },

    /**
     * HELPER: Genera un string único que identifica al juicio para detectar duplicados.
     * Sigue la misma lógica que _verificarDuplicados pero en string.
     */
    _generarFirma(data) {
        const dimId = Number(data.dimensionId);
        const despId = Number(data.desempenoId);

        // Globales Puros (Acumulativa / Comportamiento)
        // La unicidad depende SOLO de la Dimensión y el Desempeño
        if (dimId === DIMENSION.ACUMULATIVA || dimId === DIMENSION.COMPORTAMIENTO) {
            return `DIM-${dimId}-DESP-${despId}`;
        }

        // Específicos (Académica / Social / Laboral)
        // La unicidad depende de TODAS las coordenadas
        // Usamos "N" para nulls para asegurar que el string sea único
        const grado = data.gradoId || 'N';
        const asig = data.asignaturaId || 'N';
        const per = (data.periodo !== undefined && data.periodo !== null) ? data.periodo : 'N';

        return `DIM-${dimId}-DESP-${despId}-GR-${grado}-ASIG-${asig}-PER-${per}`;
    },

    /**
     * HELPER: Limpieza de datos en memoria (Replica _aplicarReglasNegocio sin ir a BD)
     */
    _limpiarDatosEnMemoria(data, esPreescolar) {
        const payload = { ...data };
        const idDimension = Number(data.dimensionId);

        // COMPORTAMIENTO (999)
        if (idDimension === DIMENSION.COMPORTAMIENTO) {
            payload.gradoId = null; payload.periodo = 0;
            // Respeta asignatura
        }
        // ACUMULATIVA (4)
        else if (idDimension === DIMENSION.ACUMULATIVA) {
            payload.gradoId = null; payload.asignaturaId = null; payload.periodo = 0;
        }
        // LABORAL O SOCIAL (2, 3)
        else if (idDimension === DIMENSION.SOCIAL || idDimension === DIMENSION.LABORAL) {
            if (!payload.gradoId) { // Global
                payload.asignaturaId = null; payload.periodo = 0;
            } else { // Específico (Preescolar)
                if (!esPreescolar) { // Si pusieron grado y no es preescolar -> limpiar
                    payload.gradoId = null; payload.asignaturaId = null; payload.periodo = 0;
                }
            }
        }
        // ACADEMICA (1) -> No limpia nada, todo es requerido

        return payload;
    }
};