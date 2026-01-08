import React, { useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "../components/Sidebar.jsx";
import Navbar from "../components/Navbar.jsx";

const DashboardLayout = () => {
    // Estado para controlar la visibilidad del Sidebar
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);

    const toggleSidebar = () => {
        setIsSidebarOpen(!isSidebarOpen);
    };

    return (
        <div className="flex h-screen bg-gray-100">
            {/* Pasamos el estado al Sidebar para que sepa si mostrarse o no */}
            <Sidebar isOpen={isSidebarOpen} />

            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Pasamos la función toggle al Navbar para el botón */}
                <Navbar toggleSidebar={toggleSidebar} />

                <main className="flex-1 overflow-x-hidden overflow-y-auto p-4">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default DashboardLayout;