import React, { useState, useEffect, useMemo } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSave, faTimes, faGlobe, faInfoCircle } from "@fortawesome/free-solid-svg-icons";

/**
 * Formulario reutilizable para la creación y edición de Juicios.
 * Soporta Juicios Específicos y Globales (Transversales).
 */
const JuiciosForm = ({
    formData,
    mode,
    loading,
    handleChange,
    handleSubmit,
    resetForm,
    asignaturas = [],
    vigencia,
    grados = [],
    dimensiones = [],
    desempenos = [],
    rangos = []
}) => {
    const inputBaseClasses = "mt-1 block w-full border border-gray-300 rounded-lg shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition duration-150 disabled:bg-gray-100 disabled:text-gray-400";
    const readOnlyClasses = "bg-gray-100 cursor-not-allowed text-gray-700 font-bold text-center";

    // Estado para el Checkbox Global
    const [esTransversal, setEsTransversal] = useState(false);
    // Estado para detectar si es Comportamiento
    const [esComportamiento, setEsComportamiento] = useState(false);

    /**
     * Efecto para inicializar el estado del Checkbox Global al cargar el formulario en modo 'editar'
     */
    useEffect(() => {
        if (mode === 'editar') {
            const esGlobal = !formData.gradoId && !formData.asignaturaId;
            setEsTransversal(esGlobal);

            // Chequeo si es comportamiento basado en ID
            const asig = asignaturas.find(a => String(a.id) === String(formData.asignaturaId));
            const esComp = asig && asig.nombre.trim().toUpperCase() === "COMPORTAMIENTO";
            setEsComportamiento(!!esComp);
        }
    }, [mode, formData.id, asignaturas]);

    /**
     * Efecto para forzar Período = 0 si es Transversal o Comportamiento
     */
    useEffect(() => {
        // Si es Transversal (Acumulativa/Social/Laboral) o es Comportamiento
        if (esTransversal || esComportamiento) {
            // Forzamos Periodo = 0 (Todos)
            // Solo si no está ya en 0 para evitar loops infinitos
            if (String(formData.periodo) !== "0") {
                handleLocalChange({ target: { name: 'periodo', value: "0" } });
            }
        }
    }, [esTransversal, esComportamiento, formData.periodo]);

    const handleTransversalChange = (e) => {
        const checked = e.target.checked;
        setEsTransversal(checked);
        if (checked) {
            handleLocalChange({
                target: {
                    name: 'reset_global',
                    values: { gradoId: null, asignaturaId: null, dimensionId: "" }
                }
            });
        }
    };

    const handleLocalChange = (e) => {
        // Si es un evento de reseteo masivo (definido por nosotros)
        if (e.target.name === 'reset_global' || e.target.name === 'reset_asignatura') {
            Object.keys(e.target.values).forEach(key => {
                // Llamamos al handleChange del padre campo por campo
                handleChange({ target: { name: key, value: e.target.values[key] } });
            });
        } else {
            // Si es un cambio normal, lo pasamos directo
            handleChange(e);
        }
    };

    /**
     * Detectar cambio de asignatura para ver si es Comportamiento
     */
    const handleAsignaturaChange = (e) => {
        const id = e.target.value;
        const asig = asignaturas.find(a => String(a.id) === String(id));
        const esComp = asig && asig.nombre.trim().toUpperCase() === "COMPORTAMIENTO";

        setEsComportamiento(!!esComp);

        // Si es comportamiento, reseteamos dimensión a 999 si existe, o vacía
        let newDim = formData.dimensionId;
        if (esComp) newDim = "999";

        handleLocalChange({
            target: {
                name: 'reset_asignatura',
                values: { asignaturaId: id, dimensionId: newDim }
            }
        });
    };

    /**
     * Lógica de negocios y filtro
     */

    // Filtrar Dimensiones según la Asignatura seleccionada
    const filteredDimensiones = useMemo(() => {
        const NOMBRES_TRANSVERSALES = ["SOCIAL", "LABORAL", "ACUMULATIVA"];
        const NOMBRES_PREESCOLAR_EXCLUIDOS = ["SOCIAL", "LABORAL", "ACUMULATIVA"]; // Lo que NO ve preescolar en el select
        const NOMBRE_LABORAL_SOCIAL = "LABORAL Y SOCIAL"; // Nueva competencia fusionada para preescolar
        const NOMBRE_COMPORTAMIENTO = "COMPORTAMIENTO";
        const GRADOS_PREESCOLAR = ["PRE_JARDIN", "PRE JARDIN", "JARDIN", "TRANSICION", "TRANSICIÓN"];

        // JUCIO GLOBAL (Check activado) -> Solo transversales
        if (esTransversal) {
            return dimensiones.filter(d =>
                NOMBRES_TRANSVERSALES.includes(d.nombre.trim().toUpperCase())
            );
        }

        // COMPORTAMIENTO (Prioridad alta)
        if (formData.asignaturaId) {
            const selectedAsig = asignaturas.find(a => String(a.id) === String(formData.asignaturaId));
            const nombreAsig = selectedAsig ? selectedAsig.nombre.trim().toUpperCase() : "";
            if (nombreAsig === NOMBRE_COMPORTAMIENTO) {
                return dimensiones.filter(d => Number(d.id) === 999);
            }
        }

        // DETECTAR SI ES PREESCOLAR
        let esGradoPreescolar = false;
        if (formData.gradoId) {
            const gradoObj = grados.find(g => String(g.id) === String(formData.gradoId));
            if (gradoObj) {
                const nombreGrado = gradoObj.nombre.trim().toUpperCase();
                esGradoPreescolar = GRADOS_PREESCOLAR.includes(nombreGrado);
            }
        }

        return dimensiones.filter(d => {
            const nombreDim = d.nombre.trim().toUpperCase();
            const esId999 = Number(d.id) === 999;
            if (esId999) return false; // Excluir dimensión Comportamiento en este filtro

            if (esGradoPreescolar) {
                // No cargar Acumulativa (usarán la Global Transversal heredada), tampoco Social ni Laboral (usarán la fusionada Laboral y Social)
                if (NOMBRES_PREESCOLAR_EXCLUIDOS.includes(nombreDim)) return false;
                return true; // Mostrar todas las demás dimensiones para preescolar
            }

            if (nombreDim === NOMBRE_LABORAL_SOCIAL) return false;

            // Ocultar las transversales si el check global NO está activo
            if (NOMBRES_TRANSVERSALES.includes(nombreDim)) return false;

            return true;
        });

    }, [esTransversal, formData.asignaturaId, formData.gradoId, dimensiones, asignaturas, grados]);

    // Encontrar el desempeño seleccionado para saber su código (ej: UN)
    const selectedDesempeno = desempenos.find(d => d.id == formData.desempenoId);
    const esUnico = selectedDesempeno?.codigo === 'UN';

    // Buscar automáticamente el rango de notas
    const rangoActual = useMemo(() => {
        if (!formData.desempenoId || !vigencia) return null;
        return rangos.find(r =>
            Number(r.desempenoId) === Number(formData.desempenoId) &&
            Number(r.vigenciaId) === Number(vigencia.id)
        );
    }, [formData.desempenoId, vigencia, rangos]);

    // Manejar toggle de activo
    const handleToggleActivo = () => {
        handleChange({ target: { name: 'activo', value: !formData.activo } });
    };

    // ==========================
    // Renderizado del formulario
    // ==========================
    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">

                {/* --- CABECERA CON SWITCH DE ESTADO --- */}
                <div className="flex flex-col md:flex-row justify-between items-center border-b border-gray-200 pb-4 mb-6 gap-4">

                    {/* Lado Izquierdo: Título */}
                    <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-gray-700">
                            {mode === "agregar" ? "Registrar Nuevo Juicio" : "Editar Juicio"}
                        </h3>
                        {vigencia && (
                            <span className="text-xs bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-bold border border-blue-200">
                                Año Lectivo {vigencia.anio}
                            </span>
                        )}
                    </div>

                    {/* Lado Derecho: Switch de Estado (Estilo Referencia) */}
                    <div className="flex items-center">
                        <label className="mr-2 text-sm font-medium text-gray-600">Estado:</label>

                        {/* Botón tipo Toggle */}
                        <button
                            type="button"
                            onClick={handleToggleActivo}
                            disabled={loading}
                            className={`${formData.activo ? 'bg-green-500' : 'bg-gray-300'}
                            relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none`}
                        >
                            <span className="sr-only">Activar juicio</span>
                            <span className={`${formData.activo ? 'translate-x-6' : 'translate-x-1'}
                                inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                            />
                        </button>

                        <span className="ml-2 text-xs font-semibold">{formData.activo ? 'ACTIVO' : 'INACTIVO'}</span>
                    </div>
                </div>

                {/* CHECKBOX GLOBAL */}
                <div className={`mb-6 p-4 rounded-lg border flex items-center ${esComportamiento ? 'bg-gray-100 border-gray-200 opacity-50' : 'bg-blue-50/50 border-blue-100'}`}>
                    <input
                        id="check_transversal"
                        type="checkbox"
                        checked={esTransversal}
                        onChange={handleTransversalChange}
                        disabled={loading || esComportamiento}
                        className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                    />
                    <label htmlFor="check_transversal" className="ml-3 block text-sm font-bold text-gray-700 cursor-pointer select-none">
                        Es un Juicio Global / Transversal (Social, Laboral, Acumulativa)
                    </label>
                    <FontAwesomeIcon icon={faGlobe} className="ml-auto text-blue-300 text-xl" />
                </div>

                {/* --- CUERPO DEL FORMULARIO --- */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">

                    {/* ID (solo lectura) */}
                    {mode === 'editar' && (
                        <div className="col-span-1">
                            <label className="block text-sm font-medium text-[#4a5568] mb-1">ID</label>
                            <input
                                type="text"
                                value={formData.id || ""}
                                disabled
                                className={`${inputBaseClasses} bg-gray-100 text-gray-500`}
                            />
                        </div>
                    )}

                    {/* Período */}
                    <div className="col-span-1">
                        <label className="block text-sm font-medium text-[#4a5568] mb-1">
                            Período <span className="text-[#e74c3c] font-semibold">*</span>
                        </label>
                        <select
                            name="periodo"
                            value={formData.periodo || ""}
                            onChange={handleLocalChange}
                            className={inputBaseClasses}
                            required
                            disabled={esTransversal || esComportamiento} // Deshabilitado si es un Juicio Transversal (Acumulativa, Social, Laboral) o Comportamiento
                        >
                            <option value="">-- Seleccione --</option>
                            {(esTransversal || esComportamiento) && (
                                <option value="0" className="font-bold text-green-700 bg-green-50">Todos los periodos</option>
                            )}
                            {[1, 2, 3, 4].map(p => <option key={p} value={p}>Periodo {p}</option>)}
                            <option value="5" className="font-bold text-blue-700 bg-blue-50">Informe Final</option>
                        </select>
                        {(esTransversal || esComportamiento) && (
                            <p className="text-[10px] text-green-600 mt-1 flex items-center">
                                <FontAwesomeIcon icon={faInfoCircle} className="mr-1" />
                                Aplica para cualquier periodo del año.
                            </p>
                        )}
                    </div>

                    {/* Grado (Select Dinámico) */}
                    <div className="col-span-1">
                        <label className="block text-sm font-medium text-[#4a5568] mb-1">
                            Grado {esTransversal || esComportamiento ? <span className="text-gray-400">(No aplica)</span> : <span className="text-[#e74c3c] font-semibold">*</span>}
                        </label>
                        <select
                            name="gradoId"
                            value={formData.gradoId || ""}
                            onChange={handleLocalChange}
                            className={inputBaseClasses}
                            disabled={esTransversal || esComportamiento}
                            required={!esTransversal && !esComportamiento}
                        >
                            <option value="">-- {esComportamiento ? "GLOBAL (TODOS)" : "Seleccione Grado"} --</option>
                            {grados.map(g => (
                                <option key={g.id} value={g.id}>
                                    {g.nombre ? g.nombre.replace(/_/g, " ") : "Sin Nombre"}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Asignatura */}
                    <div className="col-span-1 md:col-span-2">
                        <label className="block text-sm font-medium text-[#4a5568] mb-1">
                            Asignatura {esTransversal ? <span className="text-gray-400">(No aplica)</span> : <span className="text-[#e74c3c] font-semibold">*</span>}
                        </label>
                        <select
                            name="asignaturaId"
                            value={formData.asignaturaId || ""}
                            onChange={handleAsignaturaChange}
                            className={inputBaseClasses}
                            disabled={esTransversal}
                            required={!esTransversal}
                        >
                            <option value="">-- Seleccione Asignatura --</option>
                            {asignaturas.map((asignatura) => (
                                <option key={asignatura.id} value={asignatura.id}>
                                    {asignatura.nombre} - {asignatura.codigo}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Competencia (Select Dinámico) */}
                    <div className="col-span-1">
                        <label className="block text-sm font-medium text-[#4a5568] mb-1">
                            Competencia <span className="text-[#e74c3c] font-semibold">*</span>
                        </label>
                        <select
                            name="dimensionId"
                            value={formData.dimensionId || ""}
                            onChange={handleLocalChange}
                            className={inputBaseClasses}
                            required
                        >
                            <option value="">-- Seleccione --</option>
                            {filteredDimensiones.map(d => (
                                <option key={d.id} value={d.id}>
                                    {d.nombre ? d.nombre.replace(/_/g, " ") : d.nombre}
                                </option>
                            ))}
                        </select>
                        {/* {esTransversal && <p className="text-[11px] text-blue-600 mt-1">* Solo competencias transversales.</p>}
                        {!esTransversal && formData.gradoId && filteredDimensiones.length > 5 && (
                            <p className="text-[10px] text-gray-400 mt-1">Mostrando dimensiones disponibles para el grado.</p>
                        )} */}
                    </div>

                    {/* Desempeño (Select Dinámico) */}
                    <div className="col-span-1">
                        <label className="block text-sm font-medium text-[#4a5568] mb-1">
                            Indicador de desempeño <span className="text-[#e74c3c] font-semibold">*</span>
                        </label>
                        <select
                            name="desempenoId"
                            value={formData.desempenoId || ""}
                            onChange={handleLocalChange}
                            className={inputBaseClasses}
                            required
                        >
                            <option value="">-- Seleccione --</option>
                            {desempenos.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                        </select>
                    </div>

                    {/* Notas Automáticas (Solo lectura) - Se ocultan si es ÚNICO */}
                    {!esUnico && (
                        <>
                            <div className="col-span-1">
                                <label className="block text-sm font-medium text-[#4a5568] mb-1">Nota Mínima</label>
                                <input
                                    type="text"
                                    value={rangoActual ? rangoActual.minNota : "-"}
                                    disabled
                                    className={`${inputBaseClasses} ${readOnlyClasses}`}
                                />
                            </div>

                            <div className="col-span-1">
                                <label className="block text-sm font-medium text-[#4a5568] mb-1">Nota Máxima</label>
                                <input
                                    type="text"
                                    value={rangoActual ? rangoActual.maxNota : "-"}
                                    disabled
                                    className={`${inputBaseClasses} ${readOnlyClasses}`}
                                />
                            </div>
                        </>
                    )}
                </div>

                {/* Texto del Juicio */}
                <div className="mt-6">
                    <div className="flex justify-between items-center mb-1">
                        <label className="block text-sm font-medium text-[#4a5568]">
                            Texto del Juicio <span className="text-[#e74c3c] font-semibold">*</span>
                        </label>
                        <span className={`text-[12px] ${formData.texto?.length > 255 ? 'text-red-500' : 'text-gray-400'}`}>
                            {formData.texto?.length || 0} caracteres
                        </span>
                    </div>
                    <textarea
                        name="texto"
                        value={formData.texto || ""}
                        onChange={handleLocalChange}
                        rows="4"
                        placeholder="Ingrese el texto descriptivo del juicio..."
                        className="mt-1 block w-full border border-gray-300 rounded-lg shadow-sm p-3 focus:ring-blue-500 focus:border-blue-500 transition duration-150 resize-none"
                        required
                    />
                    <span className="text-[12px] text-gray-400">Mínimo 10 caracteres.</span>
                </div>

                {/* Botones del formulario */}
                <div className="pt-4 flex justify-center space-x-3 border-t border-[#eee] mt-6">
                    <button
                        type="submit"
                        className="bg-blue-600 text-white px-5 py-2 rounded-lg shadow-md hover:bg-blue-700 transition duration-150 flex items-center"
                        disabled={loading}
                    >
                        <FontAwesomeIcon icon={faSave} className="w-4 h-4 mr-2" />
                        {mode === "agregar" ? "Guardar" : "Guardar Cambios"}
                    </button>

                    <button
                        type="button"
                        onClick={resetForm}
                        className="bg-red-500 text-white px-5 py-2 rounded-lg shadow-md hover:bg-red-600 transition duration-150 flex items-center hover:scale-[1.01]"
                        disabled={loading}
                    >
                        <FontAwesomeIcon icon={faTimes} className="mr-2" />
                        Cancelar
                    </button>
                </div>
            </div>
        </form >
    );
};

export default JuiciosForm;