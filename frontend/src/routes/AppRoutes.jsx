import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Layouts y Páginas
import DashboardLayout from '../layouts/DashboardLayout.jsx';
import Bienvenida from '../pages/Bienvenida/Bienvenida.jsx';
import Login from '../pages/Auth/login.jsx';
import RecuperarPassword from '../pages/Auth/RecuperarPassword.jsx';
import ProtectedRoute from './ProtectedRoute.jsx';

// Componentes Existentes
import Colegios from '../components/colegios/Colegios.jsx';
import Sedes from '../components/sedes/Sedes.jsx';
import Usuarios from '../components/usuarios/Usuarios.jsx';
import Grupos from '../components/grupos/Grupos.jsx';
import Areas from '../components/areas/Areas.jsx';
import Asignaturas from '../components/asignaturas/Asignaturas.jsx';
import Coordinadores from '../components/coordinadores/Coordinadores.jsx';
import Docentes from '../components/docentes/Docentes.jsx';
import Cargas from '../components/cargas/Cargas.jsx';
import Juicios from '../components/juicios/Juicios.jsx';
import Calificaciones from '../components/calificaciones/CalificacionesPage.jsx';
import Nivelaciones from '../components/nivelaciones/NivelacionesPage.jsx';
import GenerarBoletines from "../components/boletines/GenerarBoletines.jsx";
import Estudiantes from '../components/estudiantes/Estudiantes.jsx';
import Acudientes from '../components/acudientes/Acudientes.jsx';
import AsignarAcudientes from '../components/estudiantes/AcudientesTab.jsx';
import Matriculas from "../components/matriculas/Matriculas.jsx";
import PromocionMasiva from "../components/matriculas/PromocionMasiva.jsx";
import Vigencias from '../components/vigencias/Vigencias.jsx';
import Ventanas from '../components/ventanas/Ventanas.jsx';

// --- COMPONENTE TEMPORAL PARA RUTAS FALTANTES ---
// Utilizar mientras se está en desarrollo de componentes reales
const PaginaEnConstruccion = ({ titulo }) => (
    <div className="p-8 text-center border-2 border-dashed border-gray-300 rounded-lg">
        <h2 className="text-2xl font-bold text-gray-400 mb-2">🚧 En Construcción</h2>
        <p className="text-gray-500">El módulo <strong>{titulo}</strong> estará disponible pronto.</p>
    </div>
);

const AppRoutes = () => {
    return (
        <Routes>
            {/* RUTA PÚBLICA */}
            <Route path="/login" element={<Login />} />
            <Route path="/recuperar-password" element={<RecuperarPassword />} />

            {/* RUTAS PROTEGIDAS */}
            <Route element={<ProtectedRoute />}>
                <Route path="/" element={<DashboardLayout />}>

                    <Route index element={<Navigate to="/bienvenida" replace />} />
                    <Route path="bienvenida" element={<Bienvenida />} />

                    {/* === INSTITUCIONAL === */}
                    <Route path="colegios" element={<ProtectedRoute requiredRole={["admin", "secretaria"]}><Colegios /></ProtectedRoute>} />
                    <Route path="sedes" element={<ProtectedRoute requiredRole={["admin", "secretaria"]}><Sedes /></ProtectedRoute>} />
                    <Route path="usuarios" element={<ProtectedRoute requiredRole={["admin"]}><Usuarios /></ProtectedRoute>} />
                    <Route path="coordinadores" element={<ProtectedRoute requiredRole={["admin", "secretaria"]}><Coordinadores /></ProtectedRoute>} />
                    <Route path="vigencias" element={<ProtectedRoute requiredRole={["admin", "secretaria"]}><Vigencias /></ProtectedRoute>} />

                    {/* === GESTIÓN ACADÉMICA === */}
                    <Route path="areas" element={<ProtectedRoute requiredRole={["admin", "secretaria", "coordinador"]}><Areas /></ProtectedRoute>} />
                    <Route path="asignaturas" element={<ProtectedRoute requiredRole={["admin", "secretaria", "coordinador"]}><Asignaturas /></ProtectedRoute>} />

                    {/* Nuevas rutas agregadas del Sidebar */}
                    <Route path="grupos" element={<ProtectedRoute requiredRole={["admin", "secretaria", "coordinador"]}><Grupos /></ProtectedRoute>} />
                    <Route path="carga-academica" element={<ProtectedRoute requiredRole={["admin", "secretaria", "coordinador"]}><Cargas /></ProtectedRoute>} />
                    <Route path="docentes" element={<ProtectedRoute requiredRole={["admin", "secretaria"]}><Docentes /></ProtectedRoute>} />

                    {/* === ESTUDIANTES & MATRÍCULAS === */}
                    <Route path="estudiantes" element={<ProtectedRoute requiredRole={["admin", "secretaria", "coordinador", "docente"]}><Estudiantes /></ProtectedRoute>} />
                    <Route path="estudiantes/acudientes" element={<ProtectedRoute requiredRole={["admin", "secretaria", "coordinador"]}><AsignarAcudientes /></ProtectedRoute>} />
                    <Route path="acudientes" element={<ProtectedRoute requiredRole={["admin", "secretaria", "coordinador"]}><Acudientes /></ProtectedRoute>} />
                    <Route path="matriculas" element={<ProtectedRoute requiredRole="admin"><Matriculas /></ProtectedRoute>} />
                    <Route path="matriculas/masivo" element={<ProtectedRoute requiredRole="admin"><PromocionMasiva /></ProtectedRoute>} />

                    {/* === EVALUACIÓN === */}
                    <Route path="juicios" element={<ProtectedRoute requiredRole={["admin", "secretaria", "coordinador", "docente"]}><Juicios /></ProtectedRoute>} />
                    <Route path="calificaciones" element={<ProtectedRoute requiredRole={["admin", "secretaria", "docente"]}><Calificaciones /></ProtectedRoute>} />
                    <Route path="nivelaciones" element={<ProtectedRoute requiredRole={["admin", "secretaria", "coordinador", "docente"]}><Nivelaciones /></ProtectedRoute>} />
                    <Route path="ventanas" element={<ProtectedRoute requiredRole={["admin", "secretaria", "coordinador"]}><Ventanas /></ProtectedRoute>} />
                    <Route path="boletines" element={<ProtectedRoute requiredRole={["admin", "secretaria", "coordinador"]}><GenerarBoletines /></ProtectedRoute>} />

                    {/* RUTAS TEMPORALES PARA MÓDULOS EN DESARROLLO */}
                    <Route path="reportes" element={<ProtectedRoute requiredRole={["admin", "secretaria", "coordinador"]}><PaginaEnConstruccion titulo="Reportes" /></ProtectedRoute>} />
                    <Route path="configuracion" element={<ProtectedRoute requiredRole="admin"><PaginaEnConstruccion titulo="Configuración" /></ProtectedRoute>} />

                </Route>
            </Route>

            {/* 404 */}
            <Route path="*" element={<div className="text-center mt-10">404 | Página no encontrada</div>} />
        </Routes>
    );
};

export default AppRoutes;