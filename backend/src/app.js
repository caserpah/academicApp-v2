import express from 'express';
import { connectToDatabase } from './database/db.connect.js'; // Importa la función de conexión
import apiRoutes from './routes/apiRouter.js'; // Importa el enrutador centralizado de las rutas
import cors from 'cors'; // Importa CORS para permitir solicitudes desde otros dominios
import dotenv from 'dotenv'; // Importa dotenv para cargar variables de entorno
import { syncModels } from './database/syncRelations.js'; // Importa la función para sincronizar modelos
import { errorHandler } from "./middleware/errorHandler.js";
import path from 'path';
import { fileURLToPath } from 'url';
import helmet from 'helmet'; // Importa Helmet para mejorar la seguridad de la aplicación
import rateLimit from 'express-rate-limit'; // Importa express-rate-limit para limitar la cantidad de solicitudes
import { definirAsociaciones } from './database/associations/index.js'; // Importa la función para definir asociaciones entre modelos

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carga las variables de entorno desde el archivo .env
dotenv.config();

const app = express(); // Crea una instancia de Express

// Configuración para confiar en el proxy (Nginx o en plataformas como Heroku)
app.set('trust proxy', 1);

// 1. Ocultar información del servidor y proteger cabeceras HTTP
app.use(helmet());

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
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'], // Métodos HTTP permitidos
    allowedHeaders: ['Content-Type', 'Authorization', 'x-vigencia-id'], // Encabezados permitidos
}));

// Limitar peticiones a la API para prevenir abusos (Ej: máximo 2000 peticiones por ventana de 15 minutos por IP)
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 2000, // 🚀 AUMENTADO: 2000 peticiones permitidas por ventana
    message: {
        status: "error",
        message: "Demasiadas peticiones desde esta IP, por favor intenta de nuevo más tarde."
    },
    standardHeaders: true,
    legacyHeaders: false,
});
// Aplicar el limitador a todas las rutas de la API
app.use('/api', limiter);

// --- Middlewares para parsear el cuerpo de las solicitudes ---
app.use(express.json()); // Permite que Express maneje solicitudes JSON
app.use(express.urlencoded({ extended: true })); // Permite que Express maneje solicitudes con datos codificados en URL

//  Configuración para servir archivos estáticos (Evidencias)
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// --- Función asíncrona para iniciar la aplicación ---
async function startServer() {
    try {
        // Conecta a la base de datos
        await connectToDatabase(); // Espera a que la conexión se establezca correctamente
        console.log('Servidor iniciado correctamente.');

        definirAsociaciones();
        console.log('✅ Asociaciones de Sequelize cargadas con éxito.');

        // Sincroniza los modelos con la base de datos (Solo en desarrollo)
        // if (process.env.NODE_ENV !== 'production') {
        //     await syncModels();
        // }

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
