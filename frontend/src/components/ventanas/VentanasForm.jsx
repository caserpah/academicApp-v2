import React, { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSave, faTimes, faCalendarCheck } from "@fortawesome/free-solid-svg-icons";
import { fetchVentanasCatalogs } from "../../api/ventanaCalificacionService.js";
import { showWarning, showError } from "../../utils/notifications.js";

const VentanasForm = ({
    selectedVentana,
    onSuccess,
    onCancel,
    crearAPI,
    actualizarAPI
}) => {
    const [formData, setFormData] = useState({
        periodo: "",
        fechaInicio: "",
        fechaFin: "",
        habilitada: true,
        descripcion: "",
        vigenciaId: ""
    });

    const [catalogos, setCatalogos] = useState({ vigencias: [] });
    const [loading, setLoading] = useState(false);

    const inputClasses = "w-full border border-gray-300 rounded-md p-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition disabled:bg-gray-100";
    const labelClasses = "block text-sm font-medium text-gray-700 mb-1";

    useEffect(() => {
        const init = async () => {
            setLoading(true);
            try {
                const cats = await fetchVentanasCatalogs();
                setCatalogos(cats);

                if (selectedVentana) {
                    setFormData({
                        periodo: selectedVentana.periodo,
                        fechaInicio: selectedVentana.fechaInicio,
                        fechaFin: selectedVentana.fechaFin,
                        habilitada: selectedVentana.habilitada,
                        descripcion: selectedVentana.descripcion || "",
                        vigenciaId: selectedVentana.vigenciaId
                    });
                }
            } catch {
                showError("Error al cargar datos iniciales.");
            } finally {
                setLoading(false);
            }
        };
        init();
    }, [selectedVentana]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validaciones Manuales
        if (!formData.periodo || !formData.fechaInicio || !formData.fechaFin) {
            return showWarning("Complete los campos obligatorios.");
        }

        if (new Date(formData.fechaInicio) > new Date(formData.fechaFin)) {
            return showWarning("La fecha de inicio no puede ser mayor a la de fin.");
        }

        try {
            setLoading(true);
            if (selectedVentana) {
                await actualizarAPI(selectedVentana.id, formData);
            } else {
                await crearAPI(formData);
            }
            onSuccess();
        } catch (error) {
            showError(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl flex flex-col">

                {/* Header */}
                <div className="flex justify-between items-center p-5 border-b bg-gray-50 rounded-t-lg">
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <FontAwesomeIcon icon={faCalendarCheck} className="text-indigo-600" />
                        {selectedVentana ? `Editar Ventana - Periodo ${selectedVentana.periodo}` : "Nueva Ventana de Calificación"}
                    </h2>
                    <button onClick={onCancel} className="text-gray-400 hover:text-red-500 transition">
                        <FontAwesomeIcon icon={faTimes} size="lg" />
                    </button>
                </div>

                {/* Body */}
                <div className="p-6">
                    <form id="ventana-form" onSubmit={handleSubmit} className="space-y-5">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className={labelClasses}>Periodo Académico <span className="text-red-500">*</span></label>
                                <select name="periodo" value={formData.periodo} onChange={handleChange} className={inputClasses} required>
                                    <option value="">-- Seleccione --</option>
                                    {[1, 2, 3, 4].map(p => <option key={p} value={p}>Periodo {p}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className={labelClasses}>Año Lectivo (Opcional)</label>
                                <select name="vigenciaId" value={formData.vigenciaId} onChange={handleChange} className={inputClasses}>
                                    <option value="">-- Usar Activo --</option>
                                    {catalogos.vigencias.map(v => <option key={v.id} value={v.id}>{v.anio}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-blue-50/50 p-4 rounded-lg border border-blue-100">
                            <div>
                                <label className={labelClasses}>Fecha de Apertura <span className="text-red-500">*</span></label>
                                <input type="date" name="fechaInicio" value={formData.fechaInicio} onChange={handleChange} className={inputClasses} required />
                            </div>
                            <div>
                                <label className={labelClasses}>Fecha de Cierre <span className="text-red-500">*</span></label>
                                <input type="date" name="fechaFin" value={formData.fechaFin} onChange={handleChange} className={inputClasses} required />
                            </div>
                        </div>

                        <div>
                            <label className={labelClasses}>Descripción / Observaciones</label>
                            <textarea name="descripcion" value={formData.descripcion} onChange={handleChange} className={inputClasses} rows="2" placeholder="Ej: Primer periodo ordinario..."></textarea>
                        </div>

                        {/* <div className="flex items-center gap-2 p-2 bg-gray-50 rounded-md">
                            <input type="checkbox" name="habilitada" id="habilitada" checked={formData.habilitada} onChange={handleChange} className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded" />
                            <label htmlFor="habilitada" className="text-sm font-semibold text-gray-700 cursor-pointer select-none">
                                Habilitar ventana (Permite el acceso a docentes si está en fechas)
                            </label>
                        </div> */}
                    </form>
                </div>

                {/* Footer */}
                <div className="p-5 border-t flex justify-end gap-3">
                    <button type="button" onClick={onCancel} className="bg-red-500 text-white px-5 py-2 rounded-lg hover:bg-red-600 transition flex items-center shadow-md">
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        form="ventana-form"
                        disabled={loading}
                        className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-md flex items-center gap-2 disabled:opacity-50"
                    >
                        <FontAwesomeIcon icon={faSave} />
                        {selectedVentana ? "Actualizar" : "Guardar Ventana"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default VentanasForm;