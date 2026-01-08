import React, { useState, useEffect, useCallback, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { fetchColegio, actualizarColegio } from "../../api/colegiosService.js";
import { showNotification } from "../../utils/notifications.js";
import LoadingSpinner from "../common/LoadingSpinner.jsx";
import ColegiosForm from "./ColegiosForm.jsx";

const Colegios = () => {
    // ===============================
    // ESTADOS PRINCIPALES
    // ===============================
    const initialFormData = {
        id: null,
        registroDane: "",
        nombre: "",
        email: "",
        contacto: "",
        direccion: "",
        ciudad: "",
        departamento: "",
        resolucion: "",
        fechaResolucion: "",
        promocion: "",
        fechaPromocion: "",
        secretaria: "",
        ccSecretaria: "",
        director: "",
        ccDirector: "",
    };

    const [formData, setFormData] = useState(initialFormData);
    const [originalData, setOriginalData] = useState(initialFormData);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);

    const firstEditableInputRef = useRef(null);

    // ===============================
    // CARGAR DATOS DEL COLEGIO
    // ===============================
    const loadColegioData = useCallback(async () => {
        setLoading(true);
        try {
            const { colegio } = await fetchColegio();
            setFormData(colegio);
            setOriginalData(colegio);
        } catch (err) {
            console.error("Error al obtener colegio:", err);
            showNotification(
                "Error de Carga",
                err.message || "No se pudo cargar la información del colegio principal.",
                "error"
            );
            setFormData((prev) => ({ ...prev, id: null }));
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadColegioData();
    }, [loadColegioData]);

    // ===============================
    // MANEJO DE FORMULARIO
    // ===============================
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        setLoading(true);
        try {
            const { id, ...dataToUpdate } = formData;
            if (!id) throw new Error("ID de colegio no encontrado para la actualización.");

            const updatedData = await actualizarColegio(id, dataToUpdate);

            setFormData(updatedData);
            setOriginalData(updatedData);
            setIsEditing(false);

            showNotification(
                "Operación Exitosa",
                `La información de la IE. <b>${updatedData.nombre}</b> ha sido actualizada correctamente.`,
                "success"
            );
        } catch (error) {
            console.error("Error al actualizar colegio:", error);
            showNotification(
                "Error",
                error.message || "Error al actualizar la información del colegio.",
                "error"
            );
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        setFormData(originalData);
        setIsEditing(false);
    };

    // ===============================
    // RENDER
    // ===============================
    if (loading) {
        return <LoadingSpinner message="Cargando datos de la institución..." />;
    }

    return (
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
            <div className="flex justify-between items-center mb-6 border-b pb-4">
                <h1 className="text-2xl font-semibold text-[#2c3e50] flex items-center mb-2 md:mb-0">
                    <FontAwesomeIcon icon="fa-school" className="w-6 h-6 mr-3 text-[#2c3e50]" />
                    Gestión de la Institución Principal
                </h1>

                {!isEditing && formData.id && (
                    <button
                        onClick={() => {
                            setIsEditing(true);
                            setTimeout(() => firstEditableInputRef.current?.focus(), 0);
                        }}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition flex items-center shadow-sm text-sm font-medium"
                        title="Editar Información"
                        disabled={loading}
                    >
                        <FontAwesomeIcon icon="fa-edit" className="mr-2" />
                        Editar Información
                    </button>
                )}
            </div>

            <div className="bg-white shadow-xl rounded-xl p-8">
                <h2 className="text-1xl font-semibold text-gray-800 mb-6 border-b pb-3 flex items-center">
                    <FontAwesomeIcon icon="fa-info-circle" className="w-6 h-6 mr-3 text-[#2c3e50]" />
                    {isEditing
                        ? `Editar Datos de la IE. ${formData.nombre || "la Institución"}`
                        : `Información General de ${formData.nombre || "la Institución"}`}
                </h2>

                {formData.id ? (
                    <ColegiosForm
                        formData={formData}
                        isEditing={isEditing}
                        loading={loading}
                        handleInputChange={handleInputChange}
                        handleSubmit={handleSubmit}
                        handleCancel={handleCancel}
                    />
                ) : (
                    <div className="text-center p-8 bg-red-50 border border-red-200 text-red-700 rounded-lg mt-6">
                        <p className="font-semibold">⚠️ Error al cargar</p>
                        <p>No se pudo cargar la información del colegio principal.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Colegios;