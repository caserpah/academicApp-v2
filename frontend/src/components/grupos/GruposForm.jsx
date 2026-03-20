import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSave, faTimes } from "@fortawesome/free-solid-svg-icons";

const GruposForm = ({
    formData,
    mode,
    loading,
    handleChange,
    handleSubmit,
    resetForm,
    catalogos, // { grados, sedes, docentes }
    vigencia
}) => {
    const inputBaseClasses =
        "mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition duration-150";

    // Validar alfanumérico para Nombre de Grupo
    const handleNombreInput = (e) => {
        const { name, value } = e.target;
        // Regex permite letras, números, espacios y guiones
        const val = value.replace(/[^A-Za-z0-9\s]/g, "").slice(0, 10);
        handleChange({ target: { name, value: val } });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">

            {/* Cabecera del Formulario */}
            <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
                <div className="border-b pb-2 mb-4 border-[#d8d5d5] flex justify-between items-center">
                    <h3 className="text-lg font-semibold text-gray-700">
                        {mode === "agregar" ? "Registrar Nuevo Grupo" : "Editar Grupo"}
                    </h3>

                    {/* Texto Informativo de Vigencia a la derecha */}
                    <div className="text-sm font-bold text-blue-700 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                        Año Lectivo: <span className="text-blue-900">{vigencia ? vigencia.anio : "---"}</span>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

                    {/* Sede */}
                    <div className="col-span-1">
                        <label className="block text-sm font-medium text-[#4a5568] mb-1">
                            Sede <span className="text-red-500">*</span>
                        </label>
                        <select
                            name="sedeId"
                            value={formData.sedeId}
                            onChange={handleChange}
                            className={inputBaseClasses}
                            required
                        >
                            <option value="">-- Seleccione Sede --</option>
                            {catalogos.sedes.map((sede) => (
                                <option key={sede.id} value={sede.id}>
                                    {sede.nombre}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Grado */}
                    <div className="col-span-1">
                        <label className="block text-sm font-medium text-[#4a5568] mb-1">
                            Grado <span className="text-red-500">*</span>
                        </label>
                        <select
                            name="gradoId"
                            value={formData.gradoId}
                            onChange={handleChange}
                            className={inputBaseClasses}
                            required
                        >
                            <option value="">-- Seleccione Grado --</option>
                            {catalogos.grados.map((grado) => (
                                <option key={grado.id} value={grado.id}>
                                    {grado.nombre.replace(/_/g, " ")}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Nombre */}
                    <div className="col-span-1">
                        <label className="block text-sm font-medium text-[#4a5568] mb-1">
                            Grupo <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            name="nombre"
                            value={formData.nombre}
                            onChange={handleNombreInput}
                            placeholder="Ej: A, B, C, ..., 1, 2, 3"
                            className={inputBaseClasses}
                            required
                        />
                        <p className="text-xs text-gray-400 mt-1">Máx. 10 caracteres.</p>
                    </div>

                    {/* Jornada */}
                    <div className="col-span-1">
                        <label className="block text-sm font-medium text-[#4a5568] mb-1">
                            Jornada <span className="text-red-500">*</span>
                        </label>
                        <select
                            name="jornada"
                            value={formData.jornada}
                            onChange={handleChange}
                            className={inputBaseClasses}
                            required
                        >
                            <option value="">-- Seleccione Jornada --</option>
                            <option value="MANANA">Mañana</option>
                            <option value="TARDE">Tarde</option>
                            <option value="NOCHE">Noche</option>
                            <option value="UNICA">Única</option>
                        </select>
                    </div>

                    {/* Director de Grupo (Opcional) */}
                    <div className="col-span-1">
                        <label className="block text-sm font-medium text-[#4a5568] mb-1">
                            Director de Grupo
                        </label>
                        <select
                            name="directorId"
                            value={formData.directorId || ""}
                            onChange={handleChange}
                            className={inputBaseClasses}
                        >
                            <option value="">-- Sin asignar --</option>
                            {catalogos.docentes.map((doc) => (
                                <option key={doc.id} value={doc.id}>
                                    {doc.identidad?.nombre || doc.nombre || ''} {doc.identidad?.apellidos || doc.apellidos || ''}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Cupos */}
                    <div className="col-span-1">
                        <label className="block text-sm font-medium text-[#4a5568] mb-1">
                            Cupos Disponibles <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="number"
                            name="cupos"
                            value={formData.cupos}
                            onChange={handleChange}
                            min="1"
                            max="100"
                            className={inputBaseClasses}
                            required
                        />
                    </div>
                </div>

                {/* Sobrecupo Checkbox */}
                <div className="mt-4 flex items-center">
                    <input
                        id="sobrecupo"
                        name="sobrecupoPermitido"
                        type="checkbox"
                        checked={formData.sobrecupoPermitido}
                        onChange={(e) => handleChange({ target: { name: 'sobrecupoPermitido', value: e.target.checked } })}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                    />
                    <label htmlFor="sobrecupo" className="ml-2 block text-sm text-gray-700 cursor-pointer select-none">
                        Permitir sobrecupo por encima del límite establecido.
                    </label>
                </div>

                {/* Botones */}
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
                        className="bg-red-500 text-white px-5 py-2 rounded-lg shadow-md hover:bg-red-600 transition duration-150 flex items-center"
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

export default GruposForm;