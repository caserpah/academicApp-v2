import React, { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEdit, faCheckCircle, faTimesCircle, faBalanceScale } from "@fortawesome/free-solid-svg-icons";
import { showSuccess, showError } from "../../utils/notifications.js";
import { guardarNivelacion } from "../../api/nivelacionesService.js";
import ActaNivelacionModal from "./ActaNivelacionModal.jsx";

const GrillaNivelaciones = ({ students = [], onSaveSuccess }) => {
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState(null);

    // Formatear datos del backend para la tabla
    const formatStudentData = (item) => {
        const est = item.matricula.estudiante;
        return {
            matriculaId: item.matriculaId,
            asignaturaId: item.asignaturaId,
            documento: est.documento,
            nombreCompleto: `${est.primerApellido} ${est.segundoApellido || ''} ${est.primerNombre} ${est.segundoNombre || ''}`,
            notaDefinitivaOriginal: item.notaDefinitivaOriginal,
            estadoOriginal: item.estadoOriginal,
            notaNivelacion: item.notaNivelacion,
            notaFinalLegal: item.notaFinalLegal,
            estadoFinal: item.estadoFinal,
            observacion_nivelacion: item.observacion_nivelacion,
            url_evidencia_nivelacion: item.url_evidencia_nivelacion
        };
    };

    const handleOpenModal = (row) => {
        setSelectedStudent(row);
        setModalOpen(true);
    };

    const handleConfirmNivelacion = async (formDataParsed) => {
        try {
            // formDataParsed trae: notaNivelacion, observacion_nivelacion, evidencia
            await guardarNivelacion(
                selectedStudent.matriculaId,
                selectedStudent.asignaturaId,
                formDataParsed
            );

            showSuccess("Nivelación registrada exitosamente. El sistema ha aplicado la regla de promoción.");
            setModalOpen(false);

            // Refrescar grilla desde el padre
            if (onSaveSuccess) onSaveSuccess();

        } catch (error) {
            showError(error.message || "No se pudo registrar la nivelación.");
            throw error; // Para que el Modal no se cierre y muestre el error
        }
    };

    // Renderizado de las "píldoras" de estado
    const renderEstadoBadge = (estado) => {
        if (estado === "APROBADO") {
            return <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-[10px] font-bold tracking-wider"><FontAwesomeIcon icon={faCheckCircle} /> APROBADO</span>;
        }
        if (estado === "NIVELADO") {
            return <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-[10px] font-bold tracking-wider"><FontAwesomeIcon icon={faBalanceScale} /> NIVELADO</span>;
        }
        return <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full text-[10px] font-bold tracking-wider"><FontAwesomeIcon icon={faTimesCircle} /> REPROBADO</span>;
    };

    return (
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider w-10">#</th>
                        <th className="px-4 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Estudiante Reprobado</th>
                        <th className="px-3 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider bg-red-50/50">Nota Año</th>
                        <th className="px-3 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider bg-blue-50/50">Examen Niv.</th>
                        <th className="px-3 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider bg-gray-100">Nota Legal</th>
                        <th className="px-3 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Estado Final</th>
                        <th className="px-3 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Acciones</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                    {students.map((item, index) => {
                        const row = formatStudentData(item);
                        return (
                            <tr key={row.matriculaId} className="hover:bg-gray-50 transition-colors">
                                <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-400">{index + 1}</td>

                                <td className="px-4 py-3 whitespace-nowrap">
                                    <div className="text-sm font-medium text-gray-900">{row.nombreCompleto}</div>
                                    <div className="text-xs text-gray-500">{row.documento}</div>
                                </td>

                                {/* Nota Original (Roja por defecto porque están reprobados) */}
                                <td className="px-3 py-3 text-center bg-red-50/20">
                                    <span className="font-bold text-red-600 text-sm">{row.notaDefinitivaOriginal}</span>
                                </td>

                                {/* Nota Nivelación (Si existe) */}
                                <td className="px-3 py-3 text-center bg-blue-50/20">
                                    <span className={`font-bold text-sm ${row.notaNivelacion ? 'text-blue-700' : 'text-gray-300'}`}>
                                        {row.notaNivelacion || "-"}
                                    </span>
                                </td>

                                {/* Nota Final Legal (La que va al boletín) */}
                                <td className="px-3 py-3 text-center bg-gray-50">
                                    <span className={`font-bold text-base ${parseFloat(row.notaFinalLegal) >= 3.0 ? 'text-green-600' : 'text-red-600'}`}>
                                        {row.notaFinalLegal}
                                    </span>
                                </td>

                                {/* Estado con Badge */}
                                <td className="px-3 py-3 text-center">
                                    {renderEstadoBadge(row.estadoFinal)}
                                </td>

                                {/* Botón de Evaluar */}
                                <td className="px-3 py-3 text-center">
                                    <button
                                        onClick={() => handleOpenModal(row)}
                                        className={`px-3 py-1.5 rounded shadow-sm text-xs font-bold text-white transition-transform active:scale-95 flex items-center gap-2 mx-auto
                                            ${row.notaNivelacion ? 'bg-indigo-500 hover:bg-indigo-600' : 'bg-blue-600 hover:bg-blue-700 animate-pulse'}
                                        `}
                                    >
                                        <FontAwesomeIcon icon={faEdit} />
                                        {row.notaNivelacion ? "Editar Acta" : "Evaluar"}
                                    </button>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>

            {/* Modal Invísible hasta que se haga clic */}
            <ActaNivelacionModal
                isOpen={modalOpen}
                onClose={() => setModalOpen(false)}
                onConfirm={handleConfirmNivelacion}
                studentData={selectedStudent}
            />
        </div>
    );
};

export default GrillaNivelaciones;