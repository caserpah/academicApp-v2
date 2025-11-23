// src/components/Navbar.jsx
import React from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useNavigate } from "react-router-dom";

const Navbar = ({ toggleSidebar = () => { } }) => {
    const navigate = useNavigate();

    return (
        // Navbar: Contenedor sin posicionamiento, solo clases de estilo y flexbox.
        <nav className="bg-white shadow-md p-4 flex justify-between items-center h-16 w-full">

            {/* Sección izquierda: Título */}
            <div className="flex items-center space-x-4">
                {/* Aquí iría el botón de menú para móviles si la Sidebar fuera oculta */}
                <h1 className="text-lg font-semibold text-gray-800">
                    IE. CARLOS ADOLFO URUETA
                </h1>
            </div>

            {/* Sección derecha: Ícono de Home */}
            <div
                className="cursor-pointer p-2 rounded-full hover:bg-gray-100 transition duration-150"
                onClick={() => navigate("/bienvenida")} // Navegación a Bienvenida
            >
                <FontAwesomeIcon
                    icon="house"
                    className="text-gray-600 w-6 h-6 hover:text-blue-600"
                />
            </div>
        </nav>
    );
};

export default Navbar;