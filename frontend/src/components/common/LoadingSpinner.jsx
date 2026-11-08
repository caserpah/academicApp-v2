/*import React from "react";

const LoadingSpinner = ({ message = "Cargando..." }) => {
    return (
        <div className="flex flex-col items-center justify-center min-h-[300px] py-10 bg-gray-50 rounded-lg">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-b-transparent border-indigo-500"></div>
            <p className="mt-4 text-lg text-[#2c3e50]">{message}</p>
        </div>
    );
};

export default LoadingSpinner;*/

import React from "react";

const LoadingSpinner = ({ message, size = "medium", color = "indigo", fullContainer = false }) => {
    // Diccionarios de clases Tailwind (evita interpolación insegura de strings)
    const sizes = {
        small: "h-5 w-5 border-2",
        medium: "h-12 w-12 border-4",
        large: "h-16 w-16 border-4"
    };

    const colors = {
        indigo: "border-indigo-500",
        white: "border-white",
        blue: "border-blue-600"
    };

    const spinnerClass = `animate-spin rounded-full border-b-transparent ${sizes[size] || sizes.medium} ${colors[color] || colors.indigo}`;
    const textColor = color === "white" ? "text-white" : "text-[#2c3e50]";

    const spinnerContent = (
        <>
            <div className={spinnerClass}></div>
            {message && <p className={`mt-4 text-center font-medium ${size === 'small' ? 'text-sm' : 'text-lg'} ${textColor}`}>{message}</p>}
        </>
    );

    // Renderiza el bloque gris original de 300px solo si se solicita explícitamente
    if (fullContainer) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[300px] py-10 bg-gray-50 rounded-lg">
                {spinnerContent}
            </div>
        );
    }

    // Renderizado flexible para botones y overlays
    return (
        <div className="flex flex-col items-center justify-center">
            {spinnerContent}
        </div>
    );
};

export default LoadingSpinner;