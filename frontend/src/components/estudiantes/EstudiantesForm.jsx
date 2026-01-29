import React, { useState, useEffect } from "react";
import { crearEstudiante, actualizarEstudiante, obtenerEstudiante } from "../../api/estudiantesService.js";
import { showSuccess, showError, showWarning } from "../../utils/notifications.js";
import AcudientesTab from "./AcudientesTab.jsx";
import CreatableSelect from "react-select/creatable"
import { municipiosColombia } from "../../data/municipiosColombia.js";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faSave, faTimes } from "@fortawesome/free-solid-svg-icons";

// --- CONSTANTES (ENUMS) ---
const TIPOS_DOC = ["RC", "TI", "CC", "CE", "PA", "NIP", "NUIP", "NES"];
const SEXOS = [
    { val: "M", label: "Masculino" },
    { val: "F", label: "Femenino" },
    { val: "I", label: "Intersexual" }
];
const VICTIMAS = [
    { val: "NA", label: "No Aplica" },
    { val: "DPZ", label: "Desplazado" },
    { val: "DGA", label: "Desmovilizado" },
    { val: "HDZ", label: "Hijo de Desmovilizado" },
    { val: "OTR", label: "Otro" }
];
const DISCAPACIDADES = [
    { val: "NINGUNA", label: "Ninguna" },
    { val: "FISICA", label: "Física" },
    { val: "AUDITIVA", label: "Auditiva" },
    { val: "VISUAL", label: "Visual" },
    { val: "INTELECTUAL", label: "Intelectual" },
    { val: "PSICOSOCIAL", label: "Psicosocial" },
    { val: "MULTIPLE", label: "Múltiple" },
    { val: "SORDOCEGUERA", label: "Sordoceguera" },
    { val: "OTRA", label: "Otra" }
];
const CAPACIDADES = [
    { val: "NA", label: "No Aplica" },
    { val: "SD", label: "Superdotado" },
    { val: "CTC", label: "Talento Científico" },
    { val: "CTT", label: "Talento Tecnológico" },
    { val: "CTS", label: "Talento Subjetivo" }
];
const ETNIAS = [
    { val: "NO_APLICA", label: "No Aplica" },
    { val: "INDIGENA", label: "Indígena" },
    { val: "AFROCOLOMBIANO", label: "Afrocolombiano" },
    { val: "RAIZAL", label: "Raizal" },
    { val: "ROM_GITANO", label: "ROM / Gitano" }
];

// Mapa de campos vs. Pestaña donde se encuentran
const TAB_MAP = {
    // Tab 1: Personal
    tipoDocumento: 1,
    documento: 1,
    primerNombre: 1,
    segundoNombre: 1,
    primerApellido: 1,
    segundoApellido: 1,
    fechaNacimiento: 1,
    sexo: 1,

    // Tab 2: Ubicación
    direccion: 2,
    barrio: 2,
    contacto: 2,
    estrato: 2,
    sisben: 2,

    // Tab 3: Caracterización
    eps: 3,
    rh: 3,
    victimas: 3,
    discapacidad: 3,
    capacidades: 3,
    etnia: 3
};

// Estado Inicial del Formulario
const INITIAL_STATE = {
    tipoDocumento: "",
    documento: "",
    lugarExpedicion: "",
    primerNombre: "",
    segundoNombre: "",
    primerApellido: "",
    segundoApellido: "",
    fechaNacimiento: "",
    lugarNacimiento: "",
    sexo: "",
    rh: "",
    municipioResidencia: "",
    direccion: "",
    barrio: "",
    contacto: "",
    estrato: null,
    sisben: "",
    subsidiado: true,
    eps: "",
    victimas: "NA",
    discapacidad: "NINGUNA",
    capacidades: "NA",
    etnia: "NO_APLICA",
    acudientes: [] // Inicializamos array de acudientes
};

// Componente Input Reutilizable
const InputGroup = ({ label, name, value, onChange, type = "text", required = false, width = "col-span-1" }) => (
    <div className={width}>
        <label className="block text-sm font-medium text-gray-700 mb-1">
            {label} {required && <span className="text-red-500">*</span>}
        </label>
        <input
            type={type}
            name={name}
            value={value || ""}
            onChange={onChange}
            required={required}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500 outline-none uppercase"
        />
    </div>
);

// Componente Select Reutilizable
const SelectGroup = ({ label, name, value, onChange, options, required = false, width = "col-span-1", mapOption }) => (
    <div className={width}>
        <label className="block text-sm font-medium text-gray-700 mb-1">
            {label} {required && <span className="text-red-500">*</span>}
        </label>
        <select
            name={name}
            value={value || ""}
            onChange={onChange}
            required={required}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500 outline-none bg-white"
        >
            <option value="">-- Seleccione --</option>
            {options.map((opt, idx) => {
                const val = mapOption ? opt.val : opt;
                const txt = mapOption ? opt.label : opt;
                return <option key={idx} value={val}>{txt}</option>;
            })}
        </select>
    </div>
);

// --- COMPONENTE PRINCIPAL ---
const EstudiantesForm = ({ estudianteEditar, onClose, onSuccess }) => {
    const [formData, setFormData] = useState(INITIAL_STATE);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState(1); // Pestañas -> 1: Personal, 2: Ubicación, 3: Caracterización, 4: Acudientes

    // Cargar datos si estamos editando
    useEffect(() => {
        if (estudianteEditar) {
            // Esto rellena los campos básicos visualmente al instante
            setFormData({
                ...INITIAL_STATE, // Asegura que existan todos los campos
                ...estudianteEditar,
                // Formato YYYY-MM-DD
                fechaNacimiento: estudianteEditar.fechaNacimiento ? estudianteEditar.fechaNacimiento.split('T')[0] : "",
                subsidiado: estudianteEditar.subsidiado,
                acudientes: [] // Inicializamos vacío para evitar errores mientras carga
            });
            // Cargar acudientes por separado para evitar sobrecarga inicial
            const cargarDetallesCompletos = async () => {
                try {
                    const dataFresca = await obtenerEstudiante(estudianteEditar.id);

                    // Cuando llegue la respuesta, actualizamos SOLO la lista de acudientes
                    // (o cualquier otro dato que no viniera en la tabla)
                    if (dataFresca && dataFresca.acudientes) {
                        setFormData(prevState => ({
                            ...prevState,
                            acudientes: dataFresca.acudientes
                        }));
                    }
                } catch (error) {
                    console.error("No se pudieron cargar los acudientes:", error);
                }
            };

            cargarDetallesCompletos();
        }
    }, [estudianteEditar]);

    // HELPER 1: Convertir texto plano a objeto {label, value} para el Select
    const getValueForSelect = (value) => {
        if (!value) return null;
        return { label: value, value: value };
    };

    // HELPER 2: Manejador especial para React-Select
    const handleSelectChange = (newValue, actionMeta) => {
        const fieldName = actionMeta.name;
        const valueToSave = newValue ? newValue.value : '';

        setFormData(prev => ({
            ...prev,
            [fieldName]: valueToSave
        }));
    };

    // ESTILOS para que combine con Tailwind
    const customStyles = {
        control: (base, state) => ({
            ...base,
            borderColor: state.isFocused ? '#3b82f6' : '#d1d5db',
            borderRadius: '0.375rem',
            minHeight: '42px',
            boxShadow: state.isFocused ? '0 0 0 1px #3b82f6' : null,
            '&:hover': { borderColor: '#3b82f6' }
        }),
        menu: (base) => ({ ...base, zIndex: 9999 }),
        placeholder: (base) => ({ ...base, color: '#9ca3af' }),

        menuPortal: (base) => ({ ...base, zIndex: 9999 })
    };

    // Manejo de cambios en inputs
    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;

        let valorFinal = value;

        if (type === "checkbox") {
            valorFinal = checked;
        }
        // --- LÓGICA ESPECÍFICA PARA ESTRATO ---
        else if (name === "estrato") {
            // Eliminar cualquier caracter que NO sea un número (0-9)
            const soloNumeros = value.replace(/[^0-9]/g, "");

            // Si queda vacío, guardar null (para la BD); si no, guardar el número limpio
            valorFinal = soloNumeros === "" ? null : soloNumeros;
        }
        // Agregar aquí otros campos numéricos aquí si se necesita

        setFormData((prev) => ({
            ...prev,
            [name]: valorFinal
        }));
    };

    // Función para calcular edad basada en la fecha actual
    const calcularEdad = (fecha) => {
        if (!fecha) return "";
        const hoy = new Date();
        const nacimiento = new Date(fecha);
        let edad = hoy.getFullYear() - nacimiento.getFullYear();
        const m = hoy.getMonth() - nacimiento.getMonth();

        // Ajustar si aún no ha cumplido años este año
        if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) {
            edad--;
        }

        return isNaN(edad) ? "" : edad + " años";
    };

    // Función para refrescar los datos (usada por AcudientesTab) sin cambiar al modo crear
    const handleRefreshEstudiante = async () => {
        if (!formData.id) return;
        try {
            // Traemos el estudiante actualizado desde la BD (incluyendo nuevos acudientes)
            const actualizado = await obtenerEstudiante(formData.id);

            setFormData(prev => ({
                ...prev,
                acudientes: actualizado.acudientes || []
            }));
        } catch (error) {
            console.error("Error al refrescar estudiante:", error);
        }
    };

    // Función para enfocar el primer campo con error y cambiar de pestaña si es necesario
    const enfocarError = (campo) => {
        const tabDestino = TAB_MAP[campo];
        if (tabDestino) {
            setActiveTab(tabDestino); // Cambiar pestaña
            setTimeout(() => { // Esperar render y enfocar
                const el = document.querySelector(`[name="${campo}"]`);
                if (el) {
                    el.focus();
                    el.classList.add("ring-2", "ring-red-500", "animate-pulse"); // Efecto visual
                    setTimeout(() => el.classList.remove("ring-2", "ring-red-500", "animate-pulse"), 2000);
                }
            }, 100);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const camposRequeridos = [
            "tipoDocumento", "documento", "primerNombre", "primerApellido",
            "fechaNacimiento", "sexo", "victimas", "discapacidad", "etnia", "capacidades"
        ];

        // Buscar el primer campo vacío
        const campoFaltante = camposRequeridos.find(c => !formData[c] || formData[c] === "");

        if (campoFaltante) {
            showWarning("Todos los campos obligatorios (<span class='text-[#e74c3c]'>*</span>) deben completarse.");
            enfocarError(campoFaltante); // Ir a la pestaña y enfocar
            return;
        }

        setLoading(true);
        try {
            if (estudianteEditar || formData.id) {
                await actualizarEstudiante(estudianteEditar?.id || formData.id, formData);
                showSuccess("Estudiante actualizado exitosamente.");
                onSuccess(); //Refrescar lista de estudiantes
            } else {
                await crearEstudiante(formData);
                showSuccess("Estudiante registrado exitosamente.");
                setFormData(INITIAL_STATE); // Resetear formulario
                setActiveTab(1); // Volver a la primera pestaña

                // Enfocar el primer campo
                setTimeout(() => {
                    document.querySelector('[name="tipoDocumento"]')?.focus();
                }, 100);

                onSuccess(); //Refrescar lista de estudiantes
            }
        } catch (error) {
            const msg = error.message.toLowerCase();
            if (msg.includes("documento")) enfocarError("documento");

            showError(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex flex-col h-full">

            {/* TABS DE NAVEGACIÓN */}
            <div className="flex border-b border-gray-200 mb-6 overflow-x-auto">
                {[
                    { id: 1, label: "Información Personal" },
                    { id: 2, label: "Ubicación y Contacto" },
                    { id: 3, label: "Salud y Caracterización" },
                    { id: 4, label: "Acudientes" }
                ].map((tab) => (
                    <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveTab(tab.id)}
                        className={`px-4 py-2 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === tab.id
                            ? "border-blue-600 text-blue-600"
                            : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* CONTENIDO DE LOS TABS */}
            <div className="flex-1 overflow-y-auto px-1 pb-4">

                {/* TAB 1: INFORMACIÓN PERSONAL */}
                {activeTab === 1 && (
                    <div className="grid grid-cols-1 md:grid-cols-6 gap-4">

                        {/* FILA 1: Tipo, Documento, Lugar Expedición (3 Columnas) */}
                        <SelectGroup
                            label="Tipo Documento"
                            name="tipoDocumento"
                            value={formData.tipoDocumento}
                            onChange={handleChange}
                            options={TIPOS_DOC}
                            width="md:col-span-2"
                        />
                        <InputGroup
                            label="Número Documento"
                            name="documento"
                            value={formData.documento}
                            onChange={handleChange}
                            width="md:col-span-2"
                        />

                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Lugar de Expedición</label>
                            <CreatableSelect
                                name="lugarExpedicion"
                                className="w-full rounded-md focus:ring-blue-500 focus:border-blue-500"
                                options={municipiosColombia}
                                value={getValueForSelect(formData.lugarExpedicion)}
                                onChange={handleSelectChange}
                                isClearable
                                placeholder="Buscar municipio..."
                                formatCreateLabel={(inputValue) => `Usar "${inputValue}" (Otro)`}
                                noOptionsMessage={() => "Escribe para buscar..."}
                                styles={customStyles}
                            />
                        </div>

                        {/* FILA 2: Nombres (2 Columnas) */}
                        <InputGroup
                            label="Primer Nombre"
                            name="primerNombre"
                            value={formData.primerNombre}
                            onChange={handleChange}
                            width="md:col-span-3"
                        />
                        <InputGroup
                            label="Segundo Nombre"
                            name="segundoNombre"
                            value={formData.segundoNombre}
                            onChange={handleChange}
                            width="md:col-span-3"
                        />

                        {/* FILA 3: Apellidos (2 Columnas) */}
                        <InputGroup
                            label="Primer Apellido"
                            name="primerApellido"
                            value={formData.primerApellido}
                            onChange={handleChange}
                            width="md:col-span-3"
                        />
                        <InputGroup
                            label="Segundo Apellido"
                            name="segundoApellido"
                            value={formData.segundoApellido}
                            onChange={handleChange}
                            width="md:col-span-3"
                        />

                        {/* FILA 4: Lugar Nacimiento y Fecha (2 Columnas) */}
                        <div className="md:col-span-3">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Lugar de Nacimiento</label>
                            <CreatableSelect
                                name="lugarNacimiento"
                                className="w-full rounded-md focus:ring-blue-500 focus:border-blue-500"
                                options={municipiosColombia}
                                value={getValueForSelect(formData.lugarNacimiento)}
                                onChange={handleSelectChange}
                                isClearable
                                placeholder="Buscar municipio..."
                                formatCreateLabel={(inputValue) => `Usar "${inputValue}"`}
                                styles={customStyles}
                            />
                        </div>

                        <InputGroup
                            label="Fecha Nacimiento"
                            name="fechaNacimiento"
                            value={formData.fechaNacimiento}
                            onChange={handleChange}
                            type="date"
                            width="md:col-span-3"
                        />

                        {/* FILA 5: Edad y Sexo (2 Columnas) */}
                        <div className="md:col-span-3">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Edad
                            </label>
                            <input
                                type="text"
                                value={calcularEdad(formData.fechaNacimiento)}
                                readOnly
                                className="w-full border border-gray-300 bg-gray-100 text-gray-600 rounded-md px-3 py-2 outline-none cursor-not-allowed"
                            />
                        </div>

                        <SelectGroup
                            label="Sexo"
                            name="sexo"
                            value={formData.sexo}
                            onChange={handleChange}
                            options={SEXOS}
                            mapOption
                            width="md:col-span-3"
                        />
                    </div>
                )}

                {/* TAB 2: UBICACIÓN Y CONTACTO */}
                {activeTab === 2 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                        {/* 1. Municipio de Residencia */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                                Municipio de Residencia
                            </label>
                            <CreatableSelect
                                name="municipioResidencia"
                                options={municipiosColombia}
                                value={getValueForSelect(formData.municipioResidencia)}
                                onChange={handleSelectChange}
                                isClearable
                                placeholder="Buscar municipio..."
                                formatCreateLabel={(inputValue) => `Usar "${inputValue}"`}
                                styles={customStyles}
                                menuPortalTarget={document.body}
                            />
                        </div>

                        {/* 2. Dirección */}
                        <InputGroup
                            label="Dirección Residencia"
                            name="direccion"
                            value={formData.direccion}
                            onChange={handleChange}
                        />

                        {/* 3. Barrio */}
                        <InputGroup
                            label="Barrio"
                            name="barrio"
                            value={formData.barrio}
                            onChange={handleChange}
                        />

                        {/* 4. Teléfono */}
                        <InputGroup
                            label="Teléfono / Celular"
                            name="contacto"
                            value={formData.contacto}
                            onChange={handleChange}
                        />

                        {/* 5. Estrato */}
                        <InputGroup
                            label="Estrato"
                            name="estrato"
                            value={formData.estrato}
                            onChange={handleChange}
                            type="number"
                        />

                        {/* 6. SISBEN */}
                        <InputGroup
                            label="Clasificación SISBEN"
                            name="sisben"
                            value={formData.sisben}
                            onChange={handleChange}
                        />
                    </div>
                )}

                {/* TAB 3: SALUD Y CARACTERIZACIÓN */}
                {activeTab === 3 && (
                    <div className="space-y-4">
                        <h3 className="text-gray-800 font-semibold border-b border-gray-300 pb-2">Salud</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <InputGroup label="EPS" name="eps" value={formData.eps} onChange={handleChange} />
                            <InputGroup label="Tipo Sangre (RH)" name="rh" value={formData.rh} onChange={handleChange} />
                            <div className="flex items-center mt-6">
                                <input
                                    id="subsidiado"
                                    name="subsidiado"
                                    type="checkbox"
                                    checked={formData.subsidiado}
                                    onChange={handleChange}
                                    className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <label htmlFor="subsidiado" className="ml-2 block text-sm text-gray-900">
                                    ¿Régimen Subsidiado?
                                </label>
                            </div>
                        </div>

                        <h3 className="text-gray-800 font-semibold border-b border-gray-300 pb-4">Caracterización</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <SelectGroup label="Población Víctima" name="victimas" value={formData.victimas} onChange={handleChange} options={VICTIMAS} mapOption />
                            <SelectGroup label="Discapacidad" name="discapacidad" value={formData.discapacidad} onChange={handleChange} options={DISCAPACIDADES} mapOption />
                            <SelectGroup label="Capacidades Excepcionales" name="capacidades" value={formData.capacidades} onChange={handleChange} options={CAPACIDADES} mapOption />
                            <SelectGroup label="Etnia" name="etnia" value={formData.etnia} onChange={handleChange} options={ETNIAS} mapOption />
                        </div>
                    </div>
                )}

                {/* TAB 4: ACUDIENTES (Integrado) */}
                {activeTab === 4 && (
                    <AcudientesTab
                        estudiante={formData}
                        //onUpdate={onSuccess}
                        onUpdate={handleRefreshEstudiante}
                    />
                )}

            </div>

            {/* FOOTER BOTONES */}
            <div className="border-t border-gray-300 pt-4 mt-2 flex justify-end gap-3">
                <button
                    type="submit"
                    disabled={loading}
                    className={`px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center ${loading ? "opacity-70 cursor-not-allowed" : ""
                        }`}
                >
                    {loading && (
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    )}
                    <FontAwesomeIcon icon={faSave} className="mr-2" /> {formData.id ? "Guardar Cambios" : "Guardar"}
                </button>

                {/*<Botón de cierre */}
                <button
                    type="button"
                    onClick={onClose}
                    className="bg-red-500 text-white px-5 py-2 rounded-lg hover:bg-red-600 transition flex items-center shadow-md"
                >
                    <FontAwesomeIcon icon={faTimes} className="mr-2" /> Cerrar
                </button>
            </div>
        </form>
    );
};

export default EstudiantesForm;