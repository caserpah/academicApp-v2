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

// ESTADO INICIAL DEL FORMULARIO
const INITIAL_FORM = {
    tipoDocumento: 'CC', documento: '', nombre: '', apellidos: '',
    telefono: '', direccion: '', email: '', afinidad: ''
};

const AcudientesTab = ({ estudiante, onUpdate }) => {
    // --- ESTADOS ---
    const [modoFormulario, setModoFormulario] = useState(false);
    const [loading, setLoading] = useState(false);
    const [buscandoDoc, setBuscandoDoc] = useState(false);

    const [formData, setFormData] = useState(INITIAL_FORM);
    const [existeEnBD, setExisteEnBD] = useState(false);

    // --- MANEJO DEL FORMULARIO ---
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // Autocompletar datos al perder foco en el campo documento
    const handleBlurDocumento = async () => {
        const doc = formData.documento;
        if (!doc || doc.length < 4) return;

        setBuscandoDoc(true);
        setExisteEnBD(false);
        try {
            const encontrado = await buscarAcudientePorDocumento(doc);

            if (encontrado) {
                // MAPEAMOS LOS DATOS DESDE LA FUENTE ÚNICA DE VERDAD (Usuarios)
                const identidad = encontrado.identidad || {};

                setFormData(prev => ({
                    ...prev,
                    tipoDocumento: encontrado.tipoDocumento || 'CC',
                    direccion: encontrado.direccion || '',
                    documento: identidad.documento || doc,
                    nombre: identidad.nombre || '',
                    apellidos: identidad.apellidos || '',
                    telefono: identidad.telefono || '',
                    email: identidad.email || '',
                    afinidad: prev.afinidad // Mantiene lo que eligió la secretaria
                }));
                setExisteEnBD(true);
            } else {
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

            await asignarAcudiente(payload);

            showSuccess(existeEnBD
                ? "Acudiente vinculado exitosamente."
                : "Acudiente registrado y asignado exitosamente."
            );

            setModoFormulario(false);
            setFormData(INITIAL_FORM);
            setExisteEnBD(false);

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

    if (!estudiante || !estudiante.id) {
        return (
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded text-yellow-700 animate-fade-in">
                <FontAwesomeIcon icon={faSave} className="mr-2" />
                Para gestionar acudientes, primero debe <strong>guardar</strong> la información básica del estudiante.
            </div>
        );
    }

    // --- VISTA: FORMULARIO ULTRA COMPACTO ---
    if (modoFormulario) {
        return (
            <div className="bg-gray-50 p-3 rounded border border-gray-200 shadow-inner animate-fade-in text-sm">
                <div className="flex justify-between items-center mb-3 border-b pb-2 border-gray-200">
                    <h3 className="text-gray-800 font-semibold flex items-center gap-2">
                        {existeEnBD ? <FontAwesomeIcon icon={faCheckCircle} className="text-green-500" /> : <FontAwesomeIcon icon={faUserPlus} className="text-blue-600" />}
                        {existeEnBD ? "Vincular Persona Existente" : "Registrar Nuevo Acudiente"}
                    </h3>
                    <button
                        type="button"
                        onClick={(e) => {
                            e.preventDefault(); e.stopPropagation();
                            setModoFormulario(false);
                            setFormData(INITIAL_FORM);
                        }}
                        className="text-gray-500 hover:text-red-500 font-medium transition-colors"
                    >
                        <FontAwesomeIcon icon={faTimes} /> Cerrar
                    </button>
                </div>

                {existeEnBD && (
                    <div className="mb-3 bg-green-100 text-green-800 p-2 rounded flex items-center border border-green-200 text-xs">
                        <FontAwesomeIcon icon={faIdCard} className="mr-2" />
                        Esta persona ya existe. Al guardar, se creará el vínculo con el estudiante y se actualizarán sus datos de contacto.
                    </div>
                )}

                <div className="space-y-3" onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}>

                    {/* FILA 1: Afinidad, Tipo Doc, Documento (3 columnas) */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                            <label className="block text-xs font-semibold text-blue-800 mb-1">Parentesco <span className="text-red-500">*</span></label>
                            <select name="afinidad" value={formData.afinidad} onChange={handleChange} className="w-full border border-gray-300 rounded px-2 py-1.5 focus:ring-1 focus:ring-blue-500 outline-none" required>
                                <option value="">-- Seleccione --</option>
                                {AFINIDADES.map(a => <option key={a} value={a}>{a}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Tipo Documento <span className="text-red-500">*</span></label>
                            <select name="tipoDocumento" value={formData.tipoDocumento} onChange={handleChange} className="w-full border border-gray-300 rounded px-2 py-1.5 focus:ring-1 focus:ring-blue-500 outline-none">
                                <option value="CC">Cédula de Ciudadanía</option>
                                <option value="CE">Cédula de Extranjería</option>
                                <option value="TI">Tarjeta de Identidad</option>
                                <option value="PA">Pasaporte</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Número Documento <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <input type="text" name="documento" value={formData.documento} onChange={handleChange} onBlur={handleBlurDocumento} placeholder="Digite y TAB" className="w-full border border-gray-300 rounded px-2 py-1.5 focus:ring-1 focus:ring-blue-500 outline-none" />
                                {buscandoDoc && <span className="absolute right-2 top-1.5 text-blue-500"><FontAwesomeIcon icon={faSearch} spin /></span>}
                            </div>
                        </div>
                    </div>

                    {/* FILA 2: Nombres y Apellidos (2 columnas) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Nombres Completos <span className="text-red-500">*</span></label>
                            <input type="text" name="nombre" value={formData.nombre} onChange={handleChange} className="w-full border border-gray-300 rounded px-2 py-1.5 uppercase focus:ring-1 focus:ring-blue-500 outline-none" />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Apellidos Completos <span className="text-red-500">*</span></label>
                            <input type="text" name="apellidos" value={formData.apellidos} onChange={handleChange} className="w-full border border-gray-300 rounded px-2 py-1.5 uppercase focus:ring-1 focus:ring-blue-500 outline-none" />
                        </div>
                    </div>

                    {/* FILA 3: Teléfono, Email, Dirección (3 columnas) */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Celular / Teléfono</label>
                            <input type="text" name="telefono" value={formData.telefono} onChange={handleChange} className="w-full border border-gray-300 rounded px-2 py-1.5 focus:ring-1 focus:ring-blue-500 outline-none" />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Email</label>
                            <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full border border-gray-300 rounded px-2 py-1.5 lowercase focus:ring-1 focus:ring-blue-500 outline-none" />
                        </div>
                        <div>
                            <label className="block text-xs text-gray-500 mb-1">Dirección</label>
                            <input type="text" name="direccion" value={formData.direccion} onChange={handleChange} className="w-full border border-gray-300 rounded px-2 py-1.5 focus:ring-1 focus:ring-blue-500 outline-none" />
                        </div>
                    </div>
                </div>

                <div className="mt-4 flex justify-end gap-2">
                    <button type="button" onClick={handleSubmit} disabled={loading} className="bg-green-600 text-white px-6 py-1.5 rounded hover:bg-green-700 shadow flex items-center gap-2">
                        {loading ? "Guardando..." : <><FontAwesomeIcon icon={faSave} /> {existeEnBD ? "Vincular" : "Guardar"}</>}
                    </button>
                </div>
            </div>
        );
    }

    // --- VISTA: LISTA DE ACUDIENTES ---
    return (
        <div className="space-y-4 animate-fade-in">
            <div className="flex justify-between items-center border-b border-gray-300 pb-2">
                <h3 className="font-semibold text-gray-800">Acudientes Asignados</h3>
                <button onClick={() => setModoFormulario(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded text-sm font-medium shadow-sm transition-all flex items-center gap-2">
                    <FontAwesomeIcon icon={faUserPlus} /> Agregar
                </button>
            </div>

            {!estudiante.acudientes || estudiante.acudientes.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded border border-dashed border-gray-300">
                    <p className="text-gray-500 text-md font-stretch-50%">No hay acudientes asociados a este estudiante.</p>
                </div>
            ) : (
                <div className="grid gap-3 md:grid-cols-2">
                    {estudiante.acudientes.map((acu) => {
                        // ACCEDEMOS A LA IDENTIDAD UNIFICADA
                        const identidad = acu.identidad || {};

                        return (
                            <div key={acu.id} className="flex flex-col justify-between p-3 bg-white border border-gray-200 rounded shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-700 font-bold text-xs border border-indigo-100">
                                            {acu.acudiente_estudiantes?.afinidad?.substring(0, 2) || "NA"}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-gray-800 uppercase">
                                                {identidad.apellidos} {identidad.nombre}
                                            </p>
                                            <p className="text-xs text-gray-500">
                                                {acu.tipoDocumento} {identidad.documento}
                                            </p>
                                        </div>
                                    </div>
                                    <span className="text-[10px] font-bold tracking-wide text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                                        {acu.acudiente_estudiantes?.afinidad}
                                    </span>
                                </div>

                                <div className="mt-3 pt-2 border-t border-gray-100 flex justify-between items-center">
                                    <div className="text-xs text-gray-500 flex flex-col">
                                        <span>📞 {identidad.telefono || "Sin teléfono"}</span>
                                        <span>📧 {identidad.email || "Sin email"}</span>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.preventDefault(); e.stopPropagation();
                                            handleDesvincular(acu.id);
                                        }}
                                        disabled={loading}
                                        className="text-gray-400 hover:text-red-600 p-2 transition-colors rounded hover:bg-red-50"
                                        title="Desvincular acudiente"
                                    >
                                        <FontAwesomeIcon icon={faTrash} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default AcudientesTab;