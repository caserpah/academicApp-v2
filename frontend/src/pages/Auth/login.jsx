import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Swal from 'sweetalert2';
import { useAuth } from '../../context/AuthContext.jsx';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const userData = await login(email, password);

            // Redirigir al usuario al dashboard o ruta protegida
            navigate('/');

        } catch (error) {
            setLoading(false);
            // Mostrar error con SweetAlert2
            Swal.fire({
                icon: 'error',
                title: 'Error de Autenticación',
                text: error.message || 'Ocurrió un error al intentar iniciar sesión. Inténtelo de nuevo.',
                confirmButtonColor: '#ef4444'
            });
        }
    };

    return (
        // Contenedor centrado y limitado (max-w-md, similar a una tarjeta flotante)
        <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
            <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-2xl">

                <div className="text-center mb-6">
                    <FontAwesomeIcon icon="fa-lock" className="text-blue-500 text-4xl mb-3" />
                    <h2 className="text-3xl font-extrabold text-gray-900">
                        academicApp
                    </h2>
                    <p className="mt-2 text-sm text-gray-600">
                        Completa tus datos para ingresar.
                    </p>
                    <FontAwesomeIcon
                        icon="user-circle" // El icono de usuario
                        className="text-gray-400 text-6xl mt-4 mb-4" // Clases de estilo
                    />
                </div>

                <form className="space-y-6" onSubmit={handleSubmit}>

                    <div>
                        <label
                            htmlFor="email"
                            className="block text-sm font-medium text-gray-700 mb-1"
                        >
                            Correo Electrónico
                        </label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={loading}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 shadow-sm transition duration-150 disabled:bg-gray-100"
                        />
                    </div>

                    <div>
                        <label
                            htmlFor="password"
                            className="block text-sm font-medium text-gray-700 mb-1"
                        >
                            Contraseña
                        </label>
                        <input
                            id="password"
                            name="password"
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={loading}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 shadow-sm transition duration-150 disabled:bg-gray-100"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full flex justify-center py-2 px-4 border border-transparent rounded-lg shadow-sm text-lg font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition duration-150 disabled:bg-blue-400 cursor-pointer"
                    >
                        {loading ? (
                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                        ) : (
                            <>
                                <FontAwesomeIcon icon="fa-sign-in-alt" className="mr-2 mt-0.5" />
                                Inicia sesión
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Login;