import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSearch, faTrash, faTimes, faSave, faUserPlus, faCheckCircle, faIdCard } from "@fortawesome/free-solid-svg-icons";
import { buscarAcudientePorDocumento, asignarAcudiente, desvincularAcudiente } from "../../api/acudientesService.js";
import { showSuccess, showError, showConfirm } from "../../utils/notifications.js";

// Enums para el select de afinidad
const AFINIDADES = [
    "PADRE", "MADRE", "HERMANO", "HERMANA",
    "ABUELO", "ABUELA", "TIO", "TIA", "TUTOR", "OTRO"
];

const INITIAL_FORM = {
    tipoDocumento: 'CC', documento: '', primerNombre: '',
    segundoNombre: '', primerApellido: '', segundoApellido: '',
    telefono: '', direccion: '', email: '', afinidad: ''
};

const AcudientesTab = ({ estudiante, onUpdate }) => {
    // --- ESTADOS ---
    const [modoFormulario, setModoFormulario] = useState(false); // false = Lista, true = Formulario
    const [loading, setLoading] = useState(false);
    const [buscandoDoc, setBuscandoDoc] = useState(false);

    const [formData, setFormData] = useState(INITIAL_FORM);
    const [existeEnBD, setExisteEnBD] = useState(false); // Para mostrar aviso visual si ya existe

    // --- MANEJO DEL FORMULARIO ---

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // --- AUTOCOMPLETADO MÁGICO ---
    const handleBlurDocumento = async () => {
        const doc = formData.documento;
        if (!doc || doc.length < 4) return;

        setBuscandoDoc(true);
        setExisteEnBD(false);
        try {
            const encontrado = await buscarAcudientePorDocumento(doc);

            if (encontrado) {
                // Si existe, rellenamos el formulario automáticamente
                setFormData(prev => ({
                    ...prev,
                    ...encontrado, // Sobrescribe nombres, apellidos, contacto...
                    afinidad: prev.afinidad // Mantiene la afinidad que el usuario eligió
                }));
                setExisteEnBD(true);
            } else {
                // Si no existe, limpiamos los campos de nombre para evitar mezclas,
                // pero mantenemos el documento y tipo
                setFormData(prev => ({
                    ...INITIAL_FORM,
                    tipoDocumento: prev.tipoDocumento,
                    documento: prev.documento,
                    afinidad: prev.afinidad
                }));
            }
        } catch (error) {
            console.error(error);
        } finally {
            setBuscandoDoc(false);
        }
    };

    // --- GUARDAR Y ASIGNAR ---
    const handleSubmit = async () => {

        setLoading(true);
        try {
            const payload = {
                estudianteId: estudiante.id,
                ...formData
            };

            // Llamamos a nuestro endpoint híbrido (Crea o Vincula)
            await asignarAcudiente(payload);

            showSuccess(existeEnBD
                ? "Acudiente vinculado correctamente."
                : "Acudiente registrado y asignado correctamente."
            );

            // Resetear y volver a la lista
            setModoFormulario(false);
            setFormData(INITIAL_FORM);
            setExisteEnBD(false);

            // Recargar padre
            if (onUpdate) onUpdate();

        } catch (error) {
            showError(error.message);
        } finally {
            setLoading(false);
        }
    };

    // --- DESVINCULAR ACUDIENTE ---
    const handleDesvincular = async (acudienteId) => {
        const confirmar = await showConfirm("¿Seguro que desea desvincular este acudiente del estudiante?");
        if (!confirmar) return;

        setLoading(true);
        try {
            await desvincularAcudiente(estudiante.id, acudienteId);
            showSuccess("Acudiente desvinculado exitosamente.");
            if (onUpdate) onUpdate();
        } catch (error) {
            showError(error.message);
        } finally {
            setLoading(false);
        }
    };

    // --- VISTA BLOQUEADA (SI NO HAY ESTUDIANTE) ---
    if (!estudiante || !estudiante.id) {
        return (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded text-yellow-700 animate-fade-in">
                <FontAwesomeIcon icon={faSave} className="mr-2" />
                Para gestionar acudientes, primero debe <strong>guardar</strong> la información básica del estudiante.
            </div>
        );
    }

    // --- VISTA: FORMULARIO DE ASIGNACIÓN ---
    if (modoFormulario) {
        return (
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 shadow-inner animate-fade-in">
                <div className="flex justify-between items-center mb-4 border-b pb-2 border-gray-200">
                    <h3 className="text-md text-gray-800 font-semibold flex items-center gap-2">
                        {existeEnBD ? <FontAwesomeIcon icon={faCheckCircle} className="text-green-500" /> : <FontAwesomeIcon icon={faUserPlus} />}
                        {existeEnBD ? "Vincular Persona Existente" : "Registrar Nuevo Acudiente"}
                    </h3>
                    <button
                        type="button"
                        onClick={(e) => {
                            e.preventDefault();  // Detiene comportamiento nativo
                            e.stopPropagation(); // Evita que el clic "suba" al formulario padre
                            setModoFormulario(false);
                            setFormData(INITIAL_FORM);
                        }}
                        className="text-gray-500 hover:text-red-500 text-sm font-medium transition-colors"
                    >
                        <FontAwesomeIcon icon={faTimes} className="mr-1" /> Cancelar
                    </button>
                </div>

                {existeEnBD && (
                    <div className="mb-4 bg-green-100 text-green-800 text-sm p-2 rounded flex items-center border border-green-200">
                        <FontAwesomeIcon icon={faIdCard} className="mr-2" />
                        Esta persona ya existe en el sistema. Al guardar, se creará el vínculo con el estudiante.
                    </div>
                )}

                <div className="space-y-4" onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                        {/* Parentesco (Campo Principal) */}
                        <div className="md:col-span-2 bg-white p-3 rounded border border-blue-200 shadow-sm">
                            <label className="block text-xs font-semibold text-blue-800 uppercase mb-2">Parentesco con el Estudiante {" "}
                                <span className="text-red-500">*</span>
                            </label>
                            <select
                                name="afinidad"
                                value={formData.afinidad}
                                onChange={handleChange}
                                className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            >
                                <option value="">-- Seleccione --</option>
                                {AFINIDADES.map(a => <option key={a} value={a}>{a}</option>)}
                            </select>
                        </div>

                        {/* Documento */}
                        <div className="bg-white p-3 rounded border border-gray-200">
                            <label className="block text-sm text-gray-500 mb-2">Tipo Documento {" "}
                                <span className="text-red-500">*</span>
                            </label>
                            <select
                                name="tipoDocumento"
                                value={formData.tipoDocumento}
                                onChange={handleChange}
                                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm mb-3 focus:ring-2 focus:ring-blue-500 outline-none"
                            >
                                <option value="CC">Cédula de Ciudadanía</option>
                                <option value="CE">Cédula de Extranjería</option>
                                <option value="TI">Tarjeta de Identidad</option>
                                <option value="PA">Pasaporte</option>
                            </select>

                            <label className="block text-sm text-gray-500 mb-1">Número Documento {" "}
                                <span className="text-red-500">*</span>
                            </label>
                            <div className="relative">
                                <input
                                    type="text"
                                    name="documento"
                                    value={formData.documento}
                                    onChange={handleChange}
                                    onBlur={handleBlurDocumento}
                                    placeholder="Digite y pulse TAB"
                                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                                {buscandoDoc && (
                                    <span className="absolute right-2 top-2 text-xs text-blue-500">
                                        <FontAwesomeIcon icon={faSearch} spin />
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Datos Personales */}
                        <div className="md:col-span-1 bg-white p-3 rounded border border-gray-200 grid grid-cols-1 gap-3">
                            <div>
                                <label className="block text-sm text-gray-500 mb-1">Nombres {" "}
                                    <span className="text-red-500">*</span>
                                </label>
                                <div className="flex gap-2">
                                    <input type="text" name="primerNombre" placeholder="Primer Nombre" value={formData.primerNombre} onChange={handleChange} className="w-1/2 border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                                    <input type="text" name="segundoNombre" placeholder="Segundo Nombre" value={formData.segundoNombre} onChange={handleChange} className="w-1/2 border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm text-gray-500 mb-1">Apellidos {" "}
                                    <span className="text-red-500">*</span>
                                </label>
                                <div className="flex gap-2">
                                    <input type="text" name="primerApellido" placeholder="Primer Apellido" value={formData.primerApellido} onChange={handleChange} className="w-1/2 border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                                    <input type="text" name="segundoApellido" placeholder="Segundo Apellido" value={formData.segundoApellido} onChange={handleChange} className="w-1/2 border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                                </div>
                            </div>
                        </div>

                        {/* Otros Datos */}
                        <div className="md:col-span-2 bg-white p-3 rounded border border-gray-200 grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm text-gray-500 mb-1">Contacto / Celular</label>
                                <input type="text" name="contacto" placeholder="Teléfono de contacto" value={formData.contacto} onChange={handleChange} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-500 mb-1">Dirección</label>
                                <input type="text" name="direccion" placeholder="Ej: Calle 5 # 10-23" value={formData.direccion} onChange={handleChange} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                            <div>
                                <label className="block text-sm text-gray-500 mb-1">Email</label>
                                <input type="email" name="email" placeholder="acudiente@colegio.edu.co" value={formData.email} onChange={handleChange} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                            </div>
                        </div>

                    </div>

                    <div className="mt-4 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={(e) => {
                                e.preventDefault();  // Detiene comportamiento nativo
                                e.stopPropagation(); // Evita que el clic "suba" al formulario padre
                                setModoFormulario(false);
                                setFormData(INITIAL_FORM);
                            }}
                            className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-gray-400 hover:text-white text-sm font-medium"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={handleSubmit}
                            disabled={loading}
                            className="bg-green-600 text-white px-5 py-2 rounded hover:bg-green-700 text-sm shadow flex items-center gap-2"
                        >
                            {loading ? "Guardando..." : (
                                <>
                                    <FontAwesomeIcon icon={faSave} />
                                    {existeEnBD ? "Vincular Acudiente" : "Guardar y Vincular"}
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // --- VISTA: LISTA DE ACUDIENTES ---
    return (
        <div className="space-y-4 animate-fade-in">
            <div className="flex justify-between items-center border-b border-gray-300 pb-2">
                <h3 className="font-semibold text-gray-800">Acudientes Asignados</h3>
                <button
                    onClick={() => setModoFormulario(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-sm font-medium shadow-sm transition-all flex items-center gap-2"
                >
                    <FontAwesomeIcon icon={faUserPlus} /> Agregar
                </button>
            </div>

            {!estudiante.acudientes || estudiante.acudientes.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                    <p className="text-gray-500 text">No hay acudientes asociados a este estudiante.</p>
                </div>
            ) : (
                <div className="grid gap-3 md:grid-cols-2">
                    {estudiante.acudientes.map((acu) => (
                        <div key={acu.id} className="flex flex-col justify-between p-3 bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow">

                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-700 font-bold text-xs border border-indigo-100">
                                        {acu.acudiente_estudiantes?.afinidad?.substring(0, 2) || "NA"}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-800 uppercase">
                                            {acu.primerApellido} {acu.primerNombre}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            {acu.tipoDocumento} {acu.documento}
                                        </p>
                                    </div>
                                </div>
                                <span className="text-[10px] font-bold tracking-wide text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                                    {acu.acudiente_estudiantes?.afinidad}
                                </span>
                            </div>

                            <div className="mt-3 pt-2 border-t border-gray-100 flex justify-between items-center">
                                <div className="text-xs text-gray-500 flex flex-col">
                                    <span>📞 {acu.contacto || "Sin teléfono"}</span>
                                    <span>📧 {acu.email || "Sin email"}</span>
                                </div>
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.preventDefault();  // Detiene comportamiento nativo
                                        e.stopPropagation(); // Detiene que el clic suba al formulario padre
                                        handleDesvincular(acu.id);
                                    }}
                                    disabled={loading} // Evita múltiples clics
                                    className="text-gray-400 hover:text-red-600 p-2 transition-colors rounded hover:bg-red-50"
                                    title="Desvincular acudiente"
                                >
                                    <FontAwesomeIcon icon={faTrash} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default AcudientesTab;