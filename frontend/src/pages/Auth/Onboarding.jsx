import React, { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEnvelope, faKey, faArrowRight, faUserShield, faArrowLeft } from "@fortawesome/free-solid-svg-icons";
import { completarOnboarding } from '../../api/authService.js';
import Swal from 'sweetalert2';


const Onboarding = () => {
    const location = useLocation();
    const navigate = useNavigate();

    // Recuperamos el ID que nos mandó el Login de forma segura
    const usuarioId = location.state?.usuarioId;

    const [email, setEmail] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Validar longitud
        if (newPassword.length < 8) {
            Swal.fire({
                icon: 'warning',
                title: 'Contraseña muy corta',
                text: 'La contraseña debe tener al menos 8 caracteres.',
                confirmButtonColor: '#1e293b'
            });
            return;
        }

        // Validar coincidencia
        if (newPassword !== confirmPassword) {
            Swal.fire({
                icon: 'warning',
                title: 'Contraseñas no coinciden',
                text: 'Por favor, verifica que la nueva contraseña y su confirmación sean idénticas.',
                confirmButtonColor: '#1e293b'
            });
            return;
        }

        setLoading(true);
        try {
            await completarOnboarding(usuarioId, email, newPassword);

            await Swal.fire({
                icon: 'success',
                title: '¡Seguridad Actualizada!',
                text: 'Tus datos se guardaron correctamente. Por favor inicia sesión de nuevo.',
                confirmButtonColor: '#2563eb'
            });

            navigate('/login');

        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Error al actualizar',
                text: error.message || 'Ocurrió un error inesperado.',
                confirmButtonColor: '#1e293b'
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-inter">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">

                <div className="bg-white p-8 pb-4 text-center">
                    <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-600 shadow-sm">
                        <FontAwesomeIcon icon={faUserShield} size="2x" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Casi listos...</h2>
                    <p className="text-slate-500 text-sm mt-2 leading-relaxed">
                        Por políticas de seguridad, debes registrar tu correo electrónico y crear una contraseña secreta.
                    </p>
                </div>

                <div className="p-8 pt-2">
                    <form onSubmit={handleSubmit} className="space-y-5">

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Correo Electrónico Válido</label>
                            <div className="relative">
                                <span className="absolute left-3 top-3 text-slate-400"><FontAwesomeIcon icon={faEnvelope} /></span>
                                <input
                                    type="email"
                                    className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition bg-slate-50 focus:bg-white"
                                    placeholder="usuario@correo.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    disabled={loading}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Nueva Contraseña secreta</label>
                            <div className="relative">
                                <span className="absolute left-3 top-3 text-slate-400"><FontAwesomeIcon icon={faKey} /></span>
                                <input
                                    type="password"
                                    className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition bg-slate-50 focus:bg-white"
                                    placeholder="Mínimo 8 caracteres"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    required
                                    minLength={8}
                                    disabled={loading}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1">Confirmar Contraseña</label>
                            <div className="relative">
                                <span className="absolute left-3 top-3 text-slate-400"><FontAwesomeIcon icon={faKey} /></span>
                                <input
                                    type="password"
                                    className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition bg-slate-50 focus:bg-white"
                                    placeholder="Repite tu contraseña"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    disabled={loading}
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-blue-700 hover:bg-blue-900 text-white font-semibold py-3 rounded-lg transition duration-200 flex justify-center items-center shadow-md transform active:scale-[0.98] mt-6"
                        >
                            {loading ? "Guardando..." : (
                                <>Completar Registro <FontAwesomeIcon icon={faArrowRight} className="ml-2" /></>
                            )}
                        </button>

                    </form>

                    <div className="mt-6 text-center">
                        <Link to="/login" className="text-sm text-slate-500 hover:text-slate-800 font-medium flex items-center justify-center gap-2">
                            <FontAwesomeIcon icon={faArrowLeft} /> Volver al Inicio
                        </Link>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default Onboarding;