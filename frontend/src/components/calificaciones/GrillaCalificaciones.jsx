import React, { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
    faSpinner, faBan, faReplyAll, faCommentDots, faEye,
    faCheckCircle, faSave, faExclamationCircle
} from "@fortawesome/free-solid-svg-icons";
import { showSuccess, showError, showConfirm, showWarning } from "../../utils/notifications";
import RecomendacionesModal from "./RecomendacionesModal.jsx";

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
    onManualSave,
    asignaturaNombre = "",
    bancoRecomendaciones = [],
    isReadOnly = false,
    porcentajeArea = 100
}) => {
    // --- Estado para la Grilla de calificaciones ---
    const [gridData, setGridData] = useState([]);
    const [savingIds, setSavingIds] = useState({});
    const [saveErrors, setSaveErrors] = useState({}); // Rastrea celdas que fallaron al guardar

    // Estado para almacenar qué estudiantes requieren justificación
    const [pendingJustificationRows, setPendingJustificationRows] = useState({});

    // --- Estado para el modal de recomendaciones ---
    const [modalOpen, setModalOpen] = useState(false);
    const [currentStudent, setCurrentStudent] = useState(null);

    // --- Estado para la Fila Maestra ---
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
        // Al recibir nuevos datos, limpiamos el estado "pending" porque asumimos que se guardó bien
        setPendingJustificationRows({});

        const mappedData = students.map(item => {
            const cal = item.calificacion || {};
            return {
                matriculaId: item.matriculaId,
                estudianteId: item.estudianteId,
                nombreCompleto: item.nombreCompleto,
                documento: item.documento,
                bloqueo_notas: item.bloqueo_notas,

                // Notas
                notaAcademica: cal.notaAcademica ?? "",
                notaAcumulativa: cal.notaAcumulativa ?? "",
                notaLaboral: cal.notaLaboral ?? "",
                notaSocial: cal.notaSocial ?? "",
                notaDefinitiva: cal.notaDefinitiva ?? "",

                //Fallas
                fallas: cal.fallas ?? 0,

                // Recomendaciones
                recomendacionUno: cal.recomendacionUno ?? "",
                recomendacionDos: cal.recomendacionDos ?? "",

                observacion_cambio: cal.observacion_cambio || "",
                url_evidencia_cambio: cal.url_evidencia_cambio || "",

                isDirty: false
            };
        });
        setGridData(mappedData);
    }, [students]);

    // --- HELPER DE REDONDEO ESTÁNDAR (Obliga a JS a redondear como Excel) ---
    const roundExcel = (num) => {
        const parsed = parseFloat(num);
        if (isNaN(parsed)) return "-";
        // La notación "e+2" evita el bug del punto flotante de JS.
        // Convertirá 4.195 exactamente en 4.20
        return Number(Math.round(parsed + "e+2") + "e-2").toFixed(2);
    };


    // --- CÁLCULOS MATEMÁTICOS ---
    const calcularDefinitiva = (row) => {
        const nAcad = parseFloat(row.notaAcademica || 0);
        const nAcum = parseFloat(row.notaAcumulativa || 0);
        const nLab = parseFloat(row.notaLaboral || 0);
        const nSoc = parseFloat(row.notaSocial || 0);

        // Sumamos los porcentajes
        const def = (nAcad * WEIGHTS.academica) +
            (nAcum * WEIGHTS.acumulativa) +
            (nLab * WEIGHTS.laboral) +
            (nSoc * WEIGHTS.social);

        // Pasamos el resultado por el redondeo estándar
        return roundExcel(def);
    };

    // --- HANDLERS INDIVIDUALES ---
    const handleCellChange = (index, field, value) => {
        // Lógica EXCLUSIVA para Fallas (Solo enteros, sin límite de 5)
        if (field === 'fallas') {
            if (!/^\d*$/.test(value)) return; // Solo permite dígitos (bloquea puntos y letras)
            if (value.length > 2) return; // Opcional: Evita que digiten más de 99 fallas por error
        }
        // Lógica EXCLUSIVA para Notas (Permite decimales, bloquea si es mayor a 5)
        else {
            if (!/^\d*\.?\d*$/.test(value)) return;
            if (parseFloat(value) > 5) return;
        }

        const newData = [...gridData];
        newData[index][field] = value;
        newData[index].isDirty = true;

        if (!esComportamiento && field !== 'fallas') {
            newData[index].notaDefinitiva = calcularDefinitiva(newData[index]);
        }
        setGridData(newData);
    };

    // --- Lógica para el Guardado Automático al salir de la celda ---
    const handleBlur = async (index) => {
        const row = gridData[index];
        if (!row.isDirty) return;

        // Si la fila ya está en "Modo Pendiente", NO intentamos guardar automáticamente.
        if (pendingJustificationRows[row.estudianteId]) return;

        if (row.bloqueo_notas) {
            showError(`Estudiante bloqueado.`);
            return;
        }

        // Si este estudiante ya está en proceso de guardado, aborta el segundo disparo.
        if (savingIds[row.estudianteId]) return;

        // Activamos el estado de guardado (esto deshabilitará el input y causará el segundo onBlur falso, pero ya estamos protegidos)
        setSavingIds(prev => ({ ...prev, [row.estudianteId]: true }));

        try {
            let payload = {
                estudianteId: row.estudianteId,
                fallas: row.fallas,
                recomendacionUno: row.recomendacionUno, // Enviar recomendaciones actuales para no perderlas
                recomendacionDos: row.recomendacionDos
            };

            if (esComportamiento) {
                payload.notaDefinitivaInput = row.notaDefinitiva;
            } else {
                payload.notaAcademica = row.notaAcademica;
                payload.notaAcumulativa = row.notaAcumulativa;
                payload.notaLaboral = row.notaLaboral;
                payload.notaSocial = row.notaSocial;
            }

            // Intentamos guardar
            await onSave(payload);

            // Si tiene éxito, limpiamos isDirty y cualquier error previo
            const newData = [...gridData];
            newData[index].isDirty = false;
            setGridData(newData);
            setSaveErrors(prev => ({ ...prev, [row.estudianteId]: false }));

        } catch (error) {
            // CASO A: Requiere Justificación (Admins fuera de fecha)
            if (error.code === 'REQ_JUSTIFICACION') {
                // No mostramos alerta roja. Activamos el modo manual.
                setPendingJustificationRows(prev => ({ ...prev, [row.estudianteId]: true }));
            } else { // CASO B: Error Genérico (Docentes fuera de fecha, Ventana no existe, Error 500)
                console.error("Error guardando fila", error);
                showError(error.message || "Error al guardar la calificación.");
                // Marcamos esta fila visualmente en rojo permanente hasta que el usuario la guarde manualmente (lo que limpiará el error)
                setSaveErrors(prev => ({ ...prev, [row.estudianteId]: true }));
            }
        } finally {
            setSavingIds(prev => ({ ...prev, [row.estudianteId]: false }));
        }
    };

    // --- LÓGICA DE NAVEGACIÓN CON TECLADO (FLECHAS) ---
    // --- LÓGICA DE NAVEGACIÓN CON TECLADO (4 FLECHAS TIPO EXCEL) ---
    const handleKeyDown = (e) => {
        const teclasNavegacion = ['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown'];

        if (teclasNavegacion.includes(e.key)) {
            const input = e.target;

            // --- NAVEGACIÓN HORIZONTAL (Izquierda / Derecha) ---
            if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
                // Validación para no bloquear la edición dentro de la celda de texto
                let isAtEnd = true;
                let isAtStart = true;

                if (input.type === 'text') {
                    isAtEnd = input.selectionStart === input.value.length;
                    isAtStart = input.selectionStart === 0;
                }

                if ((e.key === 'ArrowRight' && isAtEnd) || (e.key === 'ArrowLeft' && isAtStart)) {
                    e.preventDefault();

                    const inputs = Array.from(document.querySelectorAll('.navigable-cell:not(:disabled)'));
                    const currentIndex = inputs.indexOf(input);

                    if (currentIndex !== -1) {
                        const direction = e.key === 'ArrowRight' ? 1 : -1;
                        const nextIndex = currentIndex + direction;

                        if (nextIndex >= 0 && nextIndex < inputs.length) {
                            inputs[nextIndex].focus();
                            inputs[nextIndex].select();
                        }
                    }
                }
            }
            // --- NAVEGACIÓN VERTICAL (Arriba / Abajo) ---
            else if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                // Prevenimos el default para que los inputs tipo "number" no cambien su valor al usar las flechas
                e.preventDefault();

                // Buscamos la columna (td) y la fila (tr) actual
                const currentTd = input.closest('td');
                const currentRow = input.closest('tr');

                if (currentTd && currentRow) {
                    const colIndex = currentTd.cellIndex; // Índice de la columna actual
                    // Determinamos si vamos a la fila anterior o a la siguiente
                    const targetRow = e.key === 'ArrowDown' ? currentRow.nextElementSibling : currentRow.previousElementSibling;

                    if (targetRow) {
                        // Buscamos la celda exacta en la misma columna de la nueva fila
                        const targetTd = targetRow.cells[colIndex];
                        if (targetTd) {
                            // Encontramos el input navegable dentro de esa celda
                            const targetInput = targetTd.querySelector('.navigable-cell:not(:disabled)');
                            if (targetInput) {
                                targetInput.focus();
                                targetInput.select();
                            }
                        }
                    }
                }
            }
        }
    };

    // --- LÓGICA: Disparar el Guardado Manual ---
    const handleTriggerManualSave = (row) => {
        // Recopilamos todos los datos actuales de la fila
        const payload = {
            estudianteId: row.estudianteId,
            fallas: row.fallas,
            recomendacionUno: row.recomendacionUno,
            recomendacionDos: row.recomendacionDos,
            observacion_cambio: row.observacion_cambio,
            url_evidencia_cambio: row.url_evidencia_cambio
        };

        if (esComportamiento) {
            payload.notaDefinitivaInput = row.notaDefinitiva;
        } else {
            payload.notaAcademica = row.notaAcademica;
            payload.notaAcumulativa = row.notaAcumulativa;
            payload.notaLaboral = row.notaLaboral;
            payload.notaSocial = row.notaSocial;
        }

        // Llamamos al padre para que abra el Modal
        onManualSave(payload);
    };

    // --- HANDLER PARA ABRIR MODAL ---
    const handleOpenRecommendations = (row, index) => {
        if (row.bloqueo_notas) {
            showError("Estudiante bloqueado.");
            return;
        }
        setCurrentStudent({ ...row, index });
        setModalOpen(true);
    };

    // --- HANDLER PARA GUARDAR DESDE EL MODAL ---
    const handleSaveRecommendations = async (rec1, rec2) => {
        // Validación de Modo Solo Lectura
        if (isReadOnly) {
            showWarning("La planilla está en modo Solo Lectura.");
            setModalOpen(false);
            return;
        }

        if (!currentStudent) return;
        const index = currentStudent.index;
        const row = gridData[index];

        // 1. Guardamos estado anterior por si hay error (optimistic rollback strategy)
        // o simplemente NO actualizamos hasta confirmar. Haremos lo segundo.

        setSavingIds(prev => ({ ...prev, [currentStudent.estudianteId]: true }));

        try {
            const payload = {
                estudianteId: row.estudianteId,
                fallas: row.fallas,
                notaAcademica: row.notaAcademica,
                notaAcumulativa: row.notaAcumulativa,
                notaLaboral: row.notaLaboral,
                notaSocial: row.notaSocial,
                notaDefinitivaInput: row.notaDefinitiva,
                recomendacionUno: rec1,
                recomendacionDos: rec2
            };

            await onSave(payload);

            // Si tuvo exito, actualizamos la UI (Se renderiza el check azul de observaciones)
            const newData = [...gridData];
            newData[index].recomendacionUno = rec1;
            newData[index].recomendacionDos = rec2;
            newData[index].isDirty = false;
            setGridData(newData);

            showSuccess("Recomendaciones guardadas.");
            setModalOpen(false); // Cerramos modal solo si guardó
            setCurrentStudent(null);

        } catch (error) {
            console.error(error);
            // 4. Si falla, no actualizamos la UI (El icono de agregar observaciones de queda igual)
            // Y mostramos el error correspondiente
            if (error.code === 'REQ_JUSTIFICACION') {
                showWarning("El periodo está cerrado. No se pueden editar observaciones.");
            } else {
                showError(error.message || "No se pudieron guardar las recomendaciones.");
            }
            // NO cerramos el modal para que el usuario vea que falló
        } finally {
            setSavingIds(prev => ({ ...prev, [currentStudent.estudianteId]: false }));
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
        // 1. Validaciones previas
        if (!esComportamiento) {
            const { notaAcademica, notaAcumulativa, notaLaboral, notaSocial } = masterValues;
            // Validar que AL MENOS UN campo tenga valor
            if (!notaAcademica && !notaAcumulativa && !notaLaboral && !notaSocial) {
                showWarning("Para aplicar masivamente, debes diligenciar al menos una nota (Académica, Acumulativa, Laboral o Social).");
                return;
            }
        } else {
            if (!masterValues.notaDefinitivaInput) {
                showWarning("Debes ingresar la nota definitiva para aplicar.");
                return;
            }
        }

        if (!(await showConfirm("¿Estás seguro de sobrescribir las notas de todos los estudiantes habilitados?", "Aplicar Masivamente"))) return;

        // Iteramos sobre los datos actuales
        const habilitados = gridData.filter(r => !r.bloqueo_notas);

        // Contadores
        let successCount = 0;
        let adminJustificationCount = 0; // Solo para Admins (Botón Naranja)
        let teacherBlockedCount = 0;     // Solo para Docentes (Bloqueo Rojo)
        let otherErrorCount = 0;

        // --- 2. Actualización Visual (Preview) ---
        const previewData = gridData.map(row => {
            if (row.bloqueo_notas) return row;
            const updatedRow = { ...row, isDirty: true };

            if (esComportamiento) {
                updatedRow.notaDefinitiva = masterValues.notaDefinitivaInput;
            } else {
                // Solo sobrescribimos si el docente ingresó un valor en la fila maestra.
                // Si el campo está vacío, respetamos el valor individual para no perder datos.
                if (masterValues.notaAcademica) updatedRow.notaAcademica = masterValues.notaAcademica;
                if (masterValues.notaAcumulativa) updatedRow.notaAcumulativa = masterValues.notaAcumulativa;
                if (masterValues.notaLaboral) updatedRow.notaLaboral = masterValues.notaLaboral;
                if (masterValues.notaSocial) updatedRow.notaSocial = masterValues.notaSocial;

                updatedRow.notaDefinitiva = calcularDefinitiva(updatedRow);
            }
            return updatedRow;
        });
        setGridData(previewData);

        // --- 3. Guardado en Base de Datos ---
        for (const row of habilitados) {
            setSavingIds(prev => ({ ...prev, [row.estudianteId]: true }));
            try {
                // Construir payload con los valores MAESTROS
                let payload = {
                    estudianteId: row.estudianteId,
                    fallas: row.fallas,
                    recomendacionUno: row.recomendacionUno,
                    recomendacionDos: row.recomendacionDos
                };
                if (esComportamiento) {
                    payload.notaDefinitivaInput = masterValues.notaDefinitivaInput;
                } else {
                    // Enviamos el valor maestro si existe.
                    // Si está vacío, enviamos el valor que el estudiante ya tenía para no borrarle sus notas previas.
                    payload.notaAcademica = masterValues.notaAcademica || row.notaAcademica;
                    payload.notaAcumulativa = masterValues.notaAcumulativa || row.notaAcumulativa;
                    payload.notaLaboral = masterValues.notaLaboral || row.notaLaboral;
                    payload.notaSocial = masterValues.notaSocial || row.notaSocial;
                }
                await onSave(payload);
                successCount++;

                // Si guarda bien, limpiamos flags
                setGridData(prev => {
                    const copy = [...prev];
                    const idx = copy.findIndex(r => r.estudianteId === row.estudianteId);
                    if (idx !== -1) copy[idx].isDirty = false;
                    return copy;
                });

            } catch (err) {
                // --- LÓGICA DE CLASIFICACIÓN DE ERRORES ---

                // CASO 1: ADMIN - Backend pide justificación explícita
                if (err.code === 'REQ_JUSTIFICACION') {
                    adminJustificationCount++;
                    setPendingJustificationRows(prev => ({ ...prev, [row.estudianteId]: true }));
                }
                // CASO 2: DOCENTE - Backend dice "Cerrado" (Bloqueo total)
                else if (err.message && (err.message.toLowerCase().includes("cerrado") || err.message.toLowerCase().includes("finalizó"))) {
                    teacherBlockedCount++;
                }
                // CASO 3: Otros Errores
                else {
                    otherErrorCount++;
                    console.error(err);
                }
            } finally {
                setSavingIds(prev => ({ ...prev, [row.estudianteId]: false }));
            }
        }

        // --- ALERTAS FINALES ---
        if (successCount > 0) {
            showSuccess(`Se actualizaron ${successCount} registros exitosamente.`);

            // Limpiamos los 4 campos (y el de comportamiento)
            setMasterValues({
                notaAcademica: "",
                notaAcumulativa: "",
                notaLaboral: "",
                notaSocial: "",
                notaDefinitivaInput: ""
            });
        };

        // Mensaje para ADMIN (Naranja)
        if (adminJustificationCount > 0) {
            showWarning(`Atención: ${adminJustificationCount} registros requieren justificación administrativa.`);
        }

        // Mensaje para DOCENTE (Rojo - Específico de fechas)
        if (teacherBlockedCount > 0) {
            showError("No se pudieron guardar las calificaciones porque el periodo académico finalizó.");
        }

        // Mensaje Genérico (Rojo)
        if (otherErrorCount > 0) {
            showError(`Ocurrieron errores técnicos en ${otherErrorCount} registros.`);
        }
    };

    // --- RENDERERS ---

    // Input normal de celda (con peso visual)
    const renderInput = (row, index, field, weight = null) => {
        const isSaving = savingIds[row.estudianteId];
        const hasError = saveErrors[row.estudianteId]; // Si esta fila tiene un error de guardado, la marcamos visualmente con borde rojo permanente

        // ¿Está vacía o es cero?
        const isEmptyOrZero = !row[field] || row[field] === "0.0" || parseFloat(row[field]) === 0;

        let calculatedValue = null;
        if (weight !== null) {
            const val = parseFloat(row[field]);
            calculatedValue = !isNaN(val) ? roundExcel(val * weight) : "-";
        }

        return (
            <div className="flex items-center justify-center gap-1">
                <div className="relative">
                    <input
                        type="text"
                        value={row[field]}
                        onChange={(e) => handleCellChange(index, field, e.target.value)}
                        onBlur={() => handleBlur(index)}
                        onKeyDown={handleKeyDown}
                        disabled={row.bloqueo_notas || isSaving || isReadOnly}
                        className={`navigable-cell w-14 text-center border rounded py-1 px-1 focus:outline-none focus:ring-2 focus:ring-blue-400 font-mono text-sm transition-colors
                        ${row.bloqueo_notas || isReadOnly ? 'bg-gray-100 text-gray-500 cursor-not-allowed border-gray-200' : 'bg-white border-gray-300'}
                        ${row.isDirty && !hasError && !isReadOnly ? 'border-yellow-400 bg-yellow-50' : ''}
                        ${hasError ? 'border-red-500 bg-red-50 ring-1 ring-red-500 shadow-sm' : ''}
                        ${isEmptyOrZero && !hasError ? 'text-red-500 placeholder-red-400 font-bold' : 'text-gray-900'}
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
    if (gridData.length === 0) return <div className="p-10 text-center text-gray-500">No hay estudiantes matriculados en este grupo.</div>;

    return (
        <div className="overflow-x-auto pt-5 px-4 md:px-6 pb-6">
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

                        <th rowSpan="2" className="px-2 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider w-20">
                            <div className="flex flex-col items-center justify-center">
                                <span>Nota Periodo</span>
                                {!esComportamiento && porcentajeArea < 100 && (
                                    <span className="mt-1 bg-blue-50 text-blue-600 text-[9px] px-2 py-0.5 rounded-full lowercase font-bold tracking-normal border border-blue-100">
                                        {porcentajeArea}% del área
                                    </span>
                                )}
                            </div>
                        </th>

                        {/* OCULTAR FALLAS Y OBS SI ES COMPORTAMIENTO */}
                        {!esComportamiento && (
                            <>
                                <th rowSpan="2" className="px-2 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Fallas</th>
                                <th rowSpan="2" className="px-2 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider w-10">Obs.</th>
                            </>
                        )}
                        {/* --- COLUMNA ACCIONES --- */}
                        <th rowSpan="2" className="px-2 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider w-24">Acciones</th>
                    </tr>

                    {/* FILA MAESTRA - Se oculta en modo solo lectura */}
                    {!isReadOnly && (
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
                            {/* Normal: Definitiva(1) + Fallas(1) + Obs(1) = 3 */}
                            {/* Comportamiento: Definitiva(1) = 1 */}
                            <td colSpan={!esComportamiento ? 3 : 1} className="p-1 text-center align-middle">
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
                    )}
                </thead>

                <tbody className="bg-white divide-y divide-gray-200">
                    {gridData.map((row, index) => {
                        // Detectamos si esta fila está en modo "Pendiente de Justificación" o ya tiene una justificación
                        const needsJustification = pendingJustificationRows[row.estudianteId];
                        const hasObservation = row.observacion_cambio && row.observacion_cambio.length > 0;

                        return (
                            <tr key={row.estudianteId} className={`
                            transition-colors
                            ${row.bloqueo_notas ? 'bg-red-50/30' : ''}
                            ${needsJustification ? 'bg-orange-50 border-l-4 border-orange-400' : 'hover:bg-gray-50'}
                        `}>
                                <td className="px-4 py-2 whitespace-nowrap text-xs text-gray-400">{index + 1}</td>

                                <td className="px-4 py-2 whitespace-nowrap">
                                    <div className="flex items-center">
                                        <div>
                                            <div className={`text-sm font-medium ${row.bloqueo_notas ? 'text-red-600' : 'text-gray-900'}`}>{row.nombreCompleto}</div>
                                            <div className="text-xs text-gray-500">{row.documento}</div>
                                        </div>
                                        {row.bloqueo_notas && <div className="ml-2 text-red-500"><FontAwesomeIcon icon={faBan} /></div>}
                                    </div>
                                </td>

                                {!esComportamiento ? (
                                    <>
                                        <td className="px-2 py-2 text-center">{renderInput(row, index, 'notaAcademica', WEIGHTS.academica)}</td>
                                        <td className="px-2 py-2 text-center">{renderInput(row, index, 'notaAcumulativa', WEIGHTS.acumulativa)}</td>
                                        <td className="px-2 py-2 text-center">{renderInput(row, index, 'notaLaboral', WEIGHTS.laboral)}</td>
                                        <td className="px-2 py-2 text-center">{renderInput(row, index, 'notaSocial', WEIGHTS.social)}</td>
                                        <td className="px-2 py-2 text-center bg-gray-50/50">
                                            <div className="flex flex-col items-center justify-center">
                                                <span className={`inline-block w-12 text-center font-bold text-lg leading-none ${parseFloat(row.notaDefinitiva) < 3.0 ? 'text-red-600' : 'text-gray-800'}`}>
                                                    {row.notaDefinitiva || "-"}
                                                </span>

                                                {/* El cálculo del porcentaje */}
                                                {porcentajeArea < 100 && row.notaDefinitiva && (
                                                    <span
                                                        className="text-[11px] font-mono font-bold text-blue-500 mt-1 leading-none bg-white px-1.5 py-0.5 rounded shadow-sm border border-gray-100"
                                                        title={`Aporta ${roundExcel((parseFloat(row.notaDefinitiva) * porcentajeArea) / 100)} a la definitiva del Área`}
                                                    >
                                                        {roundExcel((parseFloat(row.notaDefinitiva) * porcentajeArea) / 100)}
                                                    </span>
                                                )}
                                            </div>
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

                                {/* OCULTAR CELDAS DE FALLAS Y BOTÓN OBS SI ES COMPORTAMIENTO */}
                                {!esComportamiento && (
                                    <>
                                        <td className="px-2 py-2 text-center">
                                            <input type="number" min="0" max="99" value={row.fallas}
                                                onChange={(e) => handleCellChange(index, 'fallas', e.target.value)}
                                                onBlur={() => handleBlur(index)}
                                                onKeyDown={handleKeyDown}
                                                disabled={row.bloqueo_notas || isReadOnly}
                                                className={`navigable-cell w-12 text-center border border-gray-300 rounded text-xs py-1 ${isReadOnly ? 'bg-gray-100 cursor-not-allowed text-gray-500' : ''}`}
                                            />
                                        </td>
                                        <td className="px-2 py-2 text-center">
                                            <button
                                                onClick={() => handleOpenRecommendations(row, index)}
                                                disabled={row.bloqueo_notas}
                                                title={
                                                    isReadOnly
                                                        ? "Ver Recomendaciones (Solo Lectura)"
                                                        : (row.recomendacionUno ? "Editar Recomendaciones" : "Agregar Recomendaciones")
                                                }
                                                className={`
                                                    w-8 h-8 rounded-full flex items-center justify-center transition-colors
                                                    ${row.recomendacionUno
                                                        ? "bg-blue-100 text-blue-600 hover:bg-blue-200"
                                                        : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                                                    }
                                                    ${row.bloqueo_notas ? "opacity-50 cursor-not-allowed grayscale" : ""}
                                                `}
                                            >
                                                {row.recomendacionUno ? <FontAwesomeIcon icon={faCheckCircle} /> : <FontAwesomeIcon icon={faCommentDots} />}
                                            </button>
                                        </td>
                                    </>
                                )}

                                {/* --- COLUMNA ACCIONES --- */}
                                <td className="px-2 py-2 text-center whitespace-nowrap">
                                    {needsJustification && !isReadOnly ? (
                                        <button
                                            onClick={() => handleTriggerManualSave(row)}
                                            className="bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold px-3 py-1.5 rounded shadow-sm flex items-center gap-1 animate-pulse mx-auto"
                                            title="Guardar cambios con justificación"
                                        >
                                            <FontAwesomeIcon icon={faSave} />Guardar
                                        </button>
                                    ) : hasObservation ? (// Botón para VER/EDITAR lo existente
                                        <button
                                            onClick={() => handleTriggerManualSave(row)} // Reutilizamos el trigger, el modal detectará que ya hay datos
                                            className="text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 p-2 rounded-full transition"
                                            title="Ver justificación y evidencia"
                                        >
                                            <FontAwesomeIcon icon={faEye} />
                                        </button>
                                    ) : (
                                        row.isDirty && <span className="text-xs text-yellow-600 italic"><FontAwesomeIcon icon={faExclamationCircle} /> Sin guardar</span>
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>

            {/* RENDERIZADO DEL MODAL DE RECOMENDACIONES */}
            <RecomendacionesModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onSave={handleSaveRecommendations}
                studentName={currentStudent?.nombreCompleto || ""}
                initialRec1={currentStudent?.recomendacionUno}
                initialRec2={currentStudent?.recomendacionDos}
                bancoOptions={bancoRecomendaciones}
                isReadOnly={isReadOnly}
            />
        </div >
    );
};

export default GrillaCalificaciones;