import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFilePdf, faSearch, faSpinner, faShieldAlt } from "@fortawesome/free-solid-svg-icons";
import { descargarBoletinPorCodigo } from "../../api/boletinesService.js";
import { showError } from "../../utils/notifications.js";
import Swal from "sweetalert2";

const PortalAcudiente = () => {
    const [codigo, setCodigo] = useState("");
    const [loading, setLoading] = useState(false);

    // Formateador automático: A7X9P2M4 -> A7X9-P2M4
    const formatCodigo = (value) => {
        let formatted = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
        if (formatted.length > 4) {
            formatted = `${formatted.slice(0, 4)}-${formatted.slice(4, 8)}`;
        }
        return formatted.slice(0, 9);
    };

    const handleChange = (e) => {
        setCodigo(formatCodigo(e.target.value));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (codigo.length < 9) {
            return showError("El código debe tener 8 caracteres (Ej: A7X9-P2M4).");
        }

        try {
            setLoading(true);
            await descargarBoletinPorCodigo(codigo);

            // Mostrar mensaje de éxito
            Swal.fire({
                icon: 'success',
                title: 'Boletín Encontrado',
                text: 'El documento se ha abierto en una nueva pestaña.',
                timer: 3000,
                showConfirmButton: false
            });

            // Limpiamos el input para la próxima consulta
            setCodigo("");

        } catch (error) {
            showError(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#f7f9fc] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 font-inter">

            {/* Encabezado del Portal */}
            <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
                <div className="mx-auto h-16 w-16 bg-red-600 rounded-full flex items-center justify-center shadow-lg mb-4">
                    <FontAwesomeIcon icon={faFilePdf} className="text-3xl text-white" />
                </div>
                <h2 className="text-3xl font-extrabold text-slate-800">
                    Boletín Digital - Instecau
                </h2>
                <p className="mt-2 text-sm text-gray-600">
                    Descargue la copia digital del boletín ingresando el código de seguridad impreso en el boletín físico.
                </p>
            </div>

            {/* Tarjeta del Formulario */}
            <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
                <div className="bg-white py-8 px-6 shadow-xl rounded-xl border border-gray-100 sm:px-10 relative overflow-hidden">

                    {/* Detalle visual de fondo */}
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-500 to-indigo-600"></div>

                    <form className="space-y-6" onSubmit={handleSubmit}>
                        <div>
                            <label htmlFor="codigo" className="block text-sm font-bold text-gray-700 mb-2 text-center">
                                Código de Verificación
                            </label>
                            <div className="mt-1 relative rounded-md shadow-sm">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <FontAwesomeIcon icon={faShieldAlt} className="text-gray-400" />
                                </div>
                                <input
                                    type="text"
                                    name="codigo"
                                    id="codigo"
                                    required
                                    placeholder="EJ: A7X9-P2M4"
                                    value={codigo}
                                    onChange={handleChange}
                                    disabled={loading}
                                    className="block w-full pl-10 pr-3 py-4 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 sm:text-lg text-center tracking-[0.2em] font-mono font-bold uppercase disabled:bg-gray-100 transition-colors"
                                />
                            </div>
                        </div>

                        <div>
                            <button
                                type="submit"
                                disabled={loading || codigo.length < 9}
                                className={`w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg shadow-md text-lg font-bold text-white transition-transform active:scale-95 ${loading || codigo.length < 9
                                        ? 'bg-blue-400 cursor-not-allowed'
                                        : 'bg-blue-600 hover:bg-blue-700'
                                    }`}
                            >
                                {loading ? (
                                    <>
                                        <FontAwesomeIcon icon={faSpinner} spin className="mr-2" />
                                        Buscando Boletín...
                                    </>
                                ) : (
                                    <>
                                        <FontAwesomeIcon icon={faSearch} className="mr-2" />
                                        Buscar y Descargar
                                    </>
                                )}
                            </button>
                        </div>
                    </form>

                    {/* Instrucciones de ayuda */}
                    <div className="mt-6 border-t border-gray-100 pt-5">
                        <p className="text-xs text-gray-500 text-center">
                            ¿Dónde encuentro mi código? Búscalo en la parte inferior de la última página del boletín físico entregado por el colegio.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PortalAcudiente;