import React, { useMemo } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSave, faTimes, faToggleOn, faToggleOff } from "@fortawesome/free-solid-svg-icons";

/**
 * Formulario reutilizable para la creación y edición de Juicios.
 *
 * Props esperadas:
 * - formData: objeto con los valores actuales del formulario.
 * - handleChange: función para manejar cambios en los campos.
 * - handleSubmit: función para enviar el formulario.
 * - resetForm: función para reiniciar el formulario.
 * - loading: estado booleano para bloquear botones mientras carga.
 * - mode: "agregar" | "editar" (define texto y comportamiento).
 * - asignaturas: array de asignaturas disponibles.
 * - vigencia: objeto de la vigencia activa (solo lectura).
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
     * Lógica Inteligente de Rangos
     */

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
                <div className="border-b pb-2 mb-4 border-[#d8d5d5]">
                    <h2 className="text-lg font-semibold text-gray-700">
                        {mode === "agregar" ? "Registrar Nuevo Juicio" : "Editar Juicio"}
                    </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

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
                        <label className="block text-sm font-medium text-[#4a5568] mb-1">Vigencia</label>
                        <input
                            type="text"
                            value={vigencia ? vigencia.anio : "..."}
                            disabled
                            className={`${inputBaseClasses} bg-gray-100 font-bold`}
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
                            Grado <span className="text-[#e74c3c] font-semibold">*</span>
                        </label>
                        <select
                            name="gradoId"
                            value={formData.gradoId || ""}
                            onChange={handleChange}
                            className={inputBaseClasses}
                        >
                            <option value="">-- Seleccione Grado --</option>
                            {grados.map(g => (
                                <option key={g.id} value={g.id}>{g.nombre}</option>
                            ))}
                        </select>
                    </div>

                    {/* Asignatura */}
                    <div className="col-span-1 md:col-span-2">
                        <label className="block text-sm font-medium text-[#4a5568] mb-1">
                            Asignatura <span className="text-[#e74c3c] font-semibold">*</span>
                        </label>
                        <select
                            name="asignaturaId"
                            value={formData.asignaturaId || ""}
                            onChange={handleChange}
                            className={inputBaseClasses}
                        >
                            <option value="">-- Seleccione Asignatura --</option>
                            {asignaturas.map((asignatura) => (
                                <option key={asignatura.id} value={asignatura.id}>
                                    {asignatura.nombre} - {asignatura.codigo}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Dimensión (Select Dinámico) */}
                    <div className="col-span-1">
                        <label className="block text-sm font-medium text-[#4a5568] mb-1">
                            Dimensión <span className="text-[#e74c3c] font-semibold">*</span>
                        </label>
                        <select
                            name="dimensionId"
                            value={formData.dimensionId || ""}
                            onChange={handleChange}
                            className={inputBaseClasses}
                        >
                            <option value="">-- Seleccione --</option>
                            {dimensiones.map(d => (
                                <option key={d.id} value={d.id}>{d.nombre}</option>
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
                                {/* Enviamos valor oculto para que viaje en el form si es necesario, aunque en BD no se guarde en tabla juicios */}
                                <input type="hidden" name="minNota" value={rangoActual ? rangoActual.minNota : ""} />
                            </div>

                            <div className="col-span-1">
                                <label className="block text-sm font-medium text-[#4a5568] mb-1">Nota Máxima</label>
                                <input
                                    type="text"
                                    value={rangoActual ? rangoActual.maxNota : "-"}
                                    disabled
                                    className={`${inputBaseClasses} ${readOnlyClasses}`}
                                />
                                <input type="hidden" name="maxNota" value={rangoActual ? rangoActual.maxNota : ""} />
                            </div>
                        </>
                    )}

                    {/* Estado Activo/Inactivo */}
                    <div className="col-span-1 flex items-end">
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
                    </div>
                </div>

                {/* Texto del Juicio */}
                <div className="mt-6">
                    <label className="block text-sm font-medium text-[#4a5568] mb-1">
                        Texto del Juicio <span className="text-[#e74c3c] font-semibold">*</span>
                    </label>
                    <textarea
                        name="texto"
                        value={formData.texto || ""}
                        onChange={handleChange}
                        rows="4"
                        placeholder="Ingrese el texto descriptivo del juicio..."
                        className="mt-1 block w-full border border-gray-300 rounded-lg shadow-sm p-3 focus:ring-blue-500 focus:border-blue-500 transition duration-150 resize-none"
                    />
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
        </form>
    );
};

export default JuiciosForm;