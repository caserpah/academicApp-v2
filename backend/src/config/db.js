import dotenv from 'dotenv'; // Importa dotenv para cargar las variables de entorno
dotenv.config(); // Carga las variables de entorno desde el archivo .env

const dbConfig = {
    // Se obtienen los valores de las variables de entorno o se asignan valores por defecto si las variables no están definidas
    HOST: process.env.DB_HOST || 'localhost',
    DB: process.env.DB_NAME || 'varsovia',
    USER: process.env.DB_USER || "root",
    PASSWORD: process.env.DB_PASSWORD || "",
    PORT: process.env.DB_PORT ? parseInt(process.env.DB_PORT) : 3306, // Asegurarse de que el puerto sea un número
    dialect: process.env.DB_DIALECT || 'mysql',
    pool: { // Configuración del pool de conexiones de Sequelize
        max: 5, // Máximo número de conexiones en el pool
        min: 0, // Mínimo número de conexiones en el pool
        acquire: 30000, // Tiempo máximo en milisegundos que Sequelize intentará adquirir una conexión antes de lanzar un error
        idle: 10000 // Tiempo máximo en milisegundos que una conexión puede estar inactiva antes de ser liberada
    }
};

export default dbConfig; // Exporta la configuración de la base de datos para que pueda ser utilizada en otros módulos