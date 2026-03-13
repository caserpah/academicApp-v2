import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import LoadingSpinner from "../common/LoadingSpinner.jsx";
import {
    faSave, faTimes, faSearch, faEye, faIdCard, faUser, faMapMarkerAlt, faPhone,
    faTrash, faLock, faFileAlt, faCalendarAlt, faInfoCircle
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
    onDeselectStudent,
    vigenciaNombre = new Date().getFullYear().toString(),
    onDelete
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

    // ==========================
    // Renderizado del formulario
    // ==========================
    return (
        <>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">

                    {/* --- ENCABEZADO CON ALERTA DE BLOQUEO --- */}
                    <div className="border-b pb-2 mb-4 border-[#d8d5d5] flex justify-between items-center">
                        <h3 className="text-lg font-semibold text-gray-700">
                            {mode === "agregar" ? "Registrar Nueva Matrícula" : "Editar Matrícula"}
                        </h3>

                        {/* Indicador visual si está bloqueado */}
                        {formData.bloqueo_notas && (
                            <span className="bg-red-100 text-red-600 px-3 py-1 rounded-full text-xs font-bold flex items-center animate-pulse">
                                <FontAwesomeIcon icon={faLock} className="mr-1" /> BLOQUEADO ACADÉMICAMENTE
                            </span>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

                        {/* ==============================================================
                            SECCIÓN 1: DATOS ADMINISTRATIVOS (Año, Folio, Sede, Grupo)
                           ============================================================== */}

                        {/* Año Lectivo */}
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                <FontAwesomeIcon icon={faCalendarAlt} className="mr-1" />
                                Año Lectivo <span className="text-red-500"> *</span>
                            </label>

                            <select
                                name="vigenciaId"
                                value={formData.vigenciaId || ""}
                                onChange={handleChange}
                                className={getInputClasses()}
                                title="Seleccione el año lectivo para esta matrícula"
                            >
                                <option value="">Seleccione...</option>

                                {/* Iteramos las vigencias pasadas desde el padre */}
                                {listas.vigencias && listas.vigencias.length > 0 ? (
                                    listas.vigencias.map(v => (
                                        <option key={v.id} value={v.id}>
                                            {v.anio} {v.activa ? "(Activo)" : ""}
                                        </option>
                                    ))
                                ) : (
                                    /* Fallback visual si no hay lista, muestra el nombre que llega por prop */
                                    <option value={formData.vigenciaId}>{vigenciaNombre}</option>
                                )}
                            </select>
                        </div>

                        {/* Número de Folio (Solo Lectura, visible al editar o si ya se generó) */}
                        <div className="md:col-span-3">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                <FontAwesomeIcon icon={faFileAlt} className="mr-1" />No. Folio
                            </label>
                            <input
                                type="text"
                                value={formData.folio || "Generado autom."}
                                readOnly
                                className={`${getInputClasses(true)} text-gray-500 italic`}
                            />
                        </div>

                        {/* SEDE */}
                        <div className="md:col-span-3">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Sede <span className="text-red-500">*</span>
                            </label>
                            <select
                                name="sedeId"
                                value={formData.sedeId || ""}
                                onChange={handleChange}
                                className={getInputClasses()}
                                required
                                title="Seleccione la sede donde se matricula el estudiante"
                            >
                                <option value="">Seleccione Sede...</option>
                                {listas.sedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                            </select>
                        </div>

                        {/* -- GRUPO -- */}
                        <div className="md:col-span-4">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Grupo <span className="text-red-500">*</span>
                            </label>
                            <select
                                name="grupoId"
                                value={formData.grupoId || ""}
                                onChange={handleChange}
                                className={getInputClasses()}
                                required
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

                        {/* ==============================================================
                            SECCIÓN 2: DATOS DEL ESTUDIANTE
                           ============================================================== */}

                        <div className="md:col-span-12">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Estudiante <span className="text-red-500">*</span>
                            </label>

                            {/* Buscador (Solo en modo agregar) */}
                            {mode === "agregar" && !est && (
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
                                mode === "agregar" && <div className="bg-gray-50 border border-gray-200 border-dashed rounded-lg p-3 text-center text-sm text-gray-400">No se ha seleccionado estudiante</div>
                            )}

                            {/* Input oculto para enviar el ID */}
                            <input type="hidden" name="estudianteId" value={formData.estudianteId || ""} />
                        </div>

                        {/* ==============================================================
                            SECCIÓN 3: INFORMACIÓN ACADÉMICA (Req #4)
                           ============================================================== */}
                        <div className="md:col-span-12 border-t border-gray-100 pt-4 mt-2">
                            <h4 className="text-sm font-bold text-gray-700 mb-3 flex items-center">
                                <FontAwesomeIcon icon={faInfoCircle} className="mr-2 text-blue-500" />
                                Historial Académico
                            </h4>

                            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                                {/* Situación Anterior */}
                                <div className="md:col-span-4">
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Situación Año Anterior</label>
                                    <select
                                        name="situacion_ano_anterior"
                                        value={formData.situacion_ano_anterior || "APROBO"}
                                        onChange={handleChange}
                                        className={getInputClasses()}
                                    >
                                        <option value="NO_ESTUDIO">No Estudió</option>
                                        <option value="APROBO">Aprobó</option>
                                        <option value="REPROBO">Reprobó</option>
                                        <option value="NO_CULMINO">No Culminó Estudios</option>
                                        <option value="SIN_INFO">Sin Información</option>
                                    </select>
                                </div>

                                {/* Checkboxes Nuevo/Repitente */}
                                <div className="md:col-span-8 flex items-end pb-2 space-x-6">
                                    <label className="inline-flex items-center cursor-pointer bg-gray-50 px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-100 transition w-full md:w-auto">
                                        <input
                                            type="checkbox"
                                            name="es_nuevo"
                                            checked={!!formData.es_nuevo}
                                            onChange={handleChange}
                                            className="form-checkbox h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
                                        />
                                        <span className="ml-2 text-sm text-gray-700 font-medium">Es Estudiante Nuevo</span>
                                    </label>

                                    <label className="inline-flex items-center cursor-pointer bg-gray-50 px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-100 transition w-full md:w-auto">
                                        <input
                                            type="checkbox"
                                            name="es_repitente"
                                            checked={!!formData.es_repitente}
                                            onChange={handleChange}
                                            className="form-checkbox h-5 w-5 text-orange-500 rounded focus:ring-orange-500"
                                        />
                                        <span className="ml-2 text-sm text-gray-700 font-medium">Es Repitente</span>
                                    </label>
                                </div>
                            </div>
                        </div>

                        {/* ==============================================================
                            SECCIÓN 4: ESTADO Y CONTROL
                           ============================================================== */}

                        {/* -- METODOLOGÍA -- */}
                        <div className="md:col-span-4">
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
                        <div className="md:col-span-4">
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
                                <option value="ANULADO">Anulado</option>
                                <option value="DESERTADO">Desertado</option>
                                <option value="PROMOVIDO">Promovido</option>
                            </select>
                        </div>

                        {/* Bloqueo de Notas (Switch) */}
                        <div className="md:col-span-4">
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Control de Calificaciones</label>
                            <div
                                className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer transition ${formData.bloqueo_notas ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}
                                onClick={() => {
                                    handleChange({
                                        target: {
                                            name: 'bloqueo_notas',
                                            value: !formData.bloqueo_notas, // Invertimos el valor actual
                                            type: 'custom' // Tipo custom para que entre por la lógica de 'value' en el padre
                                        }
                                    });
                                }}
                            >
                                <span className={`text-sm font-bold ${formData.bloqueo_notas ? 'text-red-700' : 'text-green-700'}`}>
                                    {formData.bloqueo_notas ? "🚫 NOTAS BLOQUEADAS" : "✅ Notas Habilitadas"}
                                </span>

                                <div className={`relative w-11 h-6 transition rounded-full ${formData.bloqueo_notas ? 'bg-red-500' : 'bg-green-500'}`}>
                                    <div className={`absolute top-1 left-1 bg-white w-4 h-4 rounded-full transition transform ${formData.bloqueo_notas ? 'translate-x-5' : ''}`}></div>
                                </div>
                            </div>
                            <p className="text-[10px] text-gray-400 mt-1">Úselo para restringir digitación por inasistencia.</p>
                        </div>

                        {/* -- OBSERVACIONES -- */}
                        <div className="md:col-span-12">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Observaciones</label>
                            <textarea
                                name="observaciones"
                                value={formData.observaciones || ""}
                                onChange={handleChange}
                                rows="2"
                                className={getInputClasses()}
                                placeholder="Escriba aquí cualquier observación adicional..."
                            />
                        </div>
                    </div>

                    {/* --- SECCIÓN DE BOTONES --- */}
                    <div className="flex justify-between items-center mt-8 pt-5 border-t border-gray-200">

                        {/* IZQUIERDA: Zona de peligro (Eliminar) - Solo visible en modo edición */}
                        <div>
                            {mode === "editar" && (
                                <button
                                    type="button"
                                    onClick={onDelete}
                                    className="text-red-500 hover:text-red-700 text-sm font-medium flex items-center transition-colors"
                                    title="Eliminar esta matrícula de la base de datos"
                                >
                                    {/* Asegúrate de importar faTrash si usas FontAwesome */}
                                    <FontAwesomeIcon icon={faTrash} className="mr-2" />
                                    Eliminar registro
                                </button>
                            )}
                        </div>

                        {/* DERECHA: Acciones principales (Guardar / Cancelar) */}
                        <div className="flex gap-3">
                            <button
                                type="submit"
                                disabled={loading}
                                className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 transition flex items-center shadow-md"
                            >
                                {loading && <LoadingSpinner size="sm" color="text-white" />}
                                <FontAwesomeIcon icon={faSave} className="mr-2" />
                                {mode === "agregar" ? "Guardar Matrícula" : "Actualizar Cambios"}
                            </button>

                            <button
                                type="button"
                                onClick={resetForm}
                                className="bg-red-500 text-white px-5 py-2 rounded-lg hover:bg-red-600 transition flex items-center shadow-md"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            </form>

            {/* --- MODAL DE DETALLE DEL ESTUDIANTE --- */}
            {mostrarDetalle && est && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-fade-in-up">
                        {/* Header del Modal */}
                        <div className="bg-gray-50 px-6 py-4 flex border-b border-gray-400 justify-between items-center">
                            <h3 className="text-gray-800 text-lg font-bold flex items-center gap-2">
                                <FontAwesomeIcon icon={faUser} className="w-6 h-6 mr-3 text-blue-600" /> Información del Estudiante
                            </h3>
                            <button onClick={() => setMostrarDetalle(false)} className="text-gray-400 hover:text-red-500 transition">
                                <FontAwesomeIcon icon={faTimes} size="lg" />
                            </button>
                        </div>

                        {/* Body del Modal */}
                        <div className="p-6 space-y-4 text-sm text-gray-700">
                            <div className="flex flex-col items-center pb-4 border-b border-gray-300">
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
                        <div className="bg-gray-50 px-6 py-3 flex justify-end border-t border-gray-300">
                            <button
                                onClick={() => setMostrarDetalle(false)}
                                className="bg-gray-200 text-gray-700 px-4 py-2 rounded hover:bg-red-600 hover:text-white text-sm font-medium"
                            >
                                <FontAwesomeIcon icon={faTimes} className="mr-2" /> Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default MatriculasForm;