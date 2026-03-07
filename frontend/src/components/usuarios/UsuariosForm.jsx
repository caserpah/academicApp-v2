import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSave, faTimes, faUserShield } from "@fortawesome/free-solid-svg-icons";

const UsuariosForm = ({ formData, mode, loading, handleChange, handleSubmit, resetForm }) => {

    // Clases base para inputs (Tailwind)
    const inputClasses = "mt-1 block w-full border border-gray-300 rounded-lg shadow-sm p-2.5 focus:ring-blue-500 focus:border-blue-500 transition outline-none";

    return (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 mb-8 animate-fade-in-down">

            {/* Encabezado del Formulario */}
            <div className="border-b border-gray-200 pb-3 mb-5 flex items-center text-gray-700">
                <FontAwesomeIcon icon={faUserShield} className="mr-3 text-blue-600" />
                <h3 className="text-lg font-bold">
                    {mode === "agregar" ? "Registrar Nuevo Usuario" : "Editar Usuario"}
                </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Nombre Completo */}
                <div>
                    <label className="block text-sm font-semibold text-gray-600 mb-1">
                        Nombre Completo  {" "}
                        <span className="text-[#e74c3c] font-semibold">*</span>
                    </label>
                    <input
                        type="text"
                        name="nombreCompleto"
                        value={formData.nombreCompleto}
                        onChange={handleChange}
                        className={inputClasses}
                        required
                        placeholder="Ej: Juan Pérez"
                        maxLength={80}
                    />
                </div>

                {/* Documento */}
                <div>
                    <label className="block text-sm font-semibold text-gray-600 mb-1">
                        Número de documento  {" "}
                        <span className="text-[#e74c3c] font-semibold">*</span>
                    </label>
                    <input
                        type="text"
                        name="documento"
                        value={formData.documento}
                        onChange={handleChange}
                        className={inputClasses}
                        required
                        maxLength={20}
                    />
                </div>

                {/* Email */}
                <div>
                    <label className="block text-sm font-semibold text-gray-600 mb-1">
                        Correo Electrónico {" "}
                        <span className="text-[#e74c3c] font-semibold">*</span>
                    </label>
                    <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        className={inputClasses}
                        required
                        placeholder="ejemplo@correo.com"
                    />
                </div>

                {/* Rol */}
                <div>
                    <label className="block text-sm font-semibold text-gray-600 mb-1">
                        Rol del Sistema{" "}
                        <span className="text-[#e74c3c] font-semibold">*</span>
                    </label>
                    <select
                        name="role"
                        value={formData.role}
                        onChange={handleChange}
                        className={inputClasses}
                    >
                        <option value="acudiente">Acudiente</option>
                        <option value="docente">Docente</option>
                        <option value="coordinador">Coordinador</option>
                        <option value="director">Director</option>
                        <option value="admin">Administrador</option>
                    </select>
                </div>

                {/* Teléfono (Opcional) */}
                <div>
                    <label className="block text-sm font-semibold text-gray-600 mb-1">Teléfono / Celular</label>
                    <input
                        type="tel"
                        name="contacto"
                        value={formData.contacto || ""}
                        onChange={handleChange}
                        className={inputClasses}
                        placeholder="Opcional"
                        maxLength={12}
                    />
                </div>

                {/* Contraseña */}
                <div className="col-span-1 md:col-span-2 bg-blue-50 p-4 rounded-lg border border-blue-100">
                    <label className="block text-sm font-bold text-blue-800 mb-1">
                        {mode === "agregar" ? "Contraseña Inicial *" : "Cambiar Contraseña (Opcional)"}
                    </label>
                    <input
                        type="password"
                        name="password"
                        value={formData.password || ""}
                        onChange={handleChange}
                        className={inputClasses}
                        required={mode === "agregar"} // Solo obligatoria al crear
                        placeholder={mode === "agregar" ? "Mínimo 8 caracteres" : "Dejar en blanco para mantener la actual"}
                        minLength={8}
                    />
                    {mode === "editar" && (
                        <p className="text-xs text-blue-600 mt-1">
                            Solo llena este campo si deseas cambiar la contraseña del usuario.
                        </p>
                    )}
                </div>

                {/* Estado (Solo en edición) */}
                {mode === "editar" && (
                    <div className="col-span-1 md:col-span-2 flex items-center">
                        <input
                            type="checkbox"
                            name="activo"
                            checked={formData.activo}
                            onChange={(e) => handleChange({ target: { name: 'activo', value: e.target.checked } })}
                            className="w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                        />
                        <label className="ml-2 text-sm font-medium text-gray-700">Usuario Activo (Puede iniciar sesión)</label>
                    </div>
                )}
            </div>

            {/* Botones de Acción */}
            <div className="pt-6 flex justify-end gap-3 mt-4 border-t border-gray-200">
                <button
                    type="button"
                    onClick={resetForm}
                    className="bg-red-500 text-white px-5 py-2 rounded-lg shadow-md hover:bg-red-600 transition duration-150 flex items-center hover:scale-[1.01]"
                    disabled={loading}
                >
                    <FontAwesomeIcon icon={faTimes} className="mr-2" /> Cancelar
                </button>
                <button
                    type="submit"
                    className="bg-blue-600 text-white px-5 py-2 rounded-lg shadow-md hover:bg-blue-700 transition duration-150 flex items-center"
                    disabled={loading}
                >
                    <FontAwesomeIcon icon={faSave} className="mr-2" />
                    {loading ? "Guardando..." : "Guardar Usuario"}
                </button>
            </div>
        </form>
    );
};

export default UsuariosForm;