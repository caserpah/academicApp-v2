import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSave, faTimes, faSearch } from "@fortawesome/free-solid-svg-icons";

/**
 * Formulario reutilizable para la creación y edición de Asignaturas.
 */
const AsignaturasForm = ({
    formData,
    mode,
    loading,
    handleChange,
    handlePorcentualChange,
    handleCheckboxChange,
    handleSubmit,
    resetForm,
    areas,
    vigencia,
}) => {
    const [searchArea, setSearchArea] = useState("");

    const inputBaseClasses =
        "mt-1 block w-full border border-gray-300 rounded-lg shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150";
    const readOnlyClasses = "bg-gray-100 cursor-not-allowed text-gray-700";
    const getInputClasses = (readOnly = false) =>
        readOnly ? `${inputBaseClasses} ${readOnlyClasses}` : inputBaseClasses;

    // ==========================
    // Restricciones de entrada
    // ==========================

    // Permitir solo alfanuméricos en código y abreviatura
    const handleAlphanumericInput = (e, maxLength = 20) => {
        const { name, value } = e.target;
        const onlyAlphanumeric = value.replace(/[^a-zA-Z0-9]/g, "").slice(0, maxLength);
        handleChange({ target: { name, value: onlyAlphanumeric } });
    };

    // Convertir a mayúsculas automáticamente
    const handleUpperCaseInput = (e, maxLength = 60) => {
        const { name, value } = e.target;
        const upperCaseValue = value.toUpperCase().slice(0, maxLength);
        handleChange({ target: { name, value: upperCaseValue } });
    };

    // Filtrar áreas basado en búsqueda
    const filteredAreas = areas.filter(area =>
        area.nombre.toLowerCase().includes(searchArea.toLowerCase()) ||
        area.codigo.toLowerCase().includes(searchArea.toLowerCase())
    );

    // ==========================
    // Campos del formulario
    // ==========================
    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* ID (solo lectura) */}
                <div className="col-span-1">
                    <label className="block text-sm font-medium text-[#4a5568] mb-1">
                        ID
                    </label>
                    <input
                        type="text"
                        name="id"
                        value={formData.id || "Nuevo"}
                        disabled
                        className={getInputClasses(true)}
                    />
                </div>

                {/* Código */}
                <div className="col-span-1">
                    <label className="block text-sm font-medium text-[#4a5568] mb-1">
                        Código {" "}
                        <span className="text-[#e74c3c] font-semibold">*</span>
                    </label>
                    <input
                        type="text"
                        name="codigo"
                        value={formData.codigo}
                        onChange={(e) => handleAlphanumericInput(e, 6)}
                        placeholder="Máx. 6 caracteres alfanuméricos"
                        maxLength={6}
                        className={getInputClasses()}
                    />
                </div>

                {/* Nombre */}
                <div className="col-span-1">
                    <label className="block text-sm font-medium text-[#4a5568] mb-1">
                        Nombre{" "}
                        <span className="text-[#e74c3c] font-semibold">*</span>
                    </label>
                    <input
                        type="text"
                        name="nombre"
                        value={formData.nombre}
                        onChange={(e) => handleUpperCaseInput(e, 60)}
                        placeholder="Nombre completo de la asignatura"
                        maxLength={60}
                        className={getInputClasses()}
                    />
                </div>

                {/* Abreviatura */}
                <div className="col-span-1">
                    <label className="block text-sm font-medium text-[#4a5568] mb-1">
                        Abreviatura{" "}
                        <span className="text-[#e74c3c] font-semibold">*</span>
                    </label>
                    <input
                        type="text"
                        name="abreviatura"
                        value={formData.abreviatura}
                        onChange={(e) => handleAlphanumericInput(e, 6)}
                        placeholder="Máx. 6 caracteres"
                        maxLength={6}
                        className={getInputClasses()}
                    />
                </div>

                {/* Porcentual */}
                <div className="col-span-1">
                    <label className="block text-sm font-medium text-[#4a5568] mb-1">
                        Porcentual (%){" "}
                        <span className="text-[#e74c3c] font-semibold">*</span>
                    </label>
                    <div className="flex items-center">
                        <input
                            type="number"
                            name="porcentual"
                            value={formData.porcentual}
                            onChange={handlePorcentualChange}
                            min="0"
                            max="100"
                            step="0.1"
                            className={`${getInputClasses()} w-full`}
                            placeholder="Ej: 30.5"
                        />
                        <span className="ml-2 text-gray-600">%</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                        Porcentaje que representa esta asignatura en el área.
                    </p>
                </div>

                {/* Promociona (Checkbox) */}
                <div className="col-span-1">
                    <label className="flex items-center space-x-2 mt-6">
                        <input
                            type="checkbox"
                            name="promociona"
                            checked={formData.promociona}
                            onChange={handleCheckboxChange}
                            className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm font-medium text-[#4a5568]">
                            ¿Promociona?
                        </span>
                    </label>
                    <p className="text-xs text-gray-500 mt-1">
                        Si está marcado, la asignatura permite promoción de estudiantes.
                    </p>
                </div>

                {/* Área (Select con búsqueda) */}
                <div className="col-span-2">
                    <label className="block text-sm font-medium text-[#4a5568] mb-1">
                        Área {" "}
                        <span className="text-[#e74c3c] font-semibold">*</span>
                    </label>

                    {/* Campo de búsqueda */}
                    <div className="mb-2 relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <FontAwesomeIcon icon={faSearch} className="h-4 w-4 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            value={searchArea}
                            onChange={(e) => setSearchArea(e.target.value)}
                            placeholder="Buscar área por nombre o código..."
                            className="pl-10 block w-full border border-gray-300 rounded-lg shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                    {/* Select de áreas filtradas */}
                    <select
                        name="areaId"
                        value={formData.areaId || ""}
                        onChange={handleChange}
                        required
                        className={getInputClasses()}
                        size={filteredAreas.length > 5 ? 5 : Math.max(3, filteredAreas.length)}
                    >
                        <option value="">Seleccione un área...</option>
                        {filteredAreas.length > 0 ? (
                            filteredAreas.map(area => (
                                <option key={area.id} value={area.id}>
                                    {area.codigo} - {area.nombre} {area.promociona ? "(Promociona)" : ""}
                                </option>
                            ))
                        ) : (
                            <option value="" disabled>
                                {searchArea ? "No se encontraron áreas con esa búsqueda" : "No hay áreas disponibles"}
                            </option>
                        )}
                    </select>
                    
                    {formData.areaId && (
                        <p className="text-xs text-green-600 mt-1">
                            Área seleccionada: {areas.find(a => a.id === parseInt(formData.areaId))?.nombre}
                        </p>
                    )}
                </div>

                {/* Campo Vigencia ID (solo lectura) */}
                <div className="col-span-2">
                    <label className="block text-sm font-medium text-[#4a5568] mb-1">
                        Vigencia{" "}
                        <span className="text-[#e74c3c] font-semibold">*</span>
                    </label>
                    <select
                        name="vigenciaId"
                        value={formData.vigenciaId || ""}
                        onChange={handleChange}
                        required
                        disabled
                        className={getInputClasses(true)}
                    >
                        {vigencia ? (
                            <option value={vigencia.id}>
                                {vigencia.anio} (ID: {vigencia.id})
                            </option>
                        ) : (
                            <option value="">Cargando vigencia...</option>
                        )}
                    </select>
                </div>
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
        </form>
    );
};

export default AsignaturasForm;