import React from 'react';

const Bienvenida = () => {
    return (
        <div className="p-6 bg-white rounded-lg shadow-lg min-h-full">
            <h2 className="text-3xl font-bold text-gray-800 mb-4">
                Bienvenido a AcademicApp
            </h2>

            {/* Contenido visual, como la imagen que mostraste */}
            <div className="mt-8">
                <img
                    src="/src/assets/knowledge.jpg"
                    alt="Estudiante en clase"
                    className="w-full h-auto max-h-96 object-cover rounded-lg shadow-md"
                />
            </div>

            <p className="mt-6 text-gray-500">
                Utiliza el menú lateral para navegar a las diferentes secciones del sistema.
            </p>
        </div>
    );
};

export default Bienvenida;