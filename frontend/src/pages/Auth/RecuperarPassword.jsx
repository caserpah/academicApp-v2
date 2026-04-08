import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEnvelope, faArrowLeft, faUnlockAlt, faEye, faEyeSlash } from "@fortawesome/free-solid-svg-icons";
import { API_BASE_URL } from "../../api/apiClient.js";

import Swal from 'sweetalert2';
import axios from 'axios';

const RecuperarPassword = () => {
    const [step, setStep] = useState(1); // 1: Pedir Email, 2: Nueva Clave
    const [email, setEmail] = useState('');
    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [mostrarPassword, setMostrarPassword] = useState(false);
    const navigate = useNavigate();

    // PASO 1: Enviar correo
    const handleRequestCode = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await axios.post(`${API_BASE_URL}/api/auth/forgot-password`, { email });
            // Siempre avanzamos al paso 2 por seguridad (para no revelar si existe el email)
            setStep(2);
            Swal.fire({
                icon: 'info',
                title: 'Código Enviado',
                text: 'Si el correo está registrado, recibirás un código de verificación.',
                timer: 4000
            });
        } catch (error) {
            console.error("Error solicitando código de recuperación:", error);
            Swal.fire('Error', 'Ocurrió un error al procesar la solicitud', 'error');
        } finally {
            setLoading(false);
        }
    };

    // PASO 2: Restablecer
    const handleResetSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await axios.post(`${API_BASE_URL}/api/auth/reset-password`, {
                email, otp, newPassword
            });

            await Swal.fire({
                icon: 'success',
                title: '¡Contraseña Actualizada!',
                text: 'Ahora puedes iniciar sesión con tu nueva clave.',
                confirmButtonText: 'Ir al Login'
            });
            navigate('/login');

        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error.response?.data?.message || 'Código inválido o expirado.',
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-inter">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">

                <div className="bg-white p-8 pb-2 text-center">
                    <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500 shadow-sm">
                        <FontAwesomeIcon icon={faUnlockAlt} size="2x" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800">Recuperar Acceso</h2>
                    <p className="text-slate-500 text-sm mt-2">
                        {step === 1 ? "Te enviaremos un código seguro." : "Crea tu nueva contraseña."}
                    </p>
                </div>

                <div className="p-8 pt-6">
                    {step === 1 ? (
                        /* FORMULARIO 1: PEDIR EMAIL */
                        <form onSubmit={handleRequestCode} className="space-y-6">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Correo Registrado</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-3 text-slate-400"><FontAwesomeIcon icon={faEnvelope} /></span>
                                    <input
                                        type="email"
                                        className="w-full pl-10 pr-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition"
                                        placeholder="usuario@institucion.edu.co"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        disabled={loading}
                                    />
                                </div>
                            </div>

                            <button type="submit" disabled={loading} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3 rounded-lg transition duration-200 shadow-md">
                                {loading ? "Enviando..." : "Enviar Código"}
                            </button>
                        </form>
                    ) : (
                        /* FORMULARIO 2: NUEVA CLAVE */
                        <form onSubmit={handleResetSubmit} className="space-y-5 animate-fade-in-up">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Código de 6 dígitos</label>
                                <input
                                    type="text" maxLength="6"
                                    className="w-full text-center text-2xl tracking-widest py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none uppercase font-mono"
                                    placeholder="000000"
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value)}
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Nueva Contraseña</label>
                                <div className="relative">
                                    <input
                                        type={mostrarPassword ? "text" : "password"}
                                        className="w-full pr-10 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition"
                                        placeholder="Nueva Contraseña"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        required
                                    />
                                    <div
                                        className="absolute right-3 top-3 text-slate-400 cursor-pointer"
                                        onClick={() => setMostrarPassword(!mostrarPassword)}
                                    >
                                        <FontAwesomeIcon icon={mostrarPassword ? faEyeSlash : faEye} />
                                </div>
                                </div>
                            </div>

                            <button type="submit" disabled={loading} className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 rounded-lg transition duration-200 shadow-md">
                                {loading ? "Procesando..." : "Cambiar Contraseña"}
                            </button>
                        </form>
                    )}

                    <div className="mt-6 text-center">
                        <Link to="/login" className="text-sm text-slate-500 hover:text-slate-800 font-medium flex items-center justify-center gap-2">
                            <FontAwesomeIcon icon={faArrowLeft} /> Volver al Login
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RecuperarPassword;