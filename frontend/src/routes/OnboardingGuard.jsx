import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

const OnboardingGuard = ({ children }) => {
    const location = useLocation();
    const usuarioId = location.state?.usuarioId;

    // Si alguien intenta entrar a /onboarding directamente por la URL,
    // no tendrá el usuarioId en el estado, así que lo devolvemos al login.
    if (!usuarioId) {
        return <Navigate to="/login" replace />;
    }

    // Si trae el usuarioId, lo dejamos pasar al formulario
    return children;
};

export default OnboardingGuard;