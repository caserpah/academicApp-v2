import { sequelize } from './db.connect.js';
import { definirAsociaciones } from './associations/index.js';

export const syncModels = async () => {
    try {
        // Define las asociaciones
        definirAsociaciones();

        // Sincroniza los modelos con la base de datos
        await sequelize.sync({ alter: false }); // Cambia a force: true solo en desarrollo
        console.log('✅ Modelos y asociaciones sincronizados correctamente.');
    } catch (error) {
        console.error('❌ Error al sincronizar los modelos:', error);
        throw error;
    }
};