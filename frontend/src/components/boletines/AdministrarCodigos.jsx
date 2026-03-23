import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext.jsx";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faKey, faSearch, faSpinner, faLockOpen, faLock, faDownload } from "@fortawesome/free-solid-svg-icons";
import { fetchBoletinesCatalogs, fetchCodigosPorGrupo, toggleEstadoCodigo } from "../../api/boletinesService.js";
import { fetchGruposFiltrados } from "../../api/cargasService.js";
import { showError, showWarning } from "../../utils/notifications.js";
import { formatearJornada } from "../../utils/formatters.js";
import Swal from "sweetalert2";

const AdministrarCodigos = () => {
    const [catalogos, setCatalogos] = useState({ sedes: [], grados: [], grupos: [] });
    const [formData, setFormData] = useState({ sedeId: "", gradoId: "", grupoId: "", periodo: "" });
    const [busqueda, setBusqueda] = useState("");

    const [codigos, setCodigos] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadingToggle, setLoadingToggle] = useState(null); // Guarda el ID del código que se está actualizando

    const { user, vigenciaActual } = useAuth();

    const inputClasses = "w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition disabled:bg-gray-100 disabled:text-gray-500";
    const labelClasses = "block text-sm font-medium text-gray-700 mb-1";

    // --- CARGA INICIAL DE CATÁLOGOS ---
    useEffect(() => {
        const init = async () => {
            try {
                const cats = await fetchBoletinesCatalogs();
                setCatalogos(prev => ({ ...prev, sedes: cats.sedes, grados: cats.grados }));
            } catch (err) {
                console.error(err);
                showError("Error al cargar sedes y grados.");
            }
        };
        init();
    }, []);

    // --- EFECTO: CARGAR GRUPOS ---
    useEffect(() => {
        const cargarGrupos = async () => {
            if (!formData.sedeId || !formData.gradoId) {
                setCatalogos(prev => ({ ...prev, grupos: [] }));
                return;
            }
            const grupos = await fetchGruposFiltrados(formData.sedeId, formData.gradoId);
            setCatalogos(prev => ({ ...prev, grupos }));
        };
        cargarGrupos();
    }, [formData.sedeId, formData.gradoId]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));

        if (name === "sedeId" || name === "gradoId") {
            setFormData(prev => ({ ...prev, grupoId: "" }));
        }
    };

    // --- BUSCAR CÓDIGOS ---
    const handleBuscar = async (e) => {
        if (e) e.preventDefault();
        if (!formData.grupoId || !formData.periodo) {
            return showWarning("Seleccione un grupo y un periodo para buscar.");
        }

        try {
            setLoading(true);

            const data = await fetchCodigosPorGrupo(formData.grupoId, formData.periodo, busqueda);
            setCodigos(data);

            if (data.length === 0) {
                showWarning("No se encontraron códigos generados para este grupo y periodo.");
            }
        } catch (error) {
            showError(error.message);
        } finally {
            setLoading(false);
        }
    };

    // --- CAMBIAR ESTADO (BOTÓN DE PÁNICO) ---
    const handleToggleEstado = async (codigo) => {
        const accion = codigo.activo ? 'bloquear' : 'desbloquear';

        const confirm = await Swal.fire({
            title: `¿${accion.charAt(0).toUpperCase() + accion.slice(1)} acceso?`,
            text: `El acudiente ${codigo.activo ? 'ya no podrá' : 'ahora podrá'} descargar el boletín con este código.`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: codigo.activo ? '#d33' : '#3085d6',
            cancelButtonColor: '#6b7280',
            confirmButtonText: `Sí, ${accion}`,
            cancelButtonText: 'Cancelar'
        });

        if (confirm.isConfirmed) {
            try {
                setLoadingToggle(codigo.id);
                await toggleEstadoCodigo(codigo.id, !codigo.activo);

                // Actualizamos el estado local para no recargar toda la tabla
                setCodigos(prev => prev.map(c =>
                    c.id === codigo.id ? { ...c, activo: !c.activo } : c
                ));

                Swal.fire({
                    icon: 'success',
                    title: 'Estado actualizado',
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 2000
                });
            } catch (error) {
                showError(error.message);
            } finally {
                setLoadingToggle(null);
            }
        }
    };

    return (
        <div className="min-h-full bg-[#f7f9fc] p-4 md:p-8 font-inter">
            <div className="max-w-6xl mx-auto space-y-6">

                {/* TÍTULO */}
                <div className="flex items-center pb-2 border-b border-gray-200">
                    <FontAwesomeIcon icon={faKey} className="text-3xl text-indigo-600 mr-3" />
                    <h1 className="text-2xl font-bold text-slate-800">Administración de Códigos de Boletín</h1>
                </div>

                {/* FILTROS */}
                <div className="bg-white rounded-xl shadow-md border border-gray-100 p-6">
                    <form onSubmit={handleBuscar} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                                <label className={labelClasses}>Sede</label>
                                <select name="sedeId" value={formData.sedeId} onChange={handleChange} className={inputClasses} required>
                                    <option value="">-- Seleccione --</option>
                                    {catalogos.sedes.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className={labelClasses}>Grado</label>
                                <select name="gradoId" value={formData.gradoId} onChange={handleChange} className={inputClasses} required>
                                    <option value="">-- Seleccione --</option>
                                    {catalogos.grados.map(g => <option key={g.id} value={g.id}>{g.nombre}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className={labelClasses}>Grupo</label>
                                <select name="grupoId" value={formData.grupoId} onChange={handleChange} className={inputClasses} disabled={!formData.gradoId} required>
                                    <option value="">{!formData.gradoId ? "Elija Grado" : "-- Seleccione --"}</option>
                                    {catalogos.grupos.map(g => <option key={g.id} value={g.id}>{g.nombre} ({formatearJornada(g.jornada)})</option>)}
                                </select>
                            </div>
                            <div>
                                <label className={labelClasses}>Periodo</label>
                                <select name="periodo" value={formData.periodo} onChange={handleChange} className={inputClasses} required>
                                    <option value="">-- Seleccione --</option>
                                    <option value="1">Primer Periodo</option>
                                    <option value="2">Segundo Periodo</option>
                                    <option value="3">Tercer Periodo</option>
                                    <option value="4">Cuarto Periodo</option>
                                    <option value="5">Informe Final</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex flex-col md:flex-row gap-4 items-end border-t border-gray-100 pt-4 mt-4">
                            <div className="flex-1 w-full">
                                <label className={labelClasses}>Búsqueda específica (Opcional)</label>
                                <input
                                    type="text"
                                    placeholder="Nombre, Apellido, Documento o Código..."
                                    value={busqueda}
                                    onChange={(e) => setBusqueda(e.target.value)}
                                    className={inputClasses}
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full md:w-auto px-6 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-bold shadow-sm flex items-center justify-center gap-2 transition-transform active:scale-95 disabled:opacity-70"
                            >
                                <FontAwesomeIcon icon={loading ? faSpinner : faSearch} spin={loading} />
                                {loading ? "Buscando..." : "Consultar Códigos"}
                            </button>
                        </div>
                    </form>
                </div>

                {/* TABLA DE RESULTADOS */}
                {codigos.length > 0 && (
                    <div className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden animate-fade-in">
                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Estudiante</th>
                                        <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Código de Acceso</th>
                                        <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Descargas</th>
                                        <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Estado</th>
                                        <th className="px-6 py-3 text-center text-xs font-bold text-gray-500 uppercase tracking-wider">Acción</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {codigos.map((c) => (
                                        <tr key={c.id} className="hover:bg-indigo-50/30 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-bold text-gray-900">
                                                    {c.matricula?.estudiante?.primerApellido} {c.matricula?.estudiante?.primerNombre}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    Doc: {c.matricula?.estudiante?.documento}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <span className="px-3 py-1 inline-flex text-sm leading-5 font-mono font-bold rounded-md bg-gray-100 text-gray-800 border border-gray-200">
                                                    {c.codigo}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <div className={`text-sm font-bold ${c.descargas > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                                                    <FontAwesomeIcon icon={faDownload} className="mr-1" />
                                                    {c.descargas}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${c.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                    {c.activo ? 'Permitido' : 'Bloqueado'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                                                <button
                                                    onClick={() => handleToggleEstado(c)}
                                                    disabled={loadingToggle === c.id}
                                                    className={`px-3 py-1.5 rounded-md text-white font-bold transition-transform active:scale-95 disabled:opacity-50 ${c.activo ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'}`}
                                                    title={c.activo ? "Bloquear descarga" : "Permitir descarga"}
                                                >
                                                    {loadingToggle === c.id ? (
                                                        <FontAwesomeIcon icon={faSpinner} spin />
                                                    ) : (
                                                        <FontAwesomeIcon icon={c.activo ? faLock : faLockOpen} />
                                                    )}
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdministrarCodigos;