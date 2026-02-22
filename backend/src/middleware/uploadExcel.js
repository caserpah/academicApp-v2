import multer from 'multer';

// Usamos memoryStorage para no llenar el disco duro de basura.
// El archivo se queda en RAM un momento para validarlo y ya.
const storage = multer.memoryStorage();

const uploadExcel = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 } // Límite de 5MB (opcional pero recomendado)
});

export default uploadExcel;