import React, { useState, useEffect, useCallback, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCalendarAlt, faEdit, faTrash, faCheckCircle, faTimesCircle } from "@fortawesome/free-solid-svg-icons";
import { fetchVigencias, crearVigencia, actualizarVigencia, eliminarVigencia, cerrarVigencia, abrirVigencia } from "../../api/vigenciasService.js";
import { showSuccess, showError, showWarning, showConfirm } from "../../utils/notifications.js";
import VigenciasForm from "./VigenciasForm.jsx";

const Vigencias = () => {
    const initialFormState = { id: null, anio: "", fechaInicio: "", fechaFin: "", activa: false };
    const [formData, setFormData] = useState(initialFormState);
    const [vigencias, setVigencias] = useState([]);
    const [mode, setMode] = useState("agregar");
    const [loading, setLoading] = useState(false);
    const formContainerRef = useRef(null);

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            const data = await fetchVigencias();
            setVigencias(data);
        } catch (err) {
            showError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadData(); }, [loadData]);

    const validateForm = () => {
        const { anio, fechaInicio, fechaFin } = formData;
        if (!anio || !fechaInicio || !fechaFin) return "Todos los campos obligatorios (<span class='text-[#e74c3c]'>*</span>) deben completarse.";

        const yearInt = parseInt(anio);
        if (new Date(fechaInicio).getUTCFullYear() !== yearInt || new Date(fechaFin).getUTCFullYear() !== yearInt) {
            return `Las fechas deben pertenecer al año lectivo ${yearInt}.`;
        }
        if (new Date(fechaInicio) >= new Date(fechaFin)) return "La fecha de inicio debe ser anterior a la de finalización.";
        return null;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const error = validateForm();
        if (error) return showWarning(error);

        try {
            setLoading(true);
            if (mode === "agregar") {
                const nueva = await crearVigencia(formData);
                setVigencias(prev => [...prev, nueva]);
                showSuccess(`Año lectivo <b>${nueva.anio}</b> creado.`);
            } else {
                const actualizada = await actualizarVigencia(formData.id, formData);
                setVigencias(prev => prev.map(v => v.id === formData.id ? actualizada : v));
                showSuccess(`Vigencia <b>${actualizada.anio}</b> actualizada.`);
            }
            resetForm();
        } catch (err) {
            showError(err.response?.data?.message || err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (v) => {
        setFormData(v);
        setMode("editar");
        formContainerRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const handleDelete = async (vigencia) => {
        const confirmed = await showConfirm(
            `¿Está seguro de eliminar el año lectivo <b>${vigencia.anio}</b>?<br>Esta acción no se puede deshacer.`,
            "Confirmar eliminación"
        );

        if (!confirmed) return;

        try {
            setLoading(true);
            await eliminarVigencia(vigencia.id, vigencia.anio);
            setVigencias((prev) => prev.filter((v) => v.id !== vigencia.id));
            showSuccess(`El año lectivo <b>${vigencia.anio}</b> fue eliminado.`);
            if (formData.id === vigencia.id) resetForm();
        } catch (err) {
            showError(err.message || "No se pudo eliminar el año lectivo.");
        } finally {
            setLoading(false);
        }
    };

    // Función para Abrir/Cerrar rápido (Acción de un solo click)
    const handleToggleActiva = async (vigencia) => {
        const accion = vigencia.activa ? "cerrar" : "abrir";
        const confirmed = await showConfirm(
            `¿Desea ${accion} el año lectivo <b>${vigencia.anio}</b>?`,
            `${accion.charAt(0).toUpperCase() + accion.slice(1)} vigencia`
        );

        if (!confirmed) return;

        try {
            setLoading(true);
            let actualizada;
            if (vigencia.activa) {
                actualizada = await cerrarVigencia(vigencia.id);
            } else {
                actualizada = await abrirVigencia(vigencia.id);
            }

            // Refrescamos la lista para que solo uno quede activo
            const data = await fetchVigencias();
            setVigencias(data);
            showSuccess(`Año lectivo ${actualizada.anio} ${vigencia.activa ? 'cerrado' : 'abierto'} con éxito.`);
        } catch (err) {
            showError(err.message || "Error al cambiar el estado de la vigencia.");
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => { setFormData(initialFormState); setMode("agregar"); };

    return (
        <div className="min-h-full bg-[#f7f9fc] p-4 md:p-8 rounded-xl font-inter">
            <div className="max-w-7xl mx-auto space-y-8">
                <h1 className="text-2xl font-bold flex items-center text-slate-800">
                    <FontAwesomeIcon icon={faCalendarAlt} className="mr-3 text-blue-600" />
                    Configuración de Años Lectivos (Vigencias)
                </h1>

                <div ref={formContainerRef}>
                    <VigenciasForm
                        formData={formData} setFormData={setFormData}
                        mode={mode} loading={loading}
                        handleSubmit={handleSubmit} resetForm={resetForm}
                    />
                </div>

                <div className="bg-white rounded-xl shadow-lg p-6">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Año</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Inicio / Fin</th>
                                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {vigencias.map((v) => (
                                    <tr key={v.id} className="hover:bg-blue-50 transition-colors">
                                        <td className="px-4 py-4 font-bold text-gray-900">{v.anio}</td>
                                        <td className="px-4 py-4 text-sm text-gray-600">{v.fechaInicio} a {v.fechaFin}</td>
                                        <td className="px-4 py-4">
                                            <button
                                                onClick={() => handleToggleActiva(v)}
                                                title={v.activa ? "Click para cerrar" : "Click para abrir"}
                                            >
                                                {v.activa ? (
                                                    <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-bold flex items-center hover:bg-green-200 transition">
                                                        <FontAwesomeIcon icon={faCheckCircle} className="mr-1" /> ABIERTO
                                                    </span>
                                                ) : (
                                                    <span className="bg-gray-100 text-gray-500 px-2 py-1 rounded-full text-xs font-bold flex items-center hover:bg-gray-200 transition">
                                                        <FontAwesomeIcon icon={faTimesCircle} className="mr-1" /> CERRADO
                                                    </span>
                                                )}
                                            </button>
                                        </td>
                                        <td className="px-4 py-4 text-right space-x-2">
                                            <button onClick={() => handleEdit(v)} title="Editar" className="text-blue-600 hover:scale-110 transition-transform"><FontAwesomeIcon icon={faEdit} size="lg" /></button>
                                            <button onClick={() => handleDelete(v)} className="text-red-600 hover:scale-110 transition-transform"><FontAwesomeIcon icon={faTrash} size="lg" /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Vigencias;