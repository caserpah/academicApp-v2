import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Importa los componentes de Layout y Páginas
import DashboardLayout from '../layouts/DashboardLayout.jsx';
import Bienvenida from '../pages/Bienvenida/Bienvenida.jsx';
import Colegios from '../components/colegios/Colegios.jsx';
import Sedes from '../components/sedes/Sedes.jsx'
import Areas from '../components/areas/Areas.jsx';
import Asignaturas from '../components/asignaturas/Asignaturas.jsx';
import Coordinadores from '../components/coordinadores/Coordinadores.jsx';
import Juicios from '../components/juicios/Juicios.jsx';
import Login from '../pages/Auth/login.jsx';
import ProtectedRoute from './ProtectedRoute.jsx';

const AppRoutes = () => {
    return (
        <Routes>

            {/* RUTA PÚBLICA: Login */}
            <Route path="/login" element={<Login />} />

            {/* ========================================================== */}
            {/* GRUPO DE RUTAS PROTEGIDAS (Requiere Autenticación) */}

            {/* 1. PROTECCIÓN PRINCIPAL: Si no hay login, redirige a /login. */}
            <Route element={<ProtectedRoute />}>

                {/* 2. RUTA PADRE/LAYOUT: Todas las rutas aquí dentro usarán el DashboardLayout */}
                <Route path="/" element={<DashboardLayout />}>

                    {/* RUTA INDEX: Redirige automáticamente de / a /bienvenida (Se renderiza en el <Outlet /> del Layout) */}
                    <Route index element={<Navigate to="/bienvenida" replace />} />

                    {/* RUTA DE BIENVENIDA (Contenido por defecto del Dashboard) */}
                    <Route path="bienvenida" element={<Bienvenida />} />

                    {/* RUTAS DE NAVEGACIÓN ESTÁNDAR (Páginas simples del Sidebar) */}
                    <Route path="matricula" element={<div>Página de Matrícula</div>} />
                    <Route path="estudiante" element={<div>Página de Estudiantes</div>} />
                    <Route path="docentes" element={<div>Página de Docentes</div>} />
                    <Route path="areas" element={<Areas/>} />
                    <Route path="asignaturas" element={<Asignaturas />} />
                    <Route path="coordinadores" element={<Coordinadores />} />
                    <Route path="juicios" element={<Juicios />} />
                    {/* Agrega aquí el resto de las rutas de navegación... */}


                    {/* RUTAS DE GESTIÓN CON RESTRICCIÓN DE ROL (Dentro del Layout) */}

                    {/* Colegios (Protegido por Rol 'admin'):
                        Usamos ProtectedRoute como un componente envolvente que chequea el rol y renderiza <Colegios /> si pasa.
                    */}
                    <Route
                        path="colegios"
                        element={
                            <ProtectedRoute requiredRole="admin">
                                <Colegios />
                            </ProtectedRoute>
                        }
                    />

                    {/* Sedes (Protegido por Rol 'admin') */}
                    <Route
                        path="sedes"
                        element={
                            <ProtectedRoute requiredRole="admin">
                                <Sedes />
                            </ProtectedRoute>
                        }
                    />

                    {/* Áreas (Protegido por Rol 'admin') */}
                    <Route
                        path="areas"
                        element={
                            <ProtectedRoute requiredRole="admin">
                                <Areas />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="asignaturas"
                        element={
                            <ProtectedRoute requiredRole="admin">
                                <Asignaturas />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="coordinadores"
                        element={
                            <ProtectedRoute requiredRole="admin">
                                <Coordinadores />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="juicios"
                        element={
                            <ProtectedRoute requiredRole="admin">
                                <Juicios />
                            </ProtectedRoute>
                        }
                    />

                </Route> {/* Cierre de la ruta principal (DashboardLayout) */}
            </Route> {/* Cierre de la protección principal */}

            {/* RUTA CATCH-ALL: 404 */}
            <Route path="*" element={<div>404 | Página no encontrada</div>} />
        </Routes >
    );
};

export default AppRoutes;