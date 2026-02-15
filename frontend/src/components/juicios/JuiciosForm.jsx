import React, { useEffect, useMemo } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faSave, faTimes, faGavel, faLayerGroup,
    faUsers, faBriefcase, faBookOpen, faGraduationCap, faInfoCircle
} from "@fortawesome/free-solid-svg-icons";

// --- CONSTANTES DE NEGOCIO ---
const DIMENSION = {
    ACADEMICA: 1,
    SOCIAL: 2,
    LABORAL: 3,
    ACUMULATIVA: 4,
    COMPORTAMIENTO: 999
};

const GRADOS_PREESCOLAR = ["PRE_JARDIN", "PRE JARDIN", "JARDIN", "TRANSICION", "TRANSICIÓN"];

const JuiciosForm = ({
    formData,
    mode,
    loading,
    handleChange,
    handleSubmit,
    resetForm,
    asignaturas = [],
    vigencia,
    grados = [],
    dimensiones = [],
    desempenos = [],
    rangos = []
}) => {
    // --- ESTILOS ---
    const inputBaseClasses = "mt-1 block w-full border border-gray-300 rounded-lg shadow-sm p-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition duration-150 disabled:bg-gray-100 disabled:text-gray-500";
    const readOnlyClasses = "bg-gray-100 cursor-not-allowed text-gray-700 font-bold text-center";

    // ==========================================
    // DETECCIÓN DE ESTADOS (BANDERAS)
    // ==========================================

    const esComportamiento = useMemo(() => {
        if (!formData.asignaturaId) return false;
        const asig = asignaturas.find(a => String(a.id) === String(formData.asignaturaId));
        return asig && asig.nombre.trim().toUpperCase().includes("COMPORTAMIENTO");
    }, [formData.asignaturaId, asignaturas]);

    const esAcumulativa = useMemo(() => {
        return Number(formData.dimensionId) === DIMENSION.ACUMULATIVA;
    }, [formData.dimensionId]);

    const esLaboralSocial = useMemo(() => {
        const dimId = Number(formData.dimensionId);
        return dimId === DIMENSION.SOCIAL || dimId === DIMENSION.LABORAL;
    }, [formData.dimensionId]);

    const esAcademica = useMemo(() => {
        const dimId = Number(formData.dimensionId);
        return dimId === DIMENSION.ACADEMICA;
    }, [formData.dimensionId]);

    const esPreescolar = useMemo(() => {
        if (!formData.gradoId) return false;
        const gradoObj = grados.find(g => String(g.id) === String(formData.gradoId));
        return gradoObj && GRADOS_PREESCOLAR.includes(gradoObj.nombre.trim().toUpperCase());
    }, [formData.gradoId, grados]);

    // Helper: Grado Global es cuando NO hay grado seleccionado (null o vacío)
    const esGradoGlobal = !formData.gradoId || formData.gradoId === "";

    // ==========================================
    // REGLAS DE NEGOCIO (EFECTOS DE LIMPIEZA)
    // ==========================================

    const hasValue = (val) => val !== null && val !== "";

    // El usuario selecciona la asignatura COMPORTAMIENTO
    useEffect(() => {
        if (esComportamiento) {
            const sucioGrado = hasValue(formData.gradoId);
            const sucioPeriodo = String(formData.periodo) !== "0";
            // Forzamos conversión a String para comparar ID con seguridad
            const dimensionIncorrecta = String(formData.dimensionId) !== String(DIMENSION.COMPORTAMIENTO);

            if (sucioGrado || sucioPeriodo || dimensionIncorrecta) {
                handleChange({
                    target: {
                        name: 'reset_global',
                        values: {
                            gradoId: null,
                            periodo: "0",
                            dimensionId: DIMENSION.COMPORTAMIENTO
                        }
                    }
                });
            }
        }
    }, [esComportamiento, formData.gradoId, formData.periodo, formData.dimensionId, handleChange]);

    // El usuario selecciona la dimensión o competencia ACUMULATIVA
    useEffect(() => {
        if (esAcumulativa) {
            const sucioGrado = hasValue(formData.gradoId);
            const sucioAsignatura = hasValue(formData.asignaturaId);
            const sucioPeriodo = String(formData.periodo) !== "0";

            if (sucioGrado || sucioAsignatura || sucioPeriodo) {
                handleChange({
                    target: {
                        name: 'reset_global',
                        values: {
                            gradoId: null,
                            asignaturaId: null,
                            periodo: "0"
                        }
                    }
                });
            }
        }
    }, [esAcumulativa, formData.gradoId, formData.asignaturaId, formData.periodo, handleChange]);

    // El usuario selecciona la dimensión LABORAL o SOCIAL
    useEffect(() => {
        if (esLaboralSocial && esGradoGlobal) {
            const sucioAsignatura = hasValue(formData.asignaturaId);
            const sucioPeriodo = String(formData.periodo) !== "0";

            if (sucioAsignatura || sucioPeriodo) {
                handleChange({
                    target: {
                        name: 'reset_global',
                        values: {
                            asignaturaId: null,
                            periodo: "0"
                        }
                    }
                });
            }
        }
    }, [esLaboralSocial, esGradoGlobal, formData.asignaturaId, formData.periodo, handleChange]);

    // El usuario selecciona la dimensión o competencia ACADÉMICA y NO es preescolar
    useEffect(() => {
        if (esAcademica && !esPreescolar) {
            const unico = desempenos.find(d => d.codigo === 'UN');
            if (unico && String(formData.desempenoId) !== String(unico.id)) {
                handleChange({ target: { name: 'desempenoId', value: unico.id } });
            }
        }
    }, [esAcademica, esPreescolar, formData.desempenoId, desempenos, handleChange]);


    // ==========================================
    // FILTROS VISUALES (LISTAS)
    // ==========================================

    const filteredDimensiones = useMemo(() => {
        // Si es comportamiento, SOLO mostramos NO APLICA.
        if (esComportamiento) {
            return [{ id: DIMENSION.COMPORTAMIENTO, nombre: "NO APLICA" }];
        }
        // Si NO es comportamiento, filtramos usando String() para asegurar comparación correcta
        return dimensiones.filter(d => String(d.id) !== String(DIMENSION.COMPORTAMIENTO));
    }, [dimensiones, esComportamiento]);

    const filteredGrados = useMemo(() => {
        if (esLaboralSocial) {
            return grados.filter(g => GRADOS_PREESCOLAR.includes(g.nombre.trim().toUpperCase()));
        }
        return grados;
    }, [grados, esLaboralSocial]);

    const filteredDesempenos = useMemo(() => {
        const unico = desempenos.find(d => d.codigo === 'UN');
        if (esAcademica && !esPreescolar) {
            return unico ? [unico] : [];
        }
        return desempenos.filter(d => d.codigo !== 'UN');
    }, [desempenos, esAcademica, esPreescolar]);


    // ==========================================
    // RENDERIZADO DE ALERTAS
    // ==========================================

    const renderModeAlert = () => {
        if (esComportamiento) return <AlertBox color="purple" icon={faGavel} title="Modo Comportamiento" desc="Aplica a todos los grados. Configuración automática." />;
        if (esAcumulativa) return <AlertBox color="indigo" icon={faLayerGroup} title="Modo Acumulativa" desc="Aplica a todos los grados. Configuración automática." />;
        if (esLaboralSocial) return <AlertBox color={esPreescolar ? "orange" : "blue"} icon={esPreescolar ? faUsers : faBriefcase} title={`Modo Transversal (${esPreescolar ? "Preescolar" : "Primaria/Secundaria"})`} desc={esPreescolar ? "Específica por Grado." : "Global: Asignatura no aplica, Todos los periodos."} />;
        if (esAcademica) return <AlertBox color="green" icon={esPreescolar ? faGraduationCap : faBookOpen} title={`Modo Académico (${esPreescolar ? "Preescolar" : "Primaria/Secundaria"})`} desc={esPreescolar ? "Evaluación completa." : "Desempeño ÚNICO automático."} />;
        return null;
    };

    const AlertBox = ({ color, icon, title, desc }) => (
        <div className={`mb-4 p-3 bg-${color}-50 text-${color}-800 text-sm rounded-lg flex items-center border border-${color}-200`}>
            <FontAwesomeIcon icon={icon} className="mr-2" />
            <div><strong>{title}</strong><br /><span className="text-xs opacity-75">{desc}</span></div>
        </div>
    );

    // ==========================================
    // HANDLERS
    // ==========================================

    const handleLocalChange = (e) => {
        if (e.target.name === 'reset_global') {
            Object.keys(e.target.values).forEach(key => {
                handleChange({ target: { name: key, value: e.target.values[key] } });
            });
            return;
        }
        handleChange(e);
    };

    const selectedDesempeno = desempenos.find(d => d.id == formData.desempenoId);
    const esUnico = selectedDesempeno?.codigo === 'UN';

    const rangoActual = useMemo(() => {
        if (!formData.desempenoId || !vigencia) return null;
        return rangos.find(r => Number(r.desempenoId) === Number(formData.desempenoId) && Number(r.vigenciaId) === Number(vigencia.id));
    }, [formData.desempenoId, vigencia, rangos]);


    // ==========================================
    // RENDER
    // ==========================================
    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="bg-white p-6 rounded-xl shadow-md border border-gray-100">

                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-center border-b border-gray-200 pb-4 mb-6 gap-4">
                    <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold text-gray-700">{mode === "agregar" ? "Registrar Nuevo Juicio" : "Editar Juicio"}</h3>
                        {vigencia && <span className="text-xs bg-blue-100 text-blue-800 px-3 py-1 rounded-full font-bold">Año {vigencia.anio}</span>}
                    </div>
                    <div className="flex items-center">
                        <label className="mr-2 text-sm font-medium text-gray-600">Estado:</label>
                        <button type="button" onClick={() => handleChange({ target: { name: 'activo', value: !formData.activo } })} disabled={loading} className={`${formData.activo ? 'bg-green-500' : 'bg-gray-300'} relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none`}>
                            <span className={`${formData.activo ? 'translate-x-6' : 'translate-x-1'} inline-block h-4 w-4 transform rounded-full bg-white transition-transform`} />
                        </button>
                    </div>
                </div>

                {renderModeAlert()}

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">

                    {/* GRADO */}
                    <div className="col-span-1">
                        <label className="block text-sm font-medium text-gray-600 mb-1">Grado <span className="text-red-500">*</span></label>
                        <select
                            name="gradoId"
                            // Si es comportamiento o acumulativa, FORZAMOS valor vacío visualmente
                            value={(esComportamiento || esAcumulativa) ? "" : (formData.gradoId || "")}
                            onChange={handleLocalChange}
                            className={inputBaseClasses}
                            disabled={esComportamiento || esAcumulativa}
                            required={!esComportamiento && !esAcumulativa && (!esLaboralSocial || esPreescolar)}
                        >
                            <option value="">
                                {esComportamiento || esAcumulativa
                                    ? "GLOBAL (TODOS)"
                                    : esLaboralSocial
                                        ? "GLOBAL (PRIMARIA/SECUNDARIA)"
                                        : "-- Seleccione Grado --"}
                            </option>
                            {filteredGrados.map(g => <option key={g.id} value={g.id}>{g.nombre.replace(/_/g, " ")}</option>)}
                        </select>
                        {esLaboralSocial && <p className="text-[10px] text-gray-400 mt-1 flex items-center"><FontAwesomeIcon icon={faInfoCircle} className="mr-1" /> Deje vacío para Global.</p>}
                    </div>

                    {/* ASIGNATURA */}
                    <div className="col-span-1">
                        <label className="block text-sm font-medium text-gray-600 mb-1">
                            Asignatura
                            {(esAcumulativa || (esLaboralSocial && esGradoGlobal)) ? <span className="text-gray-400 text-xs ml-1">(Global)</span> : <span className="text-red-500 ml-1">*</span>}
                        </label>
                        <select
                            name="asignaturaId"
                            // Si es acumulativa o laboral global, FORZAMOS valor vacío
                            value={(esAcumulativa || (esLaboralSocial && esGradoGlobal)) ? "" : (formData.asignaturaId || "")}
                            onChange={handleLocalChange}
                            className={inputBaseClasses}
                            disabled={esAcumulativa || (esLaboralSocial && esGradoGlobal)}
                            required={!esAcumulativa && (!esLaboralSocial || !esGradoGlobal)}
                        >
                            <option value="">{esAcumulativa ? "TRANSVERSAL" : "-- Seleccione Asignatura --"}</option>
                            {asignaturas.map(a => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                        </select>
                    </div>

                    {/* COMPETENCIA */}
                    <div className="col-span-1">
                        <label className="block text-sm font-medium text-gray-600 mb-1">
                            Competencia
                            {esComportamiento ? <span className="text-gray-400 text-xs ml-1">(Auto)</span> : <span className="text-red-500 ml-1">*</span>}
                        </label>
                        <select
                            name="dimensionId"
                            // Si es comportamiento, mostramos el ID 999
                            value={esComportamiento ? DIMENSION.COMPORTAMIENTO : (formData.dimensionId || "")}
                            onChange={handleLocalChange}
                            className={inputBaseClasses}
                            disabled={esComportamiento}
                            required
                        >
                            <option value="">{esComportamiento ? "-- NO APLICA --" : "-- Seleccione --"}</option>
                            {filteredDimensiones.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                        </select>
                    </div>

                    {/* PERIODO */}
                    <div className="col-span-1">
                        <label className="block text-sm font-medium text-gray-600 mb-1">Periodo</label>
                        <select
                            name="periodo"
                            // Forzamos "0" visualmente si es global
                            value={(esComportamiento || esAcumulativa || (esLaboralSocial && esGradoGlobal)) ? "0" : (formData.periodo || "")}
                            onChange={handleLocalChange}
                            className={inputBaseClasses}
                            disabled={esComportamiento || esAcumulativa || (esLaboralSocial && esGradoGlobal)}
                            required={!esComportamiento && !esAcumulativa && (!esLaboralSocial || !esGradoGlobal)}
                        >
                            <option value="">-- Seleccione --</option>
                            {(esComportamiento || esAcumulativa || (esLaboralSocial && esGradoGlobal)) && <option value="0">TODOS (ANUAL)</option>}
                            {[1, 2, 3, 4].map(p => <option key={p} value={p}>Periodo {p}</option>)}
                            <option value="5">Informe Final</option>
                        </select>
                    </div>

                    {/* DESEMPEÑO */}
                    <div className="col-span-1">
                        <label className="block text-sm font-medium text-gray-600 mb-1">Indicador de desempeño <span className="text-red-500">*</span></label>
                        <select
                            name="desempenoId"
                            value={formData.desempenoId || ""}
                            onChange={handleLocalChange}
                            className={inputBaseClasses}
                            disabled={esAcademica && !esPreescolar}
                            required
                        >
                            <option value="">-- Seleccione --</option>
                            {filteredDesempenos.map(d => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                        </select>
                        {esAcademica && !esPreescolar && <p className="text-[10px] text-gray-400 mt-1">* Se asigna desempeño ÚNICO automáticamente.</p>}
                    </div>

                    {/* RANGOS */}
                    {!esUnico && (
                        <div className="col-span-1 flex space-x-2">
                            <div className="w-1/2"><label className="block text-xs text-gray-500 mb-1">Min</label><input type="text" value={rangoActual?.minNota || "-"} disabled className={`${inputBaseClasses} ${readOnlyClasses}`} /></div>
                            <div className="w-1/2"><label className="block text-xs text-gray-500 mb-1">Max</label><input type="text" value={rangoActual?.maxNota || "-"} disabled className={`${inputBaseClasses} ${readOnlyClasses}`} /></div>
                        </div>
                    )}
                </div>

                {/* TEXTO Y BOTONES */}
                <div className="mt-4">
                    <label className="block text-sm font-medium text-gray-600 mb-1">Texto del Juicio <span className="text-red-500">*</span></label>
                    <textarea name="texto" value={formData.texto || ""} onChange={handleLocalChange} rows="4" className="w-full border border-gray-300 rounded-lg p-3 focus:ring-blue-500" required />
                    <div className="flex justify-end mt-1"><span className={`text-xs ${formData.texto?.length < 10 ? 'text-red-500' : 'text-green-600'}`}>{formData.texto?.length || 0} caracteres</span></div>
                </div>

                <div className="pt-4 flex justify-center space-x-3 border-t border-gray-100 mt-4">
                    <button type="submit" disabled={loading} className="bg-blue-600 text-white px-5 py-2 rounded-lg shadow-md hover:bg-blue-700 transition duration-150 flex items-center"><FontAwesomeIcon icon={faSave} className="mr-2" /> {mode === "agregar" ? "Guardar" : "Guardar Cambios"}</button>
                    <button type="button" onClick={resetForm} disabled={loading} className="bg-red-500 text-white px-5 py-2 rounded-lg shadow-md hover:bg-red-600 transition duration-150 flex items-center hover:scale-[1.01]"><FontAwesomeIcon icon={faTimes} className="mr-2" /> Cancelar</button>
                </div>
            </div>
        </form>
    );
};

export default JuiciosForm;