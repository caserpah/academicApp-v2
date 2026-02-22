import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Configurar Rutas para ES Modules (__dirname no existe nativamente)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Definimos la ruta donde se guardarán los archivos
// Se guardarán en: TU_PROYECTO/public/uploads/evidencias
const UPLOADS_DIR = path.join(__dirname, '../../public/uploads/evidencias');

// Aseguramos que la carpeta exista. Si no, la crea.
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Configuración del Almacenamiento (DiskStorage)
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOADS_DIR);
    },
    filename: (req, file, cb) => {
        // Generamos un nombre único para evitar sobrescribir archivos con el mismo nombre
        // Ejemplo: evidencia-17150000-999.pdf
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'evidencia-' + uniqueSuffix + ext);
    }
});

// Filtro de Archivos (Seguridad)
const fileFilter = (req, file, cb) => {
    // Aceptamos Imágenes (jpg, png) y Documentos (pdf, doc, docx)
    const allowedTypes = /jpeg|jpg|png|pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
        return cb(null, true);
    } else {
        cb(new Error('Formato de archivo no válido. Solo se permiten PDF, Imágenes y Word.'));
    }
};

// Inicializar Multer
const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // Límite de 5MB por archivo
    fileFilter: fileFilter
});

// Exportamos el middleware configurado para esperar un campo llamado 'evidencia'
export const uploadEvidence = upload.single('evidencia');