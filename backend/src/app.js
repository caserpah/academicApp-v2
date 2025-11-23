import express from 'express';
import { connectToDatabase } from './database/db.connect.js'; // Importa la función de conexión
import apiRoutes from './routes/apiRouter.js'; // Importa el enrutador centralizado de las rutas
import cors from 'cors'; // Importa CORS para permitir solicitudes desde otros dominios
import dotenv from 'dotenv'; // Importa dotenv para cargar variables de entorno
import { syncModels } from './database/syncRelations.js'; // Importa la función para sincronizar modelos
import { errorHandler } from "./middleware/errorHandler.js";

// Carga las variables de entorno desde el archivo .env
dotenv.config();

const app = express(); // Crea una instancia de Express

// *** Configuracion de CORS ***
// Los orígenes permitidos se obtienen de una variable de entorno.
// Si no se define, se usa 'http://localhost:5173' como valor por defecto.
const allowedOrigins = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:5173'];

app.use(cors({
    origin: (origin, callback) => {
        // Permite solicitudes sin origen (como las herramientas de desarrollo de Postman)
        // y los origenes definidos en la variable de entorno ALLOWED_ORIGINS.
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            // Si el origen no está permitido, se lanza un error.
            callback(new Error(`Origen ${origin} no permitido por CORS`));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE'], // Métodos HTTP permitidos
    allowedHeaders: ['Content-Type', 'Authorization'], // Encabezados permitidos
}));

// --- Middlewares para parsear el cuerpo de las solicitudes ---
app.use(express.json()); // Permite que Express maneje solicitudes JSON
app.use(express.urlencoded({ extended: true })); // Permite que Express maneje solicitudes con datos codificados en URL

// --- Función asíncrona para iniciar la aplicación ---
async function startServer() {
    try {
        // Conecta a la base de datos
        await connectToDatabase(); // Espera a que la conexión se establezca correctamente
        console.log('Servidor iniciado correctamente.');

        // Sincroniza los modelos con la base de datos (opcional, solo en desarrollo)
        // Descomentar para sincronizar modelos, no recomendado en producción
        await syncModels();

        // Montar el enrutador centralizado de las rutas bajo el prefijo /api
        app.use('/api', apiRoutes);

        // --- Middlewares de manejo de errores ---

        // Middleware para manejar errores 404 (ruta no encontrada)
        app.use((req, res, next) => {
            res.status(404).json({
                status: "error",
                message: "Ruta no encontrada",
            });
        });

        // Middleware de manejo de errores centralizado
        app.use(errorHandler);

        // --- Iniciar el servidor Express ---
        const PORT = process.env.PORT || 3001; // Puerto del servidor, se obtiene de las variables de entorno o se usa 3000 por defecto
        app.listen(PORT, () => {
            console.log(`Servidor corriendo en el puerto ${PORT}`);
            console.log(`Accede a la API en: http://localhost:${PORT}/api`);
            console.log(`Entorno: ${process.env.NODE_ENV}`);
        });

    } catch (error) {
        // Si hay un error crítico al iniciar la aplicación, por ejemplo que no se establesca la conexión a DB,
        // se registra el error y se sale del proceso.
        console.error('Error crítico al iniciar la aplicación:', error);
        process.exit(1); // Termina el proceso si hay un error al iniciar
    }
}
// Llama a la función para iniciar el servidor
startServer(); // Inicia el servidor y la conexión a la base de datos