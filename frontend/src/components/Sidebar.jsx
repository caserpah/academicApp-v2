import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useAuth } from "../context/AuthContext.jsx";

// 1. ESTRUCTURA DE DATOS ORGANIZADA
// Agrupamos todo en un solo array de objetos para facilitar el renderizado y la búsqueda.
const menuStructure = [
    {
        title: "Institucional",
        key: "institucional", // Clave única para el estado
        items: [
            { path: "/colegios", label: "Colegios", icon: "school", requiredRole: 'admin' },
            { path: "/sedes", label: "Sedes", icon: "building", requiredRole: 'admin' },
            { path: "/coordinadores", label: "Coordinadores", icon: "user-tie", requiredRole: 'admin' },
            { path: "/vigencias", label: "Configurar Año Lectivo", icon: "calendar-alt", requiredRole: 'admin' },
            { path: "/usuarios", label: "Usuarios del Sistema", icon: "user-shield", requiredRole: 'admin' },
        ]
    },
    {
        title: "Gestión Académica",
        key: "academica",
        items: [
            { path: "/areas", label: "Áreas", icon: "layer-group", requiredRole: 'admin' },
            { path: "/asignaturas", label: "Asignaturas", icon: "book-open", requiredRole: 'admin' },
            { path: "/grupos", label: "Grupos", icon: "users-rectangle", requiredRole: 'admin' },
            { path: "/carga-academica", label: "Carga Académica", icon: "chalkboard-user", requiredRole: 'admin' },
            { path: "/docentes", label: "Docentes", icon: "person-chalkboard", requiredRole: 'admin' },
        ]
    },
    {
        title: "Estudiantes & Matrículas",
        key: "estudiantes",
        items: [
            { path: "/matriculas", label: "Matrículas", icon: "file-pen", requiredRole: 'admin' },
            { path: "/estudiantes", label: "Estudiantes", icon: "users", requiredRole: 'admin' },
            { path: "/observador", label: "Observador del Alumno", icon: "clipboard-list", requiredRoles: ['admin', 'docente', 'coordinador'] },
            { path: "/acudientes", label: "Acudientes", icon: "hands-holding-child", requiredRole: 'admin' },
        ]
    },
    {
        title: "Evaluación",
        key: "evaluacion",
        items: [
            { path: "/ventanas", label: "Ventanas de Calificaciones", icon: "calendar-alt", requiredRole: 'admin' },
            { path: "/calificaciones", label: "Calificaciones", icon: "star", requiredRoles: ['admin', 'docente'] },
            { path: "/nivelaciones", label: "Recuperaciones", icon: "balance-scale", requiredRoles: ['admin', 'docente', 'coordinador'] },
            { path: "/juicios", label: "Juicios Académicos", icon: "gavel", requiredRole: 'admin' },
            { path: "/boletines", label: "Generar Boletines", icon: "file-pdf", requiredRoles: ['admin', 'secretaria', 'coordinador'] },
            { path: "/administrar-codigos", label: "Códigos de Boletín", icon: "key", requiredRoles: ['admin', 'secretaria', 'coordinador'] }
        ]
    }
];

const Sidebar = ({ isOpen }) => {
    const [searchTerm, setSearchTerm] = useState("");

    // Estado para controlar qué grupos están abiertos.
    // Inicializamos con true si quieres que alguno empiece abierto, o vacío {} para todos cerrados.
    const [openGroups, setOpenGroups] = useState({
        institucional: true, // Ejemplo: El primero empieza abierto
    });

    const { logout, hasRole } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    // Función para alternar (toggle) un grupo
    const toggleGroup = (groupKey) => {
        setOpenGroups(prevState => ({
            ...prevState,
            [groupKey]: !prevState[groupKey]
        }));
    };

    // Filtrado (Igual que antes)
    const filteredMenu = menuStructure.map(group => {
        const filteredItems = group.items.filter(item => {

            // Buscamos en ambas propiedades por si acaso
            const roles = item.requiredRoles || (item.requiredRole ? [item.requiredRole] : null);

            // Si no hay roles definidos, es público. Si los hay, verificamos:
            const matchesRole = roles
                ? roles.some(role => hasRole(role))
                : true;

            const matchesSearch = item.label.toLowerCase().includes(searchTerm.toLowerCase());

            return matchesRole && matchesSearch;
        });
        return { ...group, items: filteredItems };
    }).filter(group => group.items.length > 0);

    return (
        <div className={`bg-gray-800 h-screen shadow-2xl flex flex-col flex-shrink-0 transition-all duration-300 ease-in-out ${isOpen ? 'w-64' : 'w-0 overflow-hidden'}`}>

            {/* Header Sidebar */}
            <div className="p-4 cursor-pointer text-white text-2xl font-bold border-b border-gray-700 whitespace-nowrap overflow-hidden flex items-center gap-2"
                onClick={() => navigate("/bienvenida")}
                title="Ir al inicio"
            >
                <span className="text-blue-500">Academic</span>App
            </div>

            {/* Buscador */}
            <div className="p-4 border-b border-gray-700">
                <div className="relative">
                    <FontAwesomeIcon icon="search" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                        type="text"
                        placeholder="Buscar..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400 text-sm"
                    />
                </div>
            </div>

            {/* Lista Menú */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                {filteredMenu.length > 0 ? (
                    filteredMenu.map((group) => {
                        // Si hay búsqueda, forzamos que esté "abierto". Si no, usamos el estado del acordeón.
                        const isExpanded = searchTerm.length > 0 || openGroups[group.key];

                        return (
                            <div key={group.key} className="mb-1">
                                {/* CABECERA DEL ACORDEÓN (Botón) */}
                                <button
                                    onClick={() => toggleGroup(group.key)}
                                    className="w-full flex items-center justify-between p-2 text-gray-400 hover:bg-gray-700 hover:text-white rounded-md transition-colors duration-200 group"
                                >
                                    <span className="text-xs font-bold uppercase tracking-wider group-hover:text-blue-400">
                                        {group.title}
                                    </span>
                                    {/* Icono Chevron: Rota si está abierto */}
                                    {!searchTerm && ( // Ocultamos la flecha si estamos buscando (porque todo está abierto)
                                        <FontAwesomeIcon
                                            icon={isExpanded ? "chevron-down" : "chevron-right"}
                                            className="w-3 h-3 transition-transform duration-200"
                                        />
                                    )}
                                </button>

                                {/* LISTA DE ITEMS (Contenido del Acordeón) */}
                                {/* Usamos una transición simple de altura o display */}
                                <div className={`overflow-hidden transition-all duration-300 ${isExpanded ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
                                    <ul className="pl-2 mt-1 space-y-1 border-l-2 border-gray-700 ml-2">
                                        {group.items.map((item) => (
                                            <li key={item.path}>
                                                <Link
                                                    to={item.path}
                                                    className="flex items-center py-2 px-3 text-sm text-gray-300 hover:bg-gray-700 hover:text-white rounded-r-md transition duration-200"
                                                >
                                                    <FontAwesomeIcon icon={item.icon} className="w-4 h-4 mr-3 text-center opacity-70" />
                                                    <span className="whitespace-nowrap">{item.label}</span>
                                                </Link>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="text-center text-gray-500 text-sm mt-4 italic">
                        No hay coincidencias.
                    </div>
                )}
            </div>

            {/* Footer Logout */}
            <div className="p-3 border-t border-gray-700">
                <button
                    onClick={handleLogout}
                    className="flex items-center justify-center w-full py-2 px-4 bg-gray-900 text-red-400 hover:bg-red-600 hover:text-white rounded-lg transition duration-200 shadow-md"
                >
                    <FontAwesomeIcon icon="sign-out-alt" className="w-4 h-4 mr-2" />
                    <span className="font-semibold text-sm">Cerrar Sesión</span>
                </button>
            </div>
        </div>
    );
};

export default Sidebar;