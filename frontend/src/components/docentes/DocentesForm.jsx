import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSave, faTimes } from "@fortawesome/free-solid-svg-icons";

// --- CONSTANTES PARA SELECTS ---
const NIVEL_EDUCATIVO_OPTIONS = [
    { value: "NS", label: "Normalista Superior" },
    { value: "TC", label: "Técnico o Tecnólogo en Educación" },
    { value: "LC", label: "Licenciatura" },
    { value: "PF", label: "Profesional (No Licenciado)" },
    { value: "ES", label: "Especialización" },
    { value: "MA", label: "Maestría" },
    { value: "DO", label: "Doctorado" },
    { value: "OT", label: "Otro" }
];

const NIVEL_ENSENANZA_OPTIONS = [
    { value: "PE", label: "Preescolar" },
    { value: "BP", label: "Básica Primaria" },
    { value: "BS", label: "Básica Secundaria" },
    { value: "MA", label: "Media Académica" },
    { value: "OT", label: "Otro" }
];

const VINCULACION_OPTIONS = [
    { value: "PD", label: "Propiedad" },
    { value: "PP", label: "Periodo de Prueba" },
    { value: "PV", label: "Provisionalidad" },
    { value: "TR", label: "Temporalidad" },
    { value: "OT", label: "Otro" }
];

const DocentesForm = ({
    formData,
    mode,
    loading,
    handleChange,
    handleSubmit,
    resetForm,
}) => {
    const inputClasses = "w-full border border-gray-300 rounded-md p-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition";
    const labelClasses = "block text-sm font-medium text-gray-700 mb-1";

    return (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-md border border-gray-100">

            <div className="flex justify-between items-center border-b border-gray-300 pb-2 mb-4">
                <h3 className="text-lg font-semibold text-gray-700">
                    {mode === 'agregar' ? 'Registrar Nuevo Docente' : 'Editar Docente'}
                </h3>

                {/* Switch de ACTIVO (Solo visible al editar o crear si se desea) */}
                <div className="flex items-center">
                    <label className="mr-2 text-sm font-medium text-gray-600">Estado:</label>

                    {/* Botón tipo Toggle */}
                    <button
                        type="button"
                        onClick={() => handleChange({ target: { name: 'activo', value: !formData.activo } })}
                        className={`${formData.activo ? 'bg-green-500' : 'bg-gray-300'}
                            relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none`}
                    >
                        <span className={`${formData.activo ? 'translate-x-6' : 'translate-x-1'}
                            inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                        />
                    </button>
                    <span className="ml-2 text-xs font-semibold">{formData.activo ? 'ACTIVO' : 'INACTIVO'}</span>
                </div>
            </div>

            {/* SECCIÓN 1: DATOS PERSONALES */}
            <div className="mb-6">
                <h4 className="text-sm font-bold text-blue-800 border-b border-blue-100 mb-3 pb-1">Datos Personales y de Contacto</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

                    <div>
                        <label className={labelClasses}>Documento <span className="text-red-500">*</span></label>
                        <input type="text" name="documento" value={formData.documento} onChange={handleChange} className={inputClasses} maxLength={20} required />
                    </div>

                    <div>
                        <label className={labelClasses}>Nombres <span className="text-red-500">*</span></label>
                        <input type="text" name="nombre" value={formData.nombre} onChange={handleChange} className={inputClasses} required />
                    </div>

                    <div>
                        <label className={labelClasses}>Apellidos <span className="text-red-500">*</span></label>
                        <input type="text" name="apellidos" value={formData.apellidos} onChange={handleChange} className={inputClasses} required />
                    </div>

                    <div>
                        <label className={labelClasses}>Fecha Nacimiento</label>
                        <input type="date" name="fechaNacimiento" value={formData.fechaNacimiento} onChange={handleChange} className={inputClasses} />
                    </div>

                    <div>
                        <label className={labelClasses}>Correo Electrónico  <span className="text-red-500">*</span></label>
                        <input type="email" name="email" value={formData.email} onChange={handleChange} className={inputClasses} required />
                    </div>

                    <div>
                        <label className={labelClasses}>Teléfono</label>
                        <input type="text" name="telefono" value={formData.telefono} onChange={handleChange} className={inputClasses} maxLength={12} />
                    </div>

                    <div className="lg:col-span-2">
                        <label className={labelClasses}>Dirección de Residencia</label>
                        <input type="text" name="direccion" value={formData.direccion} onChange={handleChange} className={inputClasses} maxLength={150} placeholder="Ej: Calle 10 # 5-20" />
                    </div>
                </div>
            </div>

            {/* SECCIÓN 2: PERFIL PROFESIONAL */}
            <div className="mb-6">
                <h4 className="text-sm font-bold text-blue-800 border-b border-blue-100 mb-3 pb-1">Perfil Profesional</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

                    <div>
                        <label className={labelClasses}>Nivel Educativo <span className="text-red-500">*</span></label>
                        <select name="nivelEducativo" value={formData.nivelEducativo} onChange={handleChange} className={inputClasses} required>
                            <option value="">Seleccione...</option>
                            {NIVEL_EDUCATIVO_OPTIONS.map(op => <option key={op.value} value={op.value}>{op.label}</option>)}
                        </select>
                    </div>

                    <div className="lg:col-span-2">
                        <label className={labelClasses}>Título / Profesión</label>
                        <input type="text" name="profesion" value={formData.profesion} onChange={handleChange} className={inputClasses} placeholder="Ej: Licenciado en Matemáticas" maxLength={100} />
                    </div>

                    <div>
                        <label className={labelClasses}>Área de Enseñanza</label>
                        <input type="text" name="areaEnsenanza" value={formData.areaEnsenanza} onChange={handleChange} className={inputClasses} placeholder="Ej: Matemáticas" maxLength={100} />
                    </div>
                </div>
            </div>

            {/* SECCIÓN 3: INFORMACIÓN ADMINISTRATIVA Y VINCULACIÓN */}
            <div className="mb-6">
                <h4 className="text-sm font-bold text-blue-800 border-b border-blue-100 mb-3 pb-1">Información Administrativa y Nombramiento</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

                    <div>
                        <label className={labelClasses}>Tipo Vinculación <span className="text-red-500">*</span></label>
                        <select name="vinculacion" value={formData.vinculacion} onChange={handleChange} className={inputClasses} required>
                            <option value="">Seleccione...</option>
                            {VINCULACION_OPTIONS.map(op => <option key={op.value} value={op.value}>{op.label}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className={labelClasses}>Nivel Enseñanza <span className="text-red-500">*</span></label>
                        <select name="nivelEnsenanza" value={formData.nivelEnsenanza} onChange={handleChange} className={inputClasses} required>
                            <option value="">Seleccione...</option>
                            {NIVEL_ENSENANZA_OPTIONS.map(op => <option key={op.value} value={op.value}>{op.label}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className={labelClasses}>Decreto Ley</label>
                        <input type="text" name="decretoLey" value={formData.decretoLey} onChange={handleChange} className={inputClasses} placeholder="Ej: 1278" maxLength={10} />
                    </div>

                    <div>
                        <label className={labelClasses}>Escalafón</label>
                        <input type="text" name="escalafon" value={formData.escalafon} onChange={handleChange} className={inputClasses} placeholder="Ej: 2A" maxLength={10} />
                    </div>

                    <div>
                        <label className={labelClasses}>Decreto de Nombramiento</label>
                        <input type="text" name="decretoNombrado" value={formData.decretoNombrado} onChange={handleChange} className={inputClasses} maxLength={10} />
                    </div>

                    <div>
                        <label className={labelClasses}>Fecha Nombramiento</label>
                        <input type="date" name="fechaNombrado" value={formData.fechaNombrado} onChange={handleChange} className={inputClasses} />
                    </div>

                    <div>
                        <label className={labelClasses}>Fecha Ingreso</label>
                        <input type="date" name="fechaIngreso" value={formData.fechaIngreso} onChange={handleChange} className={inputClasses} />
                    </div>

                    <div>
                        <label className={labelClasses}>Fecha Retiro</label>
                        <input type="date" name="fechaRetiro" value={formData.fechaRetiro} onChange={handleChange} className={inputClasses} />
                    </div>
                </div>
            </div>

            {/* BOTONES DE ACCIÓN */}
            <div className="pt-4 flex justify-center space-x-3 border-t border-[#eee] mt-6">
                <button
                    type="submit" disabled={loading}
                    className="bg-blue-600 text-white px-5 py-2 rounded-lg shadow-md hover:bg-blue-700 transition duration-150 flex items-center"
                >
                    <FontAwesomeIcon icon={faSave} className="mr-2" />
                    {mode === 'agregar' ? 'Guardar' : 'Guardar Cambios'}
                </button>

                <button
                    type="button" onClick={resetForm} disabled={loading}
                    className="bg-red-500 text-white px-5 py-2 rounded-lg shadow-md hover:bg-red-600 transition duration-150 flex items-center hover:scale-[1.01]"
                >
                    <FontAwesomeIcon icon={faTimes} className="mr-2" /> Cancelar
                </button>
            </div>
        </form>
    );
};

export default DocentesForm;