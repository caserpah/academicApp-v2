import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faSave, faTimes, faSearch, faEye, faIdCard, faUser, faMapMarkerAlt, faPhone, faTrash
} from "@fortawesome/free-solid-svg-icons";

const MatriculasForm = ({
    formData,
    mode,
    loading,        // Spinner global del formulario (guardando)
    loadingGrupos,  // Spinner específico del select de grupos
    handleChange,
    handleSubmit,
    resetForm,
    listas = { sedes: [], grupos: [] },
    onBuscarEstudiante,
    onDeselectStudent
}) => {

    // Estado local para el input del buscador
    const [busquedaTemp, setBusquedaTemp] = useState("");

    const [mostrarDetalle, setMostrarDetalle] = useState(false); // Estado para el modal con la información del estudiante

    const inputBaseClasses = "mt-1 block w-full border border-gray-300 rounded-lg shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500 transition duration-150";
    const getInputClasses = (readOnly) => readOnly ? `${inputBaseClasses} bg-gray-100 cursor-not-allowed text-gray-700` : inputBaseClasses;

    // Helper para mostrar info si existe el estudiante
    const est = formData.estudiante;

    // Helper para limpiar textos
    const formatTexto = (texto) => {
        if (!texto) return "";
        return texto
            .replace(/_/g, " ")          // Cambia todos los guiones bajos por espacios
            .replace("MANANA", "MAÑANA"); // Corrige la ñ
    };

    return (
        <>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">
                    <div className="border-b pb-2 mb-4 border-[#d8d5d5]">
                        <h3 className="text-lg font-semibold text-gray-700">{mode === "agregar" ? "Registrar Nueva Matrícula" : "Editar Matrícula"}</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                        {/* -- ESTUDIANTE -- */}
                        <div className="col-span-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Estudiante <span className="text-red-500">*</span>
                            </label>

                            {/* Buscador (Solo en modo agregar) */}
                            {mode === "agregar" && (
                                <div className="flex gap-2 mb-3">
                                    <input
                                        type="text"
                                        placeholder="Buscar por documento o nombre..."
                                        className={getInputClasses(false)}
                                        value={busquedaTemp}
                                        onChange={(e) => setBusquedaTemp(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), onBuscarEstudiante(busquedaTemp))}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => onBuscarEstudiante(busquedaTemp)}
                                        className="bg-blue-600 text-white px-3 rounded-lg hover:bg-blue-700 transition shadow-sm"
                                        title="Buscar"
                                    >
                                        <FontAwesomeIcon icon={faSearch} />
                                    </button>
                                </div>
                            )}

                            {/* TARJETA DE INFORMACIÓN DEL ESTUDIANTE */}
                            {est ? (
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex justify-between items-center">
                                    <div className="flex-1">
                                        <p className="text-sm font-bold text-blue-800">
                                            {est.primerApellido} {est.segundoApellido} {est.primerNombre} {est.segundoNombre}
                                        </p>
                                        <p className="text-xs text-blue-600 flex items-center mt-1">
                                            <FontAwesomeIcon icon={faIdCard} className="mr-1" />
                                            {est.tipoDocumento}: {est.documento}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setMostrarDetalle(true)}
                                            className="bg-white text-blue-600 hover:text-blue-800 border border-blue-200 hover:bg-blue-50 px-3 py-1 rounded text-xs font-semibold transition flex items-center shadow-sm"
                                        >
                                            <FontAwesomeIcon icon={faEye} className="mr-1" /> Ver detalle
                                        </button>

                                        {mode === "agregar" && (
                                            <button
                                                type="button"
                                                onClick={onDeselectStudent}
                                                className="text-red-500 hover:bg-red-100 p-2 rounded-lg transition"
                                                title="Quitar estudiante"
                                            >
                                                <FontAwesomeIcon icon={faTrash} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="bg-gray-50 border border-gray-200 border-dashed rounded-lg p-3 text-center text-sm text-gray-400">
                                    No se ha seleccionado estudiante
                                </div>
                            )}

                            {/* Input oculto para enviar el ID */}
                            <input type="hidden" name="estudianteId" value={formData.estudianteId || ""} />
                        </div>

                        {/* -- SEDE -- */}
                        <div className="col-span-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Sede <span className="text-red-500">*</span>
                            </label>
                            <select
                                name="sedeId"
                                value={formData.sedeId || ""}
                                onChange={handleChange}
                                className={getInputClasses()}
                            >
                                <option value="">Seleccione Sede...</option>
                                {listas.sedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                            </select>
                        </div>

                        {/* -- GRUPO -- */}
                        <div className="col-span-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Grupo <span className="text-red-500">*</span>
                            </label>
                            <select
                                name="grupoId"
                                value={formData.grupoId || ""}
                                onChange={handleChange}
                                className={getInputClasses()}
                                disabled={!formData.sedeId || loadingGrupos} // Se deshabilita si carga
                            >
                                <option value="">
                                    {!formData.sedeId
                                        ? "Seleccione Sede primero..."
                                        : (loadingGrupos
                                            ? "⏳ Cargando grupos..."
                                            : (listas.grupos.length === 0 ? "⚠️ No hay grupos en esta sede" : "Seleccione Grupo..."))
                                    }
                                </option>
                                {listas.grupos.map(g => (
                                    <option key={g.id} value={g.id}>
                                        {/* GRADO - GRUPO (JORNADA) | NIVEL */}
                                        {g.grado ? `${formatTexto(g.grado.nombre)} - ` : ""} {g.nombre} | Jornada: {formatTexto(g.jornada)}
                                        {g.grado?.nivelAcademico ? ` | ${formatTexto(g.grado.nivelAcademico)}` : ""}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* -- METODOLOGÍA -- */}
                        <div className="col-span-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Metodología</label>
                            <select
                                name="metodologia"
                                value={formData.metodologia || "TRADICIONAL"}
                                onChange={handleChange}
                                className={getInputClasses()}
                            >
                                <option value="TRADICIONAL">Tradicional</option>
                                <option value="ETNOEDUCACION">Etnoeducación</option>
                                <option value="ESCUELA_NUEVA">Escuela Nueva</option>
                                <option value="ACELERACION_APRENDIZAJE">Aceleración del Aprendizaje</option>
                            </select>
                        </div>

                        {/* -- ESTADO -- */}
                        <div className="col-span-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                            <select
                                name="estado"
                                value={formData.estado || "PREMATRICULADO"}
                                onChange={handleChange}
                                className={getInputClasses(mode === "agregar")}
                                disabled={mode === "agregar"}
                            >
                                <option value="PREMATRICULADO">Prematriculado</option>
                                <option value="ACTIVA">Activa</option>
                                <option value="RETIRADO">Retirado</option>
                                <option value="PROMOVIDO">Promovido</option>
                            </select>
                        </div>

                        {/* -- OBSERVACIONES -- */}
                        <div className="col-span-1 md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
                            <textarea
                                name="observaciones"
                                value={formData.observaciones || ""}
                                onChange={handleChange}
                                rows="2"
                                className={getInputClasses()}
                            />
                        </div>
                    </div>

                    <div className="pt-4 flex justify-center space-x-3 border-t border-[#eee] mt-6">
                        <button type="submit" disabled={loading} className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 transition flex items-center shadow-md">
                            <FontAwesomeIcon icon={faSave} className="mr-2" /> {mode === "agregar" ? "Guardar" : "Guardar Cambios"}
                        </button>
                        <button type="button" onClick={resetForm} disabled={loading} className="bg-red-500 text-white px-5 py-2 rounded-lg hover:bg-red-600 transition flex items-center shadow-md">
                            <FontAwesomeIcon icon={faTimes} className="mr-2" /> Cancelar
                        </button>
                    </div>
                </div>
            </form>

            {/* --- MODAL DE DETALLE DEL ESTUDIANTE --- */}
            {mostrarDetalle && est && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in-up">
                        {/* Header del Modal */}
                        <div className="bg-gray-600 px-6 py-4 flex justify-between items-center">
                            <h3 className="text-white text-lg font-bold flex items-center gap-2">
                                <FontAwesomeIcon icon={faUser} /> Información del Estudiante
                            </h3>
                            <button onClick={() => setMostrarDetalle(false)} className="text-blue-100 hover:text-white transition">
                                <FontAwesomeIcon icon={faTimes} size="lg" />
                            </button>
                        </div>

                        {/* Body del Modal */}
                        <div className="p-6 space-y-4 text-sm text-gray-700">
                            <div className="flex flex-col items-center pb-4 border-b">
                                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-2xl font-bold mb-2">
                                    {est.primerNombre?.charAt(0)}{est.primerApellido?.charAt(0)}
                                </div>
                                <h4 className="text-xl font-bold text-gray-800">
                                    {est.primerNombre} {est.segundoNombre} {est.primerApellido} {est.segundoApellido}
                                </h4>
                                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-semibold mt-1">
                                    {est.estado || "ACTIVO"}
                                </span>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs text-gray-400 uppercase font-bold">Documento</p>
                                    <p className="font-medium">{est.tipoDocumento} - {est.documento}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400 uppercase font-bold">Fecha Nacimiento</p>
                                    <p className="font-medium">{est.fechaNacimiento || "No registrada"}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400 uppercase font-bold">Sexo</p>
                                    <p className="font-medium">{est.sexo || "No registrado"}</p>
                                </div>
                                <div>
                                    <p className="text-xs text-gray-400 uppercase font-bold">RH</p>
                                    <p className="font-medium">{est.rh || "N/A"}</p>
                                </div>
                                <div className="col-span-2">
                                    <p className="text-xs text-gray-400 uppercase font-bold flex items-center gap-1">
                                        <FontAwesomeIcon icon={faMapMarkerAlt} /> Dirección
                                    </p>
                                    <p className="font-medium">{est.direccion || "Sin dirección"}</p>
                                </div>
                                <div className="col-span-2">
                                    <p className="text-xs text-gray-400 uppercase font-bold flex items-center gap-1">
                                        <FontAwesomeIcon icon={faPhone} /> Contacto
                                    </p>
                                    <p className="font-medium">
                                        {est.telefono || est.contacto || "Sin contacto"}
                                        {est.email && <span className="block text-blue-500">{est.email}</span>}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Footer del Modal */}
                        <div className="bg-gray-50 px-6 py-3 flex justify-end">
                            <button
                                onClick={() => setMostrarDetalle(false)}
                                className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition text-sm font-medium"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default MatriculasForm;