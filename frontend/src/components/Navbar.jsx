import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Navbar = ({ toggleSidebar }) => {
    const location = useLocation();

    // Extraemos el usuario actual
    const { user } = useAuth();

    // Diccionario para traducir rutas a títulos legibles
    const pageTitles = {
        '/bienvenida': 'Inicio',
        '/colegios': 'Institucional / Colegios',
        '/sedes': 'Institucional / Sedes',
        '/coordinadores': 'Institucional / Coordinadores',
        '/vigencias': 'Institucional / Años Lectivos',
        '/usuarios': 'Institucional / Usuarios',
        '/areas': 'Académico / Áreas',
        '/asignaturas': 'Académico / Asignaturas',
        '/grupos': 'Académico / Grupos',
        '/carga-academica': 'Académico / Carga',
        '/docentes': 'Académico / Docentes',
        '/matriculas': 'Estudiantes / Matrículas',
        '/estudiantes': 'Estudiantes / Listado',
        '/observador': 'Estudiantes / Observador del Alumno',
        '/acudientes': 'Estudiantes / Acudientes',
        '/calificaciones': 'Evaluación / Calificaciones',
        '/nivelaciones': 'Evaluación / Recuperaciones',
        '/planillas': 'Evaluación / Planillas',
        '/sabanas': 'Reportes / Sábanas',
        '/juicios': 'Evaluación / Juicios',
        '/ventanas': 'Evaluación / Ventanas',
        '/boletines': 'Evaluación / Boletines',
        '/certificados': 'Documentos / Certificados',
        '/libros': 'Documentos / Libros Reglamentarios',
        '/listados': 'Documentos / Listados',
    };

    // Obtenemos el título actual o un defecto
    const currentTitle = pageTitles[location.pathname] || 'Panel de Control';

    // Función auxiliar para extraer iniciales del nombre del usuario(Ej: Carlos Paez -> CP)
    const getInitials = (nombre, apellidos) => {
        if (!nombre) return "U";
        const n = nombre.charAt(0).toUpperCase();
        const a = apellidos ? apellidos.charAt(0).toUpperCase() : "";
        return `${n}${a}`;
    };

    return (
        <nav className="bg-white shadow-sm border-b border-gray-200 p-4 flex justify-between items-center h-16 w-full z-10 sticky top-0">

            {/* IZQUIERDA */}
            <div className="flex items-center gap-4">
                <button
                    onClick={toggleSidebar}
                    className="p-2 rounded-md text-gray-500 hover:bg-gray-100 hover:text-blue-600 focus:outline-none transition-colors"
                >
                    <FontAwesomeIcon icon="bars" className="w-5 h-5" />
                </button>

                {/* Breadcrumb / Título Dinámico */}
                <div className="flex flex-col">
                    <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">
                        Sistema de Gestión Académica
                    </span>
                    <h1 className="text-lg font-bold text-gray-800 leading-tight">
                        {currentTitle}
                    </h1>
                </div>
            </div>

            {/* DERECHA - Perfil Compacto */}
            <div className="flex items-center">
                {user && (
                    <div className="flex items-center gap-3 hover:bg-gray-50 py-1 px-2 rounded-lg transition duration-150">

                        {/* Bloque de Textos Apilados */}
                        <div className="flex-col text-right hidden sm:flex justify-center">
                            {/* 1. Institución (Pequeño, gris, espaciado) */}
                            <span className="text-[12px] font-bold text-gray-500 uppercase tracking-widest mb-1">
                                IE. CARLOS ADOLFO URUETA
                            </span>

                            {/* 2. Nombre (Primer nombre + Apellidos completos) */}
                            <span className="text-sm font-bold text-gray-600 leading-none">
                                {user.nombre?.split(' ')[0]} {user.apellidos}
                            </span>

                            {/* 3. Rol (Azul para resaltar) */}
                            <span className="text-xs text-blue-800 font-medium capitalize mt-1">
                                {user.role === 'admin' ? 'Administrador' : user.role}
                            </span>
                        </div>

                        {/* Avatar con Iniciales en frente */}
                        <div
                            className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm shadow-sm border border-blue-200 ml-1"
                            title={`Conectado como ${user.role === 'admin' ? 'Administrador' : user.role}`}
                        >
                            {getInitials(user.nombre, user.apellidos)}
                        </div>
                    </div>
                )}
            </div>
        </nav>
    );
};

export default Navbar;