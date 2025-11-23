import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useAuth } from "../context/AuthContext.jsx";

const navItems = [
    { path: "/matriculas", label: "Matrícula", icon: "file-pen", requiredRole: 'admin' },
    { path: "/estudiantes", label: "Estudiantes", icon: "users", requiredRole: 'admin' },
    { path: "/acudientes", label: "Acudientes", icon: "hands-holding-child", requiredRole: 'admin' },
    { path: "/coordinadores", label: "Coordinadores", icon: "user-tie", requiredRole: 'admin' },
    { path: "/colegios", label: "Colegios", icon: "school", requiredRole: 'admin' },
    { path: "/calificaciones", label: "Calificaciones", icon: "star", requiredRole: 'docente' },
];

const subItems = [
    { path: "/sedes", label: "Sedes", requiredRole: 'admin' },
    { path: "/docentes", label: "Docentes", requiredRole: 'admin' },
    { path: "/grupos", label: "Grupos", requiredRole: 'admin' },
    { path: "/areas", label: "Áreas", requiredRole: 'admin' },
    { path: "/carga-academica", label: "Carga Académica", requiredRole: 'admin' },
    { path: "/indicadores", label: "Indicadores", requiredRole: 'admin' },
    { path: "/juicios", label: "Juicios", requiredRole: 'admin' },
];

const Sidebar = () => {
    const [isOpenRegistros, setIsOpenRegistros] = useState(false);
    const { logout, hasRole } = useAuth(); // Obtenemos la función logout y hasRole()
    const navigate = useNavigate();

    // Clases básicas de navegación
    const defaultLinkClasses = 'py-2 px-4 text-gray-300 hover:bg-gray-700 hover:text-white transition duration-200 flex items-center space-x-3 rounded-md';
    const subMenuLinkClasses = 'py-2 px-6 text-sm text-gray-400 hover:bg-gray-700 hover:text-white transition duration-200 block rounded-md';

    // Función para manejar el cierre de sesión
    const handleLogout = () => {
        logout(); // Limpia el token y el usuario del contexto/localStorage
        navigate('/login'); // Redirige al usuario a la página de inicio de sesión
    };

    // Verifica si el ítem requiere un rol O si el usuario lo tiene.
    const canView = (item) => {
        if (!item.requiredRole) {
            return true; // Si no requiere rol, cualquiera logeado lo ve
        }
        return hasRole(item.requiredRole); // Verifica si el usuario tiene el rol
    };

    const visibleSubItems = subItems.filter(canView);

    return (
        // Contenedor Sidebar: Ancho fijo, altura total, y ¡CRUCIAL! flex-shrink-0 para que el flexbox padre respete su ancho.
        <div className="w-64 bg-gray-800 h-screen shadow-2xl flex flex-col flex-shrink-0">

            {/* Título de la App */}
            <div className="p-4 text-white text-2xl font-bold border-b border-gray-700">
                AcademicApp
            </div>

            {/* Sección de Búsqueda */}
            <div className="p-4 border-b border-gray-700">
                <div className="relative">
                    <FontAwesomeIcon icon="search" className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                        type="text"
                        placeholder="Buscar..."
                        className="w-full pl-10 pr-4 py-2 bg-gray-700 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-400 text-sm"
                    />
                </div>
            </div>

            {/* Lista de navegación */}
            <ul className="flex-1 overflow-y-auto p-3 space-y-1">
                {/* SECCIÓN REGISTROS PRELIMINARES (con Submenú) */}
                <li>
                    {/* Solo mostramos la cabecera si hay algún ítem visible en el submenú */}
                    {visibleSubItems.length > 0 && (
                        <>
                            <div
                                onClick={() => setIsOpenRegistros(!isOpenRegistros)}
                                className={`cursor-pointer ${defaultLinkClasses} ${isOpenRegistros ? 'bg-gray-700 text-white' : ''}`}
                            >
                                <div className="flex items-center space-x-3 flex-1">
                                    <FontAwesomeIcon icon="folder-open" className="w-5 h-5" />
                                    <span>Registros Preliminares</span>
                                </div>
                                <FontAwesomeIcon
                                    icon={isOpenRegistros ? "chevron-down" : "chevron-right"}
                                    className="w-3 h-3 transition-transform duration-300"
                                />
                            </div>

                            {/* Submenú: Animación simple con Tailwind (usaremos clases condicionales simples) */}
                            <div
                                className={`ml-4 mt-1 space-y-1 transition-all duration-300 ease-in-out ${isOpenRegistros ? 'block opacity-100 max-h-96' : 'hidden opacity-0 max-h-0'}`}
                            >
                                {visibleSubItems.map((item) => (
                                    <Link key={item.path} to={item.path} className={subMenuLinkClasses}>
                                        {item.label}
                                    </Link>
                                ))}
                            </div>
                        </>
                    )}
                </li>

                {/* SECCIONES PRINCIPALES */}
                {/* Filtramos los navItems aquí */}
                {navItems.filter(canView).map((item) => (
                    <li key={item.path}>
                        <Link to={item.path} className={defaultLinkClasses}>
                            <FontAwesomeIcon icon={item.icon} className="w-5 h-5" />
                            <span>{item.label}</span>
                        </Link>
                    </li>
                ))}
            </ul>

            {/* BOTÓN DE CIERRE DE SESIÓN */}
            <div className="p-3 border-t border-gray-700">
                <button
                    onClick={handleLogout}
                    // Usamos las mismas clases, pero con un color de hover que sugiere "salir"
                    className={`w-full ${defaultLinkClasses} bg-gray-700 hover:bg-red-600 text-red-400 hover:text-white justify-start cursor-pointer`}
                >
                    <FontAwesomeIcon icon="sign-out-alt" className="w-5 h-5" />
                    <span>Cerrar Sesión</span>
                </button>
            </div>
        </div>
    );
};

export default Sidebar;