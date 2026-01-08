import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useNavigate, useLocation } from "react-router-dom";

const Navbar = ({ toggleSidebar }) => {
    const navigate = useNavigate();
    const location = useLocation();

    // Diccionario para traducir rutas a títulos legibles
    const pageTitles = {
        '/bienvenida': 'Inicio',
        '/colegios': 'Institucional / Colegios',
        '/sedes': 'Institucional / Sedes',
        '/coordinadores': 'Institucional / Coordinadores',
        '/areas': 'Académico / Áreas',
        '/asignaturas': 'Académico / Asignaturas',
        '/grupos': 'Académico / Grupos',
        '/carga-academica': 'Académico / Carga',
        '/docentes': 'Académico / Docentes',
        '/matriculas': 'Estudiantes / Matrículas',
        '/estudiantes': 'Estudiantes / Listado',
        '/acudientes': 'Estudiantes / Acudientes',
        '/calificaciones': 'Evaluación / Calificaciones',
        '/indicadores': 'Evaluación / Indicadores',
        '/juicios': 'Evaluación / Juicios',
    };

    // Obtenemos el título actual o un defecto
    const currentTitle = pageTitles[location.pathname];

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
                        Panel de Control
                    </span>
                    <h1 className="text-lg font-bold text-gray-800 leading-tight">
                        {currentTitle}
                    </h1>
                </div>
            </div>

            {/* DERECHA */}
            <div className="flex items-center gap-3">
                <span className="text-md font-semibold text-gray-500 hidden md:block">
                    IE. CARLOS ADOLFO URUETA
                </span>
                <div
                    className="cursor-pointer p-2 rounded-full bg-gray-50 hover:bg-blue-50 text-gray-600 hover:text-blue-600 transition duration-150"
                    onClick={() => navigate("/bienvenida")}
                    title="Ir al inicio"
                >
                    <FontAwesomeIcon icon="house" className="w-5 h-5" />
                </div>
            </div>
        </nav>
    );
};

export default Navbar;