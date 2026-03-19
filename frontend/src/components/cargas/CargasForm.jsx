import React, { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSave, faTimes, faEdit, faExclamationCircle } from "@fortawesome/free-solid-svg-icons";
import { fetchCargasCatalogs, fetchGruposFiltrados } from "../../api/cargasService.js";
import { showWarning, showError } from "../../utils/notifications.js";
import { formatearJornada } from "../../utils/formatters.js";

const CargasForm = ({
    selectedCarga,     // Objeto carga si estamos editando (null si es crear)
    onSuccess,         // Callback para recargar la tabla al terminar
    onCancel,          // Callback para volver a la lista
    crearCargaAPI,     // Función del servicio (inyeccion de dependencia o import directo)
    actualizarCargaAPI // Función del servicio
}) => {
    // --- ESTADOS ---
    const [formData, setFormData] = useState({
        id: null,
        sedeId: "",
        gradoId: "",     // Auxiliar para filtrar grupos
        grupoId: "",
        docenteId: "",
        asignaturaId: "",
        horas: ""
    });

    // Listas para los selects
    const [catalogos, setCatalogos] = useState({
        sedes: [],
        grados: [],
        asignaturas: [],
        docentes: [],
        grupos: [] // Esta lista cambia dinámicamente
    });

    const [loading, setLoading] = useState(false);
    const [esComportamiento, setEsComportamiento] = useState(false);

    // Clases CSS reutilizables
    const inputClasses = "w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition disabled:bg-gray-100 disabled:text-gray-500";
    const labelClasses = "block text-sm font-medium text-gray-700 mb-1";

    // --- CARGA INICIAL (Datos de Listas + Datos de Edición) ---
    useEffect(() => {
        const init = async () => {
            setLoading(true);
            try {
                // Cargar catálogos base
                const cats = await fetchCargasCatalogs();

                // Si estamos EDITANDO, pre-llenar form
                if (selectedCarga) {
                    // Buscar los grupos de la sede/grado originales para poder mostrarlos
                    const gradoInicialId = selectedCarga.grupo?.grado?.id || "";

                    const gruposOriginales = await fetchGruposFiltrados(
                        selectedCarga.sedeId,
                        gradoInicialId
                    );

                    setCatalogos({ ...cats, grupos: gruposOriginales });

                    setFormData({
                        id: selectedCarga.id,
                        sedeId: selectedCarga.sedeId,
                        gradoId: gradoInicialId,
                        grupoId: selectedCarga.grupoId,
                        docenteId: selectedCarga.docenteId,
                        asignaturaId: selectedCarga.asignaturaId,
                        horas: selectedCarga.horas
                    });

                    // Verificar si la asignatura original era Comportamiento
                    const nombreAsig = selectedCarga.asignatura?.nombre?.toUpperCase() || "";
                    setEsComportamiento(nombreAsig.includes("COMPORTAMIENTO"));

                } else {
                    // MODO CREAR
                    setCatalogos({ ...cats, grupos: [] });
                }
            } catch (error) {
                console.error(error);
                showError("Ocurrió un error al cargar los datos del formulario.");
            } finally {
                setLoading(false);
            }
        };
        init();
    }, [selectedCarga]);


    // --- EFECTO: CARGA DINÁMICA DE GRUPOS ---
    // Se dispara cuando el usuario cambia Sede o Grado
    useEffect(() => {
        const cargarGrupos = async () => {
            // Solo buscamos si hay sede seleccionada (Grado es opcional pero recomendado)
            if (!formData.sedeId) {
                setCatalogos(prev => ({ ...prev, grupos: [] }));
                return;
            }

            // Evitamos recargar si estamos en modo edición y son los mismos datos iniciales
            const grupos = await fetchGruposFiltrados(formData.sedeId, formData.gradoId);
            setCatalogos(prev => ({ ...prev, grupos }));
        };

        cargarGrupos();
    }, [formData.sedeId, formData.gradoId]);


    // --- EFECTO: REGLA DE COMPORTAMIENTO ---
    // Se dispara al cambiar la asignatura
    useEffect(() => {
        if (!formData.asignaturaId) return;

        const asignatura = catalogos.asignaturas.find(a => a.id === Number(formData.asignaturaId));
        if (asignatura) {
            const esComp = asignatura.nombre.toUpperCase().includes("COMPORTAMIENTO");
            setEsComportamiento(esComp);
            if (esComp) setFormData(prev => ({ ...prev, horas: 0 }));
        }
    }, [formData.asignaturaId, catalogos.asignaturas]);


    // --- HANDLERS ---

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));

        // Si cambia la sede o grado, reseteamos el grupo seleccionado porque ya no es válido
        if (name === "sedeId" || name === "gradoId") {
            setFormData(prev => ({ ...prev, grupoId: "" }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validaciones Manuales Básicas
        if (!formData.sedeId || !formData.gradoId || !formData.grupoId || !formData.docenteId || !formData.asignaturaId) {
            return showWarning("Todos los campos obligatorios (<span class='text-[#e74c3c]'>*</span>) deben completarse.");
        }
        if (!esComportamiento && (!formData.horas || formData.horas <= 0)) {
            return showWarning("Debe asignar una intensidad horaria válida.");
        }

        try {
            setLoading(true);
            const payload = {
                sedeId: Number(formData.sedeId),
                grupoId: Number(formData.grupoId),
                docenteId: Number(formData.docenteId),
                asignaturaId: Number(formData.asignaturaId),
                horas: Number(formData.horas)
            };

            if (selectedCarga) {
                await actualizarCargaAPI(selectedCarga.id, payload);
                onSuccess(true); // Notificar al padre para cerrar y recargar
            } else {
                await crearCargaAPI(payload);

                // Limpiamos solo los campos solicitados
                setFormData(prev => ({
                    ...prev,
                    asignaturaId: "",
                    horas: ""
                }));
                setEsComportamiento(false); // Reseteamos esta bandera por si la asignatura anterior era comportamiento

                onSuccess(false); // Notificamos éxito pero indicamos NO cerrar el modal
            }
        } catch (error) {
            showError(error.message || "Ocurrió un error al guardar la carga.");
        } finally {
            setLoading(false);
        }
    };

    // --- RENDERIZADO TIPO MODAL ---
    return (
        // Overlay del modal (Fondo)
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">

            {/* Contenedor del Modal */}
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto flex flex-col">

                {/* Encabezado */}
                <div className="flex justify-between items-center p-5 border-b border-gray-300 bg-gray-50 rounded-t-lg">
                    <h2 className="text-xl font-bold flex items-center text-slate-800">
                        <FontAwesomeIcon icon={selectedCarga ? faEdit : faSave} className="mr-2 text-blue-600" />
                        {selectedCarga ? "Editar Carga Académica" : "Nueva Asignación de Carga"}
                    </h2>
                    <button onClick={onCancel} className="text-gray-400 hover:text-red-500 transition">
                        <FontAwesomeIcon icon={faTimes} size="lg" />
                    </button>
                </div>

                {/* BODY (Formulario scrollable) */}
                <div className="p-6 overflow-y-auto">
                    <form id="cargas-form" onSubmit={handleSubmit} className="space-y-6">

                        {/* SECCIÓN 1: UBICACIÓN */}
                        <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                            <h3 className="text-xs font-bold text-blue-800 uppercase mb-3 flex items-center">
                                <FontAwesomeIcon icon={faExclamationCircle} className="mr-2" />
                                1. Selección de Grupo
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className={labelClasses}>Sede <span className="text-red-500">*</span></label>
                                    <select name="sedeId" value={formData.sedeId} onChange={handleChange} className={inputClasses} required >
                                        <option value="">-- Seleccione --</option>
                                        {catalogos.sedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                                    </select>
                                </div>
                                {/* SELECT DE GRADO (FILTRO) */}
                                <div>
                                    <label className={labelClasses}>Grado (Filtro) <span className="text-red-500">*</span></label>
                                    <select
                                        name="gradoId"
                                        value={formData.gradoId}
                                        onChange={handleChange}
                                        className={inputClasses}
                                        required
                                    >
                                        <option value="">-- Seleccione --</option>
                                        {catalogos.grados.map(g => (
                                            <option key={g.id} value={g.id}>{g.nombre}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className={labelClasses}>Grupo <span className="text-red-500">*</span></label>
                                    <select name="grupoId" value={formData.grupoId} onChange={handleChange} className={inputClasses} disabled={!formData.sedeId} required>
                                        <option value="">{!formData.sedeId ? "Primero elija Sede" : catalogos.grupos.length === 0 ? "Sin grupos" : "-- Seleccione --"}</option>
                                        {catalogos.grupos.map(g => <option key={g.id} value={g.id}>{g.nombre} ({formatearJornada(g.jornada)})</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* SECCIÓN 2: DATOS ACADÉMICOS */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className={labelClasses}>Asignatura <span className="text-red-500">*</span></label>
                                <select name="asignaturaId" value={formData.asignaturaId} onChange={handleChange} className={inputClasses} required>
                                    <option value="">-- Seleccione --</option>
                                    {catalogos.asignaturas.map(a => <option key={a.id} value={a.id}>{a.nombre} - {a.codigo}</option>)}
                                </select>
                                {esComportamiento && <p className="text-xs text-orange-600 mt-1 font-semibold">* Horas fijas en 0.</p>}
                            </div>
                            <div>
                                <label className={labelClasses}>Horas Semanales <span className="text-red-500">*</span></label>
                                <input type="number" name="horas" value={formData.horas} onChange={handleChange} className={inputClasses} required min="0" disabled={esComportamiento} placeholder="Ej: 4" />
                            </div>
                        </div>

                        {/* SECCIÓN 3: DOCENTE */}
                        <div>
                            <label className={labelClasses}>Docente Responsable <span className="text-red-500">*</span></label>
                            <select name="docenteId" value={formData.docenteId} onChange={handleChange} className={inputClasses} required>
                                <option value="">-- Seleccione --</option>
                                {catalogos.docentes.map(d => (
                                    <option key={d.id} value={d.id}>
                                        {d.identidad?.apellidos || d.apellidos} {d.identidad?.nombre || d.nombre} ({d.identidad?.documento || d.documento})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </form>
                </div>

                {/* Footer */}
                <div className="p-5 border-t border-gray-300 rounded-b-lg flex justify-end gap-3">
                    <button
                        type="submit"
                        form="cargas-form"
                        disabled={loading}
                        className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-md flex items-center gap-2 transition-transform active:scale-95 disabled:opacity-50"
                    >
                        <FontAwesomeIcon icon={faSave} className="mr-2" />
                        {selectedCarga ? "Guardar Cambios" : "Guardar"}
                    </button>
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={loading}
                        className="bg-red-500 text-white px-5 py-2 rounded-lg hover:bg-red-600 transition flex items-center shadow-md"
                    >
                        <FontAwesomeIcon icon={faTimes} className="mr-2" />
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CargasForm;