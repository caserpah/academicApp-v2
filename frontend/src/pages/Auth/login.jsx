import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faEnvelope, faLock, faArrowRight, faShieldAlt, faCheckCircle } from "@fortawesome/free-solid-svg-icons";
import Swal from 'sweetalert2';
import { useAuth } from '../../context/AuthContext.jsx';

const Login = () => {
    const [step, setStep] = useState(1); // 1: Credenciales, 2: OTP
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [otp, setOtp] = useState('');
    const [loading, setLoading] = useState(false);

    const { login, verifyOtp } = useAuth();
    const navigate = useNavigate();

    // Paso 1: Enviar credenciales
    const handleCredentialsSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const response = await login(email, password);

            if (response.requireOTP) {
                setStep(2); // Cambiamos al formulario de OTP
                const Toast = Swal.mixin({
                    toast: true, position: 'top-end', showConfirmButton: false, timer: 3000
                });
                Toast.fire({ icon: 'success', title: 'Credenciales válidas. Revisa tu correo.' });
            } else {
                // Si en el futuro desactivamos OTP
                navigate('/bienvenida');
            }
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Error de acceso',
                text: error.message || 'Credenciales inválidas.',
                confirmButtonColor: '#1e293b'
            });
        } finally {
            setLoading(false);
        }
    };

    // Paso 2: Enviar OTP
    const handleOtpSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await verifyOtp(email, otp);
            // Si no hay error, el contexto actualiza el estado y redirigimos
            navigate('/bienvenida');
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Código Incorrecto',
                text: error.message || 'El código no es válido.',
                confirmButtonColor: '#ef4444'
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-inter">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200">

                {/* Cabecera */}
                <div className="bg-white p-8 pb-4 text-center">
                    <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-600 shadow-sm">
                        <FontAwesomeIcon icon={faShieldAlt} size="2x" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 tracking-tight">AcademicApp</h2>
                    <p className="text-slate-500 text-sm mt-2">Sistema de Gestión Académica</p>
                </div>

                <div className="p-8 pt-2">
                    {step === 1 ? (
                        /* --- FORMULARIO PASO 1 --- */
                        <form onSubmit={handleCredentialsSubmit} className="space-y-5">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Correo electrónico</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-3 text-slate-400"><FontAwesomeIcon icon={faEnvelope} /></span>
                                    <input
                                        type="email"
                                        className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition bg-slate-50 focus:bg-white"
                                        placeholder="usuario@institucion.edu.co"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        required
                                        disabled={loading}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Contraseña</label>
                                <div className="relative">
                                    <span className="absolute left-3 top-3 text-slate-400"><FontAwesomeIcon icon={faLock} /></span>
                                    <input
                                        type="password"
                                        className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition bg-slate-50 focus:bg-white"
                                        placeholder="••••••••"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        required
                                        disabled={loading}
                                    />
                                </div>
                            </div>
                            <div className="text-right mt-1 mb-4">
                                <Link to="/recuperar-password" className="text-sm text-blue-600 hover:underline">
                                    ¿Olvidaste tu contraseña?
                                </Link>
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-blue-700 hover:bg-blue-900 text-white font-semibold py-3 rounded-lg transition duration-200 flex justify-center items-center shadow-md hover:shadow-lg transform active:scale-[0.98]"
                            >
                                {loading ? "Verificando..." : (
                                    <>Continuar <FontAwesomeIcon icon={faArrowRight} className="ml-2" /></>
                                )}
                            </button>
                        </form>
                    ) : (
                        /* --- FORMULARIO PASO 2 (OTP) --- */
                        <form onSubmit={handleOtpSubmit} className="space-y-6 animate-fade-in-up">
                            <div className="text-center bg-blue-50 p-3 rounded-lg border border-blue-100">
                                <p className="text-sm text-blue-800">
                                    Hemos enviado un código a: <br />
                                    <span className="font-bold">{email}</span>
                                </p>
                            </div>

                            <div>
                                <label className="block text-center text-sm font-semibold text-slate-700 mb-2">Código de Verificación</label>
                                <input
                                    type="text"
                                    maxLength="6"
                                    className="w-full text-center text-3xl tracking-[0.5em] py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition uppercase font-mono text-slate-800"
                                    placeholder="000000"
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value)}
                                    autoFocus
                                    disabled={loading}
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition duration-200 flex justify-center items-center shadow-md hover:shadow-lg"
                            >
                                {loading ? "Validando..." : (
                                    <><FontAwesomeIcon icon={faCheckCircle} className="mr-2" /> Verificar Ingreso</>
                                )}
                            </button>
                            <button
                                type="button"
                                onClick={() => setStep(1)}
                                className="w-full text-sm text-slate-500 hover:text-slate-700 text-center hover:underline"
                            >
                                ¿Correo incorrecto? Volver atrás
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Login;