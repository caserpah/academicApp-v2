import React, { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSave, faTimes, faExclamationCircle } from "@fortawesome/free-solid-svg-icons";
import { fetchGruposFiltrados } from "../../api/cargasService.js";
import { fetchCargasCatalogs } from "../../api/cargasService.js";
import { showWarning } from "../../utils/notifications.js";

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
                    const gruposOriginales = await fetchGruposFiltrados(
                        selectedCarga.sedeId,
                        selectedCarga.grupo?.gradoId // Necesitamos el grado del grupo original
                    );

                    setCatalogos({
                        ...cats,
                        grupos: gruposOriginales
                    });

                    setFormData({
                        id: selectedCarga.id,
                        sedeId: selectedCarga.sedeId,
                        gradoId: selectedCarga.grupo?.gradoId || "", // Grado derivado del grupo
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

            if (esComp) {
                setFormData(prev => ({ ...prev, horas: 0 }));
            }
        }
    }, [formData.asignaturaId, catalogos.asignaturas]);


    // --- HANDLERS ---

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));

        // Si cambia la sede o grado, reseteamos el grupo seleccionado porque ya no es válido
        if (name === "sedeId" || name === "gradoId") {
            setFormData(prev => ({ ...prev, grupoId: "" }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validaciones Manuales Básicas
        if (!formData.sedeId || !formData.grupoId || !formData.docenteId || !formData.asignaturaId) {
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
            } else {
                await crearCargaAPI(payload);
            }
            onSuccess(); // Notificar al padre para cerrar y recargar
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-6 animate-fade-in-up">
            <div className="flex justify-between items-center mb-6 border-b pb-2">
                <h2 className="text-xl font-semibold text-gray-800">
                    {selectedCarga ? "Editar Carga Académica" : "Nueva Asignación de Carga"}
                </h2>
                <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
                    <FontAwesomeIcon icon={faTimes} size="lg" />
                </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">

                {/* FILA 1: UBICACIÓN (Sede - Grado - Grupo) */}
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                    <h3 className="text-xs font-bold text-blue-800 uppercase mb-3 flex items-center">
                        <FontAwesomeIcon icon={faExclamationCircle} className="mr-2" />
                        1. Selección de Grupo
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

                        {/* Sede */}
                        <div>
                            <label className={labelClasses}>Sede <span className="text-red-500">*</span></label>
                            <select
                                name="sedeId" value={formData.sedeId} onChange={handleChange}
                                className={inputClasses} required
                            >
                                <option value="">Seleccione Sede...</option>
                                {catalogos.sedes.map(s => (
                                    <option key={s.id} value={s.id}>{s.nombre}</option>
                                ))}
                            </select>
                        </div>

                        {/* Grado (Filtro auxiliar) */}
                        <div>
                            <label className={labelClasses}>Grado (Filtro)</label>
                            <select
                                name="gradoId" value={formData.gradoId} onChange={handleChange}
                                className={inputClasses}
                            >
                                <option value="">Ver todos los grados</option>
                                {catalogos.grados.map(g => (
                                    <option key={g.id} value={g.id}>{g.nombre}</option>
                                ))}
                            </select>
                        </div>

                        {/* Grupo (Dependiente) */}
                        <div>
                            <label className={labelClasses}>Grupo <span className="text-red-500">*</span></label>
                            <select
                                name="grupoId" value={formData.grupoId} onChange={handleChange}
                                className={inputClasses} required
                                disabled={!formData.sedeId} // Bloqueado si no hay sede
                            >
                                <option value="">
                                    {!formData.sedeId ? "Primero elija Sede" :
                                        catalogos.grupos.length === 0 ? "No hay grupos disponibles" : "Seleccione Grupo..."}
                                </option>
                                {catalogos.grupos.map(g => (
                                    <option key={g.id} value={g.id}>{g.nombre} ({g.jornada})</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* FILA 2: DATOS ACADÉMICOS */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                    {/* Asignatura */}
                    <div>
                        <label className={labelClasses}>Asignatura <span className="text-red-500">*</span></label>
                        <select
                            name="asignaturaId" value={formData.asignaturaId} onChange={handleChange}
                            className={inputClasses} required
                        >
                            <option value="">Seleccione Asignatura...</option>
                            {catalogos.asignaturas.map(a => (
                                <option key={a.id} value={a.id}>{a.nombre} - {a.codigo}</option>
                            ))}
                        </select>
                        {esComportamiento && (
                            <p className="text-xs text-orange-600 mt-1 font-semibold">
                                * Asignatura de comportamiento: Horas fijas en 0.
                            </p>
                        )}
                    </div>

                    {/* Horas */}
                    <div>
                        <label className={labelClasses}>Intensidad Horaria Semanal</label>
                        <input
                            type="number"
                            name="horas"
                            value={formData.horas}
                            onChange={handleChange}
                            className={inputClasses}
                            min="0"
                            required
                            disabled={esComportamiento} // BLOQUEO VISUAL
                            placeholder="Ej: 4"
                        />
                    </div>
                </div>

                {/* FILA 3: DOCENTE */}
                <div>
                    <label className={labelClasses}>Docente Responsable <span className="text-red-500">*</span></label>
                    <select
                        name="docenteId" value={formData.docenteId} onChange={handleChange}
                        className={inputClasses} required
                    >
                        <option value="">Seleccione Docente...</option>
                        {catalogos.docentes.map(d => (
                            <option key={d.id} value={d.id}>
                                {d.apellidos} {d.nombre} ({d.documento})
                            </option>
                        ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">Solo se muestran docentes activos.</p>
                </div>

                {/* BOTONES */}
                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-100">
                    <button
                        type="button" onClick={onCancel} disabled={loading}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit" disabled={loading}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center shadow-md"
                    >
                        <FontAwesomeIcon icon={faSave} className="mr-2" />
                        {selectedCarga ? "Actualizar Carga" : "Guardar Asignación"}
                    </button>
                </div>

            </form>
        </div>
    );
};

export default CargasForm;