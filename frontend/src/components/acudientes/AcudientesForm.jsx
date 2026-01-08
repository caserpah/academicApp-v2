import React, { useState, useEffect } from 'react';
import { crearAcudiente, actualizarAcudiente } from "../../api/acudientesService.js";
import { showSuccess, showError, showWarning } from "../../utils/notifications.js";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTimes, faSave, faUserCheck } from "@fortawesome/free-solid-svg-icons";

// Estado inicial del formulario
const INITIAL_STATE = {
    tipoDocumento: "CC",
    documento: "",
    primerNombre: "",
    segundoNombre: "",
    primerApellido: "",
    segundoApellido: "",
    contacto: "",
    email: "",
    direccion: ""
};

// --- COMPONENTE PRINCIPAL ---
const AcudientesForm = ({ registro, onClose, onSuccess }) => {
    const [formData, setFormData] = useState(INITIAL_STATE);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (registro) {
            setFormData({
                ...INITIAL_STATE, // Asegura que existan todos los campos
                ...registro,
            });
        }
    }, [registro]);

    // Manejo de cambios en inputs
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validaciones Manuales Básicas
        if (!formData.tipoDocumento || !formData.documento || !formData.primerNombre || !formData.primerApellido) {
            showWarning("Todos los campos obligatorios (<span class='text-[#e74c3c]'>*</span>) deben completarse.");
            return;
        }

        setLoading(true);
        try {
            if (registro || formData.id) {
                await actualizarAcudiente(registro.id, formData);
                showSuccess("Acudiente actualizado exitosamente.");
            } else {
                await crearAcudiente(formData);
                showSuccess("Acudiente registrado exitosamente.");

                // Enfocar el primer campo después de crear
                setTimeout(() => {
                    document.querySelector('[name="tipoDocumento"]')?.focus();
                }, 100);
            }
            onSuccess(); // Recargar tabla padre
        } catch (error) {
            showError(error.message || "Error al guardar el acudiente.");
        } finally {
            setLoading(false);
        }
    };

    return (
        // Overlay del Modal
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">

            {/* Contenedor del Modal */}
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-full max-h-[90vh] flex flex-col">

                {/* Encabezado */}
                <div className="flex justify-between items-center p-5 border-b bg-gray-50 rounded-t-lg">
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <FontAwesomeIcon icon={faUserCheck} className="text-gray-800" />
                        {registro ? "Editar Acudiente" : "Registrar Nuevo Acudiente"}
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                    >
                        <FontAwesomeIcon icon={faTimes} size="lg" />
                    </button>
                </div>

                {/* Cuerpo Scrollable */}
                <div className="p-6 overflow-y-auto custom-scrollbar">
                    <form id="acudienteForm" onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-5">

                        {/* Fila 1: Documento */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1 required">Tipo Documento {" "}
                                <span className="text-red-500">*</span>
                            </label>
                            <select
                                name="tipoDocumento"
                                value={formData.tipoDocumento}
                                onChange={handleChange}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            >
                                <option value="CC">Cédula de Ciudadanía</option>
                                <option value="CE">Cédula de Extranjería</option>
                                <option value="TI">Tarjeta de Identidad</option>
                                <option value="PA">Pasaporte</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1 required">Número de Documento {" "}
                                <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                name="documento"
                                value={formData.documento}
                                onChange={handleChange}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                                placeholder="Máx. 20 dígitos"
                            />
                        </div>

                        {/* Fila 2: Nombres */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Primer Nombre {" "}
                                <span className="text-red-500">*</span>
                            </label>
                            <input type="text" name="primerNombre" value={formData.primerNombre} onChange={handleChange} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500 outline-none uppercase" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Segundo Nombre</label>
                            <input type="text" name="segundoNombre" value={formData.segundoNombre} onChange={handleChange} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500 outline-none uppercase" />
                        </div>

                        {/* Fila 3: Apellidos */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Primer Apellido {" "}
                                <span className="text-red-500">*</span>
                            </label>
                            <input type="text" name="primerApellido" value={formData.primerApellido} onChange={handleChange} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500 outline-none uppercase" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Segundo Apellido</label>
                            <input type="text" name="segundoApellido" value={formData.segundoApellido} onChange={handleChange} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500 outline-none uppercase" />
                        </div>

                        {/* Fila 4: Contacto */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Contacto (10-12 dígitos, opcional)</label>
                            <input type="text" name="contacto" value={formData.contacto} onChange={handleChange} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="Teléfono de contacto" />
                        </div>

                        {/* Fila 5: Datos Extra (Full Width) */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Correo Electrónico</label>
                            <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500 outline-none lowercase" placeholder="ejemplo@colegio.edu.co" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Dirección de Residencia</label>
                            <input type="text" name="direccion" value={formData.direccion} onChange={handleChange} className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500 outline-none" placeholder="Ej: Calle 10 # 5-20" />
                        </div>

                    </form>
                </div>

                {/* Footer */}
                <div className="p-5 border-t border-gray-300 rounded-b-lg flex justify-end gap-3">
                    <button
                        type="submit"
                        form="acudienteForm" // Vincula el botón al form
                        disabled={loading}
                        className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-md flex items-center gap-2 transition-transform active:scale-95 disabled:opacity-50"
                    >
                        {loading ? "Guardando..." : (
                            <>
                                <FontAwesomeIcon icon={faSave} />
                                {registro ? "Guardar Cambios" : "Guardar"}
                            </>
                        )}
                    </button>
                    <button
                        type="button"
                        onClick={onClose}
                        className="bg-red-500 text-white px-5 py-2 rounded-lg hover:bg-red-600 transition flex items-center shadow-md"
                    >
                        <FontAwesomeIcon icon={faTimes} className="mr-2" /> Cerrar
                    </button>
                </div>

            </div>
        </div>
    );
};

export default AcudientesForm;