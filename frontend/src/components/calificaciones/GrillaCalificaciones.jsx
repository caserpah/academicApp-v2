import React, { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faSpinner, faBan, faReplyAll
} from "@fortawesome/free-solid-svg-icons";
import { showSuccess, showError, showConfirm, showWarning } from "../../utils/notifications";

// Porcentajes Institucionales
const WEIGHTS = {
    academica: 0.50,
    acumulativa: 0.20,
    laboral: 0.15,
    social: 0.15
};

const GrillaCalificaciones = ({
    students = [],
    loading,
    onSave,
    asignaturaNombre = ""
}) => {
    // --- ESTADOS LOCALES ---
    const [gridData, setGridData] = useState([]);
    const [savingIds, setSavingIds] = useState({});

    // Estado para la "Fila Maestra"
    const [masterValues, setMasterValues] = useState({
        notaAcademica: "",
        notaAcumulativa: "",
        notaLaboral: "",
        notaSocial: "",
        notaDefinitivaInput: "" // Para comportamiento
    });

    const esComportamiento = asignaturaNombre.trim().toUpperCase() === "COMPORTAMIENTO";

    // --- EFECTO: Sincronizar props ---
    useEffect(() => {
        const mappedData = students.map(item => {
            const cal = item.calificacion || {};
            return {
                matriculaId: item.matriculaId,
                estudianteId: item.estudianteId,
                nombreCompleto: item.nombreCompleto,
                documento: item.documento,
                bloqueo_notas: item.bloqueo_notas,
                notaAcademica: cal.notaAcademica ?? "",
                notaAcumulativa: cal.notaAcumulativa ?? "",
                notaLaboral: cal.notaLaboral ?? "",
                notaSocial: cal.notaSocial ?? "",
                notaDefinitiva: cal.notaDefinitiva ?? "",
                fallas: cal.fallas ?? 0,
                isDirty: false
            };
        });
        setGridData(mappedData);
    }, [students]);

    // --- CÁLCULOS ---
    const calcularDefinitiva = (row) => {
        const nAcad = parseFloat(row.notaAcademica || 0);
        const nAcum = parseFloat(row.notaAcumulativa || 0);
        const nLab = parseFloat(row.notaLaboral || 0);
        const nSoc = parseFloat(row.notaSocial || 0);

        const def = (nAcad * WEIGHTS.academica) +
            (nAcum * WEIGHTS.acumulativa) +
            (nLab * WEIGHTS.laboral) +
            (nSoc * WEIGHTS.social);
        return def.toFixed(2);
    };

    // --- HANDLERS INDIVIDUALES ---
    const handleCellChange = (index, field, value) => {
        if (!/^\d*\.?\d*$/.test(value)) return;
        if (parseFloat(value) > 5) return;

        const newData = [...gridData];
        newData[index][field] = value;
        newData[index].isDirty = true;

        if (!esComportamiento && field !== 'fallas') {
            newData[index].notaDefinitiva = calcularDefinitiva(newData[index]);
        }
        setGridData(newData);
    };

    const handleBlur = async (index) => {
        const row = gridData[index];
        if (!row.isDirty) return;
        if (row.bloqueo_notas) {
            showError(`Estudiante bloqueado.`);
            return;
        }

        setSavingIds(prev => ({ ...prev, [row.estudianteId]: true }));

        try {
            let payload = {
                estudianteId: row.estudianteId,
                fallas: row.fallas
            };

            if (esComportamiento) {
                payload.notaDefinitivaInput = row.notaDefinitiva;
            } else {
                payload.notaAcademica = row.notaAcademica;
                payload.notaAcumulativa = row.notaAcumulativa;
                payload.notaLaboral = row.notaLaboral;
                payload.notaSocial = row.notaSocial;
            }

            await onSave(payload);

            const newData = [...gridData];
            newData[index].isDirty = false;
            setGridData(newData);
        } catch (error) {
            console.error("Error guardando fila", error);
        } finally {
            setSavingIds(prev => ({ ...prev, [row.estudianteId]: false }));
        }
    };

    // --- LÓGICA FILA MAESTRA (MASS UPDATE UNIFICADO) ---

    const handleMasterChange = (field, value) => {
        if (!/^\d*\.?\d*$/.test(value)) return;
        if (parseFloat(value) > 5) return;
        setMasterValues(prev => ({ ...prev, [field]: value }));
    };

    // FUNCIÓN ÚNICA DE APLICAR TODO
    const applyGlobalMassUpdate = async () => {
        // 1. Validaciones
        if (!esComportamiento) {
            const { notaAcademica, notaAcumulativa, notaLaboral, notaSocial } = masterValues;
            // Validar que TODOS los campos tengan valor
            if (!notaAcademica || !notaAcumulativa || !notaLaboral || !notaSocial) {
                showWarning("Para aplicar masivamente, debes diligenciar las 4 notas (Académica, Acumulativa, Laboral y Social).");
                return;
            }
        } else {
            if (!masterValues.notaDefinitivaInput) {
                showWarning("Debes ingresar la nota definitiva para aplicar.");
                return;
            }
        }

        if (!(await showConfirm("¿Estás seguro de sobrescribir las notas de TODOS los estudiantes habilitados?", "Aplicar Masivamente"))) return;

        // 2. Actualizar estado visualmente
        const newData = gridData.map(row => {
            if (row.bloqueo_notas) return row;

            const updatedRow = { ...row, isDirty: true };

            if (esComportamiento) {
                updatedRow.notaDefinitiva = masterValues.notaDefinitivaInput;
            } else {
                updatedRow.notaAcademica = masterValues.notaAcademica;
                updatedRow.notaAcumulativa = masterValues.notaAcumulativa;
                updatedRow.notaLaboral = masterValues.notaLaboral;
                updatedRow.notaSocial = masterValues.notaSocial;
                updatedRow.notaDefinitiva = calcularDefinitiva(updatedRow);
            }
            return updatedRow;
        });
        setGridData(newData);

        // 3. Guardado Secuencial
        const habilitados = newData.filter(r => !r.bloqueo_notas);
        let successCount = 0;

        for (const row of habilitados) {
            setSavingIds(prev => ({ ...prev, [row.estudianteId]: true }));
            try {
                let payload = { estudianteId: row.estudianteId, fallas: row.fallas };
                if (esComportamiento) {
                    payload.notaDefinitivaInput = row.notaDefinitiva;
                } else {
                    payload.notaAcademica = row.notaAcademica;
                    payload.notaAcumulativa = row.notaAcumulativa;
                    payload.notaLaboral = row.notaLaboral;
                    payload.notaSocial = row.notaSocial;
                }

                await onSave(payload);
                successCount++;
            } catch (err) {
                console.error(err);
            } finally {
                setSavingIds(prev => ({ ...prev, [row.estudianteId]: false }));
            }
        }

        if (successCount > 0) {
            showSuccess(`Se actualizaron ${successCount} registros exitosamente.`);
            setGridData(prev => prev.map(r => (!r.bloqueo_notas ? { ...r, isDirty: false } : r)));
        }
    };

    // --- RENDERERS ---

    // Input normal de celda (con peso visual)
    const renderInput = (row, index, field, weight = null) => {
        const isSaving = savingIds[row.estudianteId];

        let calculatedValue = null;
        if (weight !== null) {
            const val = parseFloat(row[field]);
            calculatedValue = !isNaN(val) ? (val * weight).toFixed(2) : "-";
        }

        return (
            <div className="flex items-center justify-center gap-1">
                <div className="relative">
                    <input
                        type="text"
                        value={row[field]}
                        onChange={(e) => handleCellChange(index, field, e.target.value)}
                        onBlur={() => handleBlur(index)}
                        disabled={row.bloqueo_notas || isSaving}
                        className={`w-14 text-center border rounded py-1 px-1 focus:outline-none focus:ring-2 focus:ring-blue-400 font-mono text-sm
                            ${row.bloqueo_notas ? 'bg-red-50 text-red-400 cursor-not-allowed border-red-200' : 'bg-white border-gray-300'}
                            ${row.isDirty ? 'border-yellow-400 bg-yellow-50' : ''}
                        `}
                        placeholder="0.0"
                    />
                    {isSaving && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/80 rounded">
                            <FontAwesomeIcon icon={faSpinner} spin className="text-blue-500 text-xs" />
                        </div>
                    )}
                </div>
                {weight !== null && (
                    <div className="flex flex-col items-start justify-center w-8">
                        <span className="text-[9px] text-gray-400 font-bold leading-none select-none">
                            {weight * 100}%
                        </span>
                        <span className={`text-[11px] font-mono leading-none ${calculatedValue === '-' ? 'text-gray-300' : 'text-gray-500 font-semibold'}`}>
                            {calculatedValue}
                        </span>
                    </div>
                )}
            </div>
        );
    };

    // Input Maestro SIMPLE (Sin botón individual)
    const renderMasterInput = (field, placeholder) => (
        <div className="flex flex-col items-center gap-1 pb-2">
            <span className="text-[10px] text-gray-500 uppercase font-bold">{placeholder}</span>
            <input
                type="text"
                value={masterValues[field]}
                onChange={(e) => handleMasterChange(field, e.target.value)}
                className="w-14 text-center border-b-2 border-blue-200 focus:border-blue-500 outline-none text-sm bg-gray-50 text-blue-800 font-bold placeholder-blue-200"
                placeholder="---"
            />
        </div>
    );

    if (loading && gridData.length === 0) return <div className="p-10 text-center text-gray-500">Cargando grilla...</div>;
    if (gridData.length === 0) return <div className="p-10 text-center text-gray-500">No hay estudiantes en este grupo.</div>;

    return (
        <div className="overflow-x-auto pb-4">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                        <th rowSpan="2" className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-10">#</th>
                        <th rowSpan="2" className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Estudiante</th>

                        {!esComportamiento ? (
                            <>
                                <th className="px-2 py-2 text-center text-xs font-bold text-gray-500 uppercase tracking-wider bg-blue-50/50">Académica</th>
                                <th className="px-2 py-2 text-center text-xs font-bold text-gray-500 uppercase tracking-wider bg-green-50/50">Acumul.</th>
                                <th className="px-2 py-2 text-center text-xs font-bold text-gray-500 uppercase tracking-wider bg-orange-50/50">Laboral</th>
                                <th className="px-2 py-2 text-center text-xs font-bold text-gray-500 uppercase tracking-wider bg-purple-50/50">Social</th>
                            </>
                        ) : (
                            <th className="px-2 py-2 text-center text-xs font-bold text-gray-500 uppercase tracking-wider bg-indigo-50">Nota Periodo</th>
                        )}

                        <th rowSpan="2" className="px-2 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider w-20">Nota Periodo</th>
                        <th rowSpan="2" className="px-2 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Fallas</th>
                    </tr>

                    {/* FILA MAESTRA */}
                    <tr className="bg-gray-100 border-b-2 border-gray-200">
                        {!esComportamiento ? (
                            <>
                                <td className="p-1 text-center">{renderMasterInput('notaAcademica', '50%')}</td>
                                <td className="p-1 text-center">{renderMasterInput('notaAcumulativa', '20%')}</td>
                                <td className="p-1 text-center">{renderMasterInput('notaLaboral', '15%')}</td>
                                <td className="p-1 text-center">{renderMasterInput('notaSocial', '15%')}</td>
                            </>
                        ) : (
                            <td className="p-1 text-center">{renderMasterInput('notaDefinitivaInput', 'DEF')}</td>
                        )}

                        {/* BOTÓN DE ACCIÓN MASIVA */}
                        <td colSpan="2" className="p-1 text-center align-middle">
                            <button
                                onClick={applyGlobalMassUpdate}
                                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-1.5 px-3 rounded shadow flex items-center justify-center gap-2 mx-auto transition-transform active:scale-95"
                                title="Rellenar todos los campos vacíos con estos valores"
                            >
                                <FontAwesomeIcon icon={faReplyAll} />
                                Aplicar a Todos
                            </button>
                        </td>
                    </tr>
                </thead>

                <tbody className="bg-white divide-y divide-gray-200">
                    {gridData.map((row, index) => (
                        <tr key={row.estudianteId} className={`hover:bg-gray-50 transition-colors ${row.bloqueo_notas ? 'bg-red-50/30' : ''}`}>
                            <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-400">{index + 1}</td>

                            <td className="px-4 py-2 whitespace-nowrap">
                                <div className="flex items-center">
                                    <div>
                                        <div className={`text-sm font-medium ${row.bloqueo_notas ? 'text-red-600' : 'text-gray-900'}`}>
                                            {row.nombreCompleto}
                                        </div>
                                        <div className="text-xs text-gray-500">{row.documento}</div>
                                    </div>
                                    {row.bloqueo_notas && (
                                        <div className="ml-2 text-red-500">
                                            <FontAwesomeIcon icon={faBan} />
                                        </div>
                                    )}
                                </div>
                            </td>

                            {!esComportamiento ? (
                                <>
                                    <td className="px-2 py-2 text-center">{renderInput(row, index, 'notaAcademica', WEIGHTS.academica)}</td>
                                    <td className="px-2 py-2 text-center">{renderInput(row, index, 'notaAcumulativa', WEIGHTS.acumulativa)}</td>
                                    <td className="px-2 py-2 text-center">{renderInput(row, index, 'notaLaboral', WEIGHTS.laboral)}</td>
                                    <td className="px-2 py-2 text-center">{renderInput(row, index, 'notaSocial', WEIGHTS.social)}</td>
                                    <td className="px-2 py-2 text-center bg-gray-50/50">
                                        <span className={`inline-block w-12 text-center font-bold text-lg ${parseFloat(row.notaDefinitiva) < 3.0 ? 'text-red-600' : 'text-gray-800'}`}>
                                            {row.notaDefinitiva || "-"}
                                        </span>
                                    </td>
                                </>
                            ) : (
                                <>
                                    <td className="px-2 py-2 text-center">{renderInput(row, index, 'notaDefinitiva')}</td>
                                    <td className="px-2 py-2 text-center">
                                        <span className={`inline-block w-12 text-center font-bold text-lg ${parseFloat(row.notaDefinitiva) < 3.0 ? 'text-red-600' : 'text-gray-800'}`}>
                                            {row.notaDefinitiva || "-"}
                                        </span>
                                    </td>
                                </>
                            )}

                            <td className="px-2 py-2 text-center">
                                <input
                                    type="number"
                                    min="0"
                                    value={row.fallas}
                                    onChange={(e) => handleCellChange(index, 'fallas', e.target.value)}
                                    onBlur={() => handleBlur(index)}
                                    disabled={row.bloqueo_notas}
                                    className="w-12 text-center border border-gray-300 rounded text-xs py-1"
                                />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default GrillaCalificaciones;