import { Sequelize } from "sequelize";
import dbConfig from '../config/db.js'; // Importa la configuración de la base de datos

const { HOST, DB, USER, PASSWORD, PORT, dialect, pool } = dbConfig; // Desestructura la configuración de la base de datos para un código mas limpio y legible

// Crea una instancia de Sequelize para conectarse a la base de datos
// Utiliza las variables de entorno o valores por defecto definidos en db.config.js
export const sequelize = new Sequelize(DB, USER, PASSWORD, {
    host: HOST,
    port: PORT,
    dialect: dialect,
    pool: pool,
    logging: false // Desactiva el logging de consultas SQL para evitar que se muestren en la consola
});

/**
 * Función asíncrona para autenticar la conexión a la base de datos.
 * Intenta conectar y visualiza el resultado en la consola.
 */
export async function connectToDatabase() {
    try {
        await sequelize.authenticate(); // Intenta autenticar la conexión
        console.log('Conexión a la base de datos establecida exitosamente.');
    } catch (error) {
        console.error('No se pudo conectar a la base de datos:', error);
        // Muestra un error si la conexión falla
        process.exit(1); // Termina el proceso si la conexión falla. Esto evita que el servidor inicie si no puede acceder a la base de datos.
    }
};