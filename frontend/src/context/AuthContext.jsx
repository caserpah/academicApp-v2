import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'; // <--- 1. Importamos useCallback
import axios from 'axios';
import { jwtDecode } from 'jwt-decode';
import { useNavigate } from 'react-router-dom';

const AuthContext = createContext();
const API_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001";

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    // --- Definimos logout con useCallback ANTES del useEffect ---
    // Esto "memoriza" la función para que no cambie en cada render
    const logout = useCallback(() => {
        localStorage.removeItem('userToken');
        localStorage.removeItem('userData');
        delete axios.defaults.headers.common['Authorization'];
        setUser(null);
        setIsAuthenticated(false);
        navigate('/login');
    }, [navigate]); // <--- Dependencia: solo se recrea si navigate cambia

    // --- Verificar sesión al cargar ---
    useEffect(() => {
        const checkAuthStatus = () => {
            const token = localStorage.getItem('userToken');
            const userDataString = localStorage.getItem('userData');

            if (token && userDataString) {
                try {
                    const decoded = jwtDecode(token);
                    const currentTime = Date.now() / 1000;
                    if (decoded.exp > currentTime) {
                        setUser(JSON.parse(userDataString));
                        setIsAuthenticated(true);
                        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
                    } else {
                        logout();
                    }
                } catch {
                    logout();
                }
            } else {
                setIsAuthenticated(false);
                setUser(null);
            }
            setLoading(false);
        };
        checkAuthStatus();
    }, [logout]);

    // --- PASO 1: Login ---
    const login = async (email, password) => {
        try {
            const response = await axios.post(`${API_URL}/api/auth/login`, { email, password });
            return response.data;
        } catch (error) {
            throw error.response?.data || new Error("Error de conexión.");
        }
    };

    // --- PASO 2: Verify OTP ---
    const verifyOtp = async (email, otp) => {
        try {
            const response = await axios.post(`${API_URL}/api/auth/verify-otp`, { email, otp });
            const { token, usuario } = response.data;

            localStorage.setItem('userToken', token);
            localStorage.setItem('userData', JSON.stringify(usuario));
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

            setUser(usuario);
            setIsAuthenticated(true);
            return true;
        } catch (error) {
            throw error.response?.data || new Error("Código inválido.");
        }
    };

    const hasRole = (requiredRole) => {
        if (!user || !user.role) return false;
        const rolesToCheck = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
        return rolesToCheck.includes(user.role);
    };

    return (
        <AuthContext.Provider value={{ user, isAuthenticated, loading, login, verifyOtp, logout, hasRole }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => useContext(AuthContext);