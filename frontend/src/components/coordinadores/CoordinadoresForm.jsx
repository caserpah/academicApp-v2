import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSave, faTimes, faPlus, faTrash } from "@fortawesome/free-solid-svg-icons";

// Definición estática de las jornadas
const JORNADAS_ENUMS = ["MAÑANA", "TARDE", "NOCHE", "COMPLETA"];

const CoordinadoresForm = ({
    formData,
    mode,
    loading,
    sedes,
    vigencias,
    handleChange,
    handleSubmit,
    resetForm,
    handleAsignacionChange // Función que actualiza el estado 'asignaciones' en el padre
}) => {
    const inputClasses = "w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition";

    // Estado local para los inputs de la nueva asignación
    const [nuevaAsig, setNuevaAsig] = useState({
        sedeId: "",
        vigenciaId: "",
        tipo: "ACADEMICO",
        jornada: ""
    });

    // Agregar una asignación a la lista
    const agregarAsignacion = () => {
        // Validaciones simples antes de agregar
        if (!nuevaAsig.sedeId || !nuevaAsig.vigenciaId) return;
        if (nuevaAsig.tipo === "CONVIVENCIA" && !nuevaAsig.jornada) return;

        // Crear objeto de asignación (usamos tempId para key en React)
        const asignacionParaAgregar = {
            ...nuevaAsig,
            tempId: Date.now()
        };

        const listaActualizada = [...(formData.asignaciones || []), asignacionParaAgregar];
        handleAsignacionChange(listaActualizada);

        // Limpiar inputs temporales
        setNuevaAsig({ ...nuevaAsig, sedeId: "", jornada: "" });
    };

    // Eliminar una asignación de la lista
    const eliminarAsignacion = (index) => {
        const listaActualizada = formData.asignaciones.filter((_, i) => i !== index);
        handleAsignacionChange(listaActualizada);
    };

    // Helpers para mostrar nombres en lugar de IDs en la tabla
    const getSedeName = (id) => {
        // Convertimos a Number por si viene como string
        const sede = sedes.find(s => s.id === Number(id));
        return sede ? sede.nombre : "Sede desconocida";
    };

    const getVigenciaName = (id) => {
        if (!id) return "-";
        const vigencia = vigencias.find(v => v.id === Number(id));
        return vigencia ? vigencia.anio : id;
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">

            {/* Datos Personales */}
            <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
                <div className="border-b pb-2 mb-4 border-[#d8d5d5]">
                    <h2 className="text-lg font-semibold text-gray-700">
                        {mode === 'agregar' ? 'Registrar Nuevo Coordinador' : 'Editar Coordinador'}
                    </h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Número de Documento <span className="text-red-500">*</span></label>
                        <input type="text" name="documento" value={formData.documento} placeholder="Máx. 15 dígitos" onChange={handleChange} className={inputClasses} maxLength={15} required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Nombre <span className="text-red-500">*</span></label>
                        <input type="text" name="nombre" value={formData.nombre} placeholder="Nombre completo del Coordinador" onChange={handleChange} className={inputClasses} required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Correo Electrónico</label>
                        <input type="email" name="email" value={formData.email || ""} placeholder="coordinador@colegio.edu.co" onChange={handleChange} className={inputClasses} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Contacto (10-12 dígitos, opcional)</label>
                        <input type="text" name="telefono" value={formData.telefono || ""} placeholder="Teléfono de contacto" onChange={handleChange} className={inputClasses} maxLength={12} />
                    </div>
                    <div className="md:col-span-1">
                        <label className="block text-sm font-medium text-gray-700">Dirección</label>
                        <input type="text" name="direccion" value={formData.direccion || ""} placeholder="Ej: Calle 10 # 5-20" onChange={handleChange} className={inputClasses} />
                    </div>
                </div>
            </div>

            {/* Asignación de Sedes */}
            <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
                <h3 className="text-lg font-semibold text-gray-700 mb-4 border-b pb-2">Asignar Coordinación de Sede</h3>

                {/* Controles para agregar nueva asignación */}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end bg-gray-50 p-4 rounded-lg mb-4">
                    <div className="md:col-span-3">
                        <label className="text-xs font-bold text-gray-500 uppercase">Sede</label>
                        <select
                            value={nuevaAsig.sedeId}
                            onChange={e => setNuevaAsig({ ...nuevaAsig, sedeId: e.target.value })}
                            className={inputClasses}
                            required
                        >
                            <option value="">-- Seleccione Sede --</option>
                            {sedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                        </select>
                    </div>
                    <div className="md:col-span-2">
                        <label className="text-xs font-bold text-gray-500 uppercase">Vigencia</label>
                        <select
                            value={nuevaAsig.vigenciaId}
                            onChange={e => setNuevaAsig({ ...nuevaAsig, vigenciaId: e.target.value })}
                            className={inputClasses}
                            required
                        >
                            <option value="">Año...</option>
                            {/* Mostramos 'anio' en el select también */}
                            {vigencias.map(v => <option key={v.id} value={v.id}>{v.anio}</option>)}
                        </select>
                    </div>
                    <div className="md:col-span-2">
                        <label className="text-xs font-bold text-gray-500 uppercase">Rol</label>
                        <select
                            value={nuevaAsig.tipo}
                            onChange={e => setNuevaAsig({ ...nuevaAsig, tipo: e.target.value })}
                            className={inputClasses}
                            required
                        >
                            <option value="ACADEMICO">Académico</option>
                            <option value="CONVIVENCIA">Convivencia</option>
                        </select>
                    </div>
                    <div className="md:col-span-3">
                        <label className="text-xs font-bold text-gray-500 uppercase">Jornada</label>
                        <select
                            value={nuevaAsig.jornada}
                            onChange={e => setNuevaAsig({ ...nuevaAsig, jornada: e.target.value })}
                            className={inputClasses}
                            disabled={nuevaAsig.tipo === 'ACADEMICO'}
                            requireda={nuevaAsig.tipo === 'CONVIVENCIA'}
                        >
                            <option value="">{nuevaAsig.tipo === 'ACADEMICO' ? 'N/A' : 'Seleccione...'}</option>
                            {JORNADAS_ENUMS.map(j => <option key={j} value={j}>{j}</option>)}
                        </select>
                    </div>
                    <div className="md:col-span-2">
                        <button
                            type="button"
                            onClick={agregarAsignacion}
                            className="w-full bg-green-600 text-white py-2 rounded shadow hover:bg-green-700 transition flex justify-center items-center gap-2"
                        >
                            <FontAwesomeIcon icon={faPlus} /> Asignar
                        </button>
                    </div>
                </div>

                {/* Tabla de asignaciones agregadas */}
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-gray-100 text-gray-600 uppercase font-bold text-xs">
                            <tr>
                                <th className="px-3 py-2 text-left">Sede</th>
                                <th className="px-3 py-2 text-left">Vigencia</th>
                                <th className="px-3 py-2 text-left">Rol</th>
                                <th className="px-3 py-2 text-left">Jornada</th>
                                <th className="px-3 py-2 text-right">Acción</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {formData.asignaciones && formData.asignaciones.length > 0 ? (
                                formData.asignaciones.map((asig, idx) => (
                                    <tr key={asig.tempId || idx} className="hover:bg-gray-50">
                                        <td className="px-3 py-2 text-gray-800">{getSedeName(asig.sedeId)}</td>

                                        {/* Columna VIGENCIA: Usamos el helper corregido */}
                                        <td className="px-3 py-2 font-medium text-gray-700">
                                            {getVigenciaName(asig.vigenciaId)}
                                        </td>

                                        {/* Columna ROL: Lógica de color */}
                                        <td className="px-3 py-2">
                                            <span className={`px-2 py-1 rounded-full text-xs font-semibold 
                                                ${asig.tipo === 'ACADEMICO' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                                                {/* Fallback si tipo es undefined */}
                                                {asig.tipo || "Sin asignar"}
                                            </span>
                                        </td>

                                        <td className="px-3 py-2 text-gray-600">
                                            {asig.tipo === 'CONVIVENCIA' ? asig.jornada : '-'}
                                        </td>
                                        <td className="px-3 py-2 text-right">
                                            <button
                                                type="button"
                                                onClick={() => eliminarAsignacion(idx)}
                                                className="text-red-500 hover:text-red-700 transition"
                                            >
                                                <FontAwesomeIcon icon={faTrash} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" className="px-3 py-4 text-center text-gray-500 italic">
                                        No hay sedes asignadas. Añada una arriba.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Botones de Acción (Sin cambios) */}
            <div className="flex justify-center space-x-4 pt-4 border-t border-gray-200">
                <button
                    type="submit"
                    disabled={loading}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg shadow hover:bg-blue-700 transition flex items-center"
                >
                    <FontAwesomeIcon icon={faSave} className="mr-2" />
                    {mode === 'agregar' ? 'Guardar' : 'Guardar Cambios'}
                </button>
                <button
                    type="button"
                    onClick={resetForm}
                    disabled={loading}
                    className="bg-red-500 text-white px-6 py-2 rounded-lg shadow hover:bg-red-600 transition flex items-center"
                >
                    <FontAwesomeIcon icon={faTimes} className="mr-2" /> Cancelar
                </button>
            </div>
        </form>
    );
};

export default CoordinadoresForm;