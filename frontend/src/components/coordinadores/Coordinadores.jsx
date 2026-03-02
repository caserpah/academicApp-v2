import React, { useState, useEffect, useRef } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faUserTie, faEdit, faTrash } from "@fortawesome/free-solid-svg-icons";

import {
    fetchInitialData,
    crearCoordinador,
    actualizarCoordinador,
    eliminarCoordinador
} from "../../api/coordinadoresService.js";

import { showSuccess, showError, showConfirm, showWarning } from "../../utils/notifications.js";
import LoadingSpinner from "../common/LoadingSpinner.jsx";
import CoordinadoresForm from "./CoordinadoresForm.jsx";

const Coordinadores = () => {
    // Estado del Formulario
    const initialFormState = {
        id: null,
        documento: "",
        nombre: "",
        email: "",
        telefono: "",
        direccion: "",
        asignaciones: [] // Array: { sedeId, vigenciaId, tipo, jornada }
    };

    const [formData, setFormData] = useState(initialFormState);
    const [coordinadores, setCoordinadores] = useState([]);
    const [sedes, setSedes] = useState([]);
    const [vigencias, setVigencias] = useState([]);

    const [mode, setMode] = useState("agregar"); // agregar | editar
    const [loading, setLoading] = useState(false);
    const formRef = useRef(null);

    // Carga inicial
    useEffect(() => {
        const load = async () => {
            try {
                setLoading(true);
                const data = await fetchInitialData();
                setCoordinadores(data.coordinadores);
                setSedes(data.sedes);
                setVigencias(data.vigencias);
            } catch (err) {
                showError(err.message);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, []);

    // Manejar cambios en inputs simples
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // Manejar cambios en la lista de asignaciones (viene del hijo)
    const handleAsignacionChange = (nuevasAsignaciones) => {
        setFormData(prev => ({ ...prev, asignaciones: nuevasAsignaciones }));
    };

    // Submit
    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validación básica frontend
        if (!formData.documento || !formData.nombre) {
            return showWarning("Todos los campos obligatorios (<span class='text-[#e74c3c]'>*</span>) deben completarse.");
        }

        try {
            setLoading(true);
            if (mode === "agregar") {
                const { id, ...payload } = formData;
                const nuevo = await crearCoordinador(payload);
                setCoordinadores([...coordinadores, nuevo]);
                showSuccess("Coordinador registrado exitosamente.");
            } else {
                const actualizado = await actualizarCoordinador(formData.id, formData);
                setCoordinadores(prev => prev.map(c => c.id === formData.id ? actualizado : c));
                showSuccess("Coordinador actualizado exitosamente.");
            }
            resetForm();
        } catch (err) {
            console.error(err);
            showError(err.response?.data?.message || err.message);
        } finally {
            setLoading(false);
        }
    };

    /**
     * Preparar Edición
     * Transforma la estructura anidada de Sequelize a la estructura plana del Formulario
     */
    const handleEdit = (coord) => {
        // Mapeamos las sedes asociadas para aplanar la estructura
        const asignacionesFormateadas = coord.sedes ? coord.sedes.map(s => {

            // Intentamos obtener los datos intermedios de forma segura
            const intermedia = s.coordinador_sedes || s.CoordinadorSedes || s.dataValues?.coordinador_sedes || {};

            return {
                sedeId: s.id,
                vigenciaId: intermedia.vigenciaId, // Dato vital para el select de año lectivo
                tipo: intermedia.tipo,             // Dato vital para el select de rol
                jornada: intermedia.jornada,       // Dato vital para el select de jornada
                tempId: Date.now() + Math.random() // ID temporal único para manejo en frontend
            };
        }) : [];

        setFormData({
            ...coord,
            asignaciones: asignacionesFormateadas
        });

        setMode("editar");

        // Scroll suave hacia el formulario
        if (formRef.current) {
            formRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    };

    // Eliminar
    const handleDelete = async (id) => {
        const confirm = await showConfirm("Esta acción eliminará permanentemente al coordinador y sus datos asociados.", "¿Eliminar Coordinador?");
        if (!confirm) return;

        try {
            setLoading(true);
            await eliminarCoordinador(id);
            setCoordinadores(prev => prev.filter(c => c.id !== id));
            showSuccess("Coordinador eliminado exitosamente.");
            if (formData.id === id) resetForm();
        } catch (err) {
            showError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setFormData(initialFormState);
        setMode("agregar");
    };

    return (
        <div className="min-h-full bg-[#f7f9fc] p-4 md:p-8 font-inter rounded-xl">
            <div className="max-w-7xl mx-auto space-y-8">
                <h1 className="text-2xl font-bold flex items-center text-slate-800">
                    <FontAwesomeIcon icon={faUserTie} className="text-2xl text-blue-600 mr-3" />
                    Gestión de Coordinadores
                </h1>

                {/* FORMULARIO */}
                <div ref={formRef}>
                    <CoordinadoresForm
                        formData={formData}
                        mode={mode}
                        loading={loading}
                        sedes={sedes}
                        vigencias={vigencias}
                        handleChange={handleChange}
                        handleAsignacionChange={handleAsignacionChange}
                        handleSubmit={handleSubmit}
                        resetForm={resetForm}
                    />
                </div>

                {/* TABLA LISTADO */}
                <div className="bg-white rounded-xl shadow-lg p-6">
                    <h2 className="text-xl font-semibold text-gray-700 mb-4">Coordinadores registrados</h2>

                    {loading && coordinadores.length === 0 ? (
                        <LoadingSpinner />
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Documento</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Asignaciones</th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {coordinadores.map((c) => (
                                        <tr key={c.id} className="hover:bg-blue-50">
                                            <td className="px-4 py-3 text-sm text-gray-700">{c.documento}</td>
                                            <td className="px-4 py-3 text-sm font-medium text-gray-900">{c.nombre}</td>
                                            <td className="px-4 py-3 text-sm text-gray-600">{c.email || '-'}</td>
                                            <td className="px-4 py-3 text-sm text-gray-600">
                                                {/* Mostrar las sedes asignadas */}
                                                {c.sedes && c.sedes.length > 0 ? (
                                                    <div className="flex flex-wrap gap-1">
                                                        {c.sedes.map((sede, i) => (
                                                            <span
                                                                key={i}
                                                                className="bg-blue-50 text-blue-700 border border-blue-100 py-0.5 px-2 rounded-md text-xs font-medium"
                                                            >
                                                                {sede.nombre}
                                                            </span>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400 italic text-xs">
                                                        Sin asignación
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-right space-x-2">
                                                <button onClick={() => handleEdit(c)} title="Editar" className="text-blue-600 hover:bg-blue-100 p-2 rounded-full transition">
                                                    <FontAwesomeIcon icon={faEdit} />
                                                </button>
                                                <button onClick={() => handleDelete(c.id)} title="Eliminar" className="text-red-600 hover:bg-red-100 p-2 rounded-full transition">
                                                    <FontAwesomeIcon icon={faTrash} />
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                    {coordinadores.length === 0 && (
                                        <tr>
                                            <td colSpan="5" className="px-4 py-4 text-center text-gray-500">No hay coordinadores registrados.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Coordinadores;