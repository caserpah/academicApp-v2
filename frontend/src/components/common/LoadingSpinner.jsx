import React from "react";

const LoadingSpinner = ({ message = "Cargando..." }) => {
    return (
        <div className="flex flex-col items-center justify-center min-h-[300px] py-10 bg-gray-50 rounded-lg">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-b-transparent border-indigo-500"></div>
            <p className="mt-4 text-lg text-[#2c3e50]">{message}</p>
        </div>
    );
};

export default LoadingSpinner;