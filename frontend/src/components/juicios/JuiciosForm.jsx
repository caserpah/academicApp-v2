import React, { useMemo } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSave, faTimes, faInfoCircle } from "@fortawesome/free-solid-svg-icons";

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
    const inputBaseClasses = "mt-1 block w-full border border-gray-300 rounded-lg shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition duration-150";
    const readOnlyClasses = "bg-gray-100 cursor-not-allowed text-gray-700 font-bold text-center";

    /**
     * Lógica de negocios y filtro
     */

    // Filtrar Dimensiones según la Asignatura seleccionada
    const filteredDimensiones = useMemo(() => {
        // Caso A: Si NO hay asignatura seleccionada (Juicio Global), mostramos todas
        // (El usuario elegirá Social, Laboral, Acumulativa, etc.)
        if (!formData.asignaturaId) {
            return dimensiones;
        }

        // Buscamos la asignatura seleccionada
        const selectedAsig = asignaturas.find(a => String(a.id) === String(formData.asignaturaId));
        const nombreAsig = selectedAsig ? selectedAsig.nombre.trim().toUpperCase() : "";

        // Caso B: Si es COMPORTAMIENTO -> Solo permitir ID 999
        if (nombreAsig === "COMPORTAMIENTO") {
            return dimensiones.filter(d => Number(d.id) === 999);
        }

        // Caso C: Cualquier otra asignatura -> Excluir ID 999
        return dimensiones.filter(d => Number(d.id) !== 999);

    }, [formData.asignaturaId, dimensiones, asignaturas]);

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
                <div className="flex flex-col md:flex-row justify-between items-center border-b border-gray-200 pb-2 mb-6 gap-4">

                    {/* Lado Izquierdo: Título */}
                    <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-gray-700">
                            {mode === "agregar" ? "Registrar Nuevo Juicio" : "Editar Juicio"}
                        </h3>
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

                    {/* Vigencia */}
                    <div className="col-span-1">
                        <label className="block text-sm font-medium text-[#4a5568] mb-1">Año Lectivo</label>
                        <input
                            type="text"
                            value={vigencia ? vigencia.anio : "..."}
                            disabled
                            className={`${inputBaseClasses} bg-gray-100 text-gray-500 font-semibold`}
                        />
                    </div>

                    {/* Período */}
                    <div className="col-span-1">
                        <label className="block text-sm font-medium text-[#4a5568] mb-1">
                            Período <span className="text-[#e74c3c] font-semibold">*</span>
                        </label>
                        <select
                            name="periodo"
                            value={formData.periodo || ""}
                            onChange={handleChange}
                            className={inputBaseClasses}
                        >
                            <option value="">-- Seleccione --</option>
                            {[1, 2, 3, 4].map(p => <option key={p} value={p}>Periodo {p}</option>)}
                        </select>
                    </div>

                    {/* Grado (Select Dinámico) */}
                    <div className="col-span-1">
                        <label className="block text-sm font-medium text-[#4a5568] mb-1">
                            Grado <span className="text-gray-400 font-normal text-xs">(Opcional para juicios globales)</span>
                        </label>
                        <select
                            name="gradoId"
                            value={formData.gradoId || ""}
                            onChange={handleChange}
                            className={inputBaseClasses}
                        // className={`${inputBaseClasses} ${!formData.gradoId ? "bg-blue-50 border-blue-300" : ""}`}
                        >
                            <option value="">-- GLOBAL (Todos los grados) --</option>
                            {grados.map(g => (
                                <option key={g.id} value={g.id}>
                                    {g.nombre ? g.nombre.replace(/_/g, " ") : "Sin Nombre"}
                                </option>
                            ))}
                        </select>
                        {!formData.gradoId && (
                            <p className="text-[12px] text-blue-600 mt-1 flex items-center">
                                <FontAwesomeIcon icon={faInfoCircle} className="mr-1" />
                                Aplica de 1° a Ciclo VI (Excluye Preescolar)
                            </p>
                        )}
                    </div>

                    {/* Asignatura */}
                    <div className="col-span-1 md:col-span-2">
                        <label className="block text-sm font-medium text-[#4a5568] mb-1">
                            Asignatura <span className="text-gray-400 font-normal text-xs">(Opcional para juicios globales)</span>
                        </label>
                        <select
                            name="asignaturaId"
                            value={formData.asignaturaId || ""}
                            onChange={handleChange}
                            className={inputBaseClasses}
                        // className={`${inputBaseClasses} ${!formData.asignaturaId ? "bg-blue-50 border-blue-300" : ""}`}
                        >
                            <option value="">-- GLOBAL (Todas las asignaturas) --</option>
                            {asignaturas.map((asignatura) => (
                                <option key={asignatura.id} value={asignatura.id}>
                                    {asignatura.nombre} - {asignatura.codigo}
                                </option>
                            ))}
                        </select>
                        {!formData.asignaturaId && (
                            <p className="text-[12px] text-blue-600 mt-1">
                                * Para competencias transversales (Social, Laboral, Acumulativa).
                            </p>
                        )}
                    </div>

                    {/* Competencia (Select Dinámico) */}
                    <div className="col-span-1">
                        <label className="block text-sm font-medium text-[#4a5568] mb-1">
                            Competencia <span className="text-[#e74c3c] font-semibold">*</span>
                        </label>
                        <select
                            name="dimensionId"
                            value={formData.dimensionId || ""}
                            onChange={handleChange}
                            className={inputBaseClasses}
                        >
                            <option value="">-- Seleccione --</option>
                            {filteredDimensiones.map(d => (
                                <option key={d.id} value={d.id}>
                                    {d.nombre ? d.nombre.replace(/_/g, " ") : d.nombre}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Desempeño (Select Dinámico) */}
                    <div className="col-span-1">
                        <label className="block text-sm font-medium text-[#4a5568] mb-1">
                            Indicador de desempeño <span className="text-[#e74c3c] font-semibold">*</span>
                        </label>
                        <select
                            name="desempenoId"
                            value={formData.desempenoId || ""}
                            onChange={handleChange}
                            className={inputBaseClasses}
                        >
                            <option value="">-- Seleccione --</option>
                            {desempenos.map(d => (
                                <option key={d.id} value={d.id}>{d.nombre}</option>
                            ))}
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

                    {/* Estado Activo/Inactivo */}
                    {/* <div className="col-span-1 flex items-end">
                        <button
                            type="button"
                            onClick={handleToggleActivo}
                            className={`flex items-center justify-center space-x-3 w-full px-4 py-2 rounded-lg border transition duration-150 mb-[2px] ${formData.activo
                                ? 'bg-green-50 border-green-200 text-green-700 hover:bg-green-100'
                                : 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100'
                                }`}
                            disabled={loading}
                        >
                            {formData.activo ? (
                                <>
                                    <FontAwesomeIcon icon={faToggleOn} className="text-green-600 text-xl" />
                                    <span className="font-medium">Activo</span>
                                </>
                            ) : (
                                <>
                                    <FontAwesomeIcon icon={faToggleOff} className="text-red-600 text-xl" />
                                    <span className="font-medium">Inactivo</span>
                                </>
                            )}
                        </button>
                    </div> */}
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
                        onChange={handleChange}
                        rows="4"
                        placeholder="Ingrese el texto descriptivo del juicio..."
                        className="mt-1 block w-full border border-gray-300 rounded-lg shadow-sm p-3 focus:ring-blue-500 focus:border-blue-500 transition duration-150 resize-none"
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