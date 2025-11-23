import React from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import Navbar from "../components/Navbar";

const DashboardLayout = () => {
    return (
        // Contenedor Principal: Flex horizontal, altura total de la pantalla.
        <div className="flex h-screen bg-gray-100">

            {/* Sidebar: Componente de ancho fijo */}
            <Sidebar />

            {/* Contenedor de Contenido: Ocupa el espacio restante (flex-1) y apila la Navbar y el main verticalmente (flex-col) */}
            <div className="flex-1 flex flex-col overflow-hidden">

                <Navbar />

                {/* Área de la Página: Ocupa el espacio restante de la columna (flex-1) y permite scroll. */}
                <main className="flex-1 overflow-x-hidden overflow-y-auto p-4">
                    <Outlet /> {/* Renderiza las páginas (Home, Bienvenida, etc.) */}
                </main>
            </div>
        </div>
    );
};

export default DashboardLayout;