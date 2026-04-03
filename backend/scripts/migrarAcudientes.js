import fs from 'fs';
import csv from 'csv-parser';

import { Estudiante } from '../src/models/estudiante.js';
import { acudienteService } from '../src/services/acudiente.service.js';

async function iniciarMigracion() {
    const resultados = [];
    let exitosos = 0;
    let errores = 0;

    console.log("⏳ Leyendo archivo migracion.csv...");

    // 1. Leer el archivo CSV
    fs.createReadStream('migracion.csv')
        .pipe(csv())
        .on('data', (data) => resultados.push(data))
        .on('end', async () => {
            console.log(`📊 Se encontraron ${resultados.length} filas. Iniciando proceso...`);

            // 2. Procesar FILA por FILA secuencialmente (Evita colisiones con documentos repetidos)
            for (let i = 0; i < resultados.length; i++) {
                const fila = resultados[i];

                try {
                    // Buscar al estudiante por su documento
                    const estudiante = await Estudiante.findOne({
                        where: { documento: fila.DOCESTUDIANTE }
                    });

                    if (!estudiante) {
                        console.log(`❌ Fila ${i + 2}: Estudiante NO encontrado (Doc: ${fila.DOCESTUDIANTE})`);
                        errores++;
                        continue;
                    }

                    // Armar el objeto para el servicio
                    const payload = {
                        estudianteId: estudiante.id,
                        afinidad: fila.afinidad ? fila.afinidad.toUpperCase() : 'OTRO', // Por defecto 'OTRO' si está vacío
                        tipoDocumento: fila.tipoDocumento || 'CC',
                        documento: fila.documento,
                        nombres: fila.nombres,
                        apellidos: fila.apellidos,
                        direccion: fila.direccion || '',
                        telefono: fila.telefono || '',
                        email: '' // Asumo que no hay email en tu Excel
                    };

                    // Llamamos a la misma función mágica que usa la plataforma
                    await acudienteService.asignarEstudiante(payload);

                    console.log(`✅ Fila ${i + 2}: Acudiente ${fila.documento} asignado a Estudiante ${fila.DOCESTUDIANTE}`);
                    exitosos++;

                } catch (error) {
                    console.log(`⚠️ Fila ${i + 2} - Error con acudiente ${fila.documento}: ${error.message}`);
                    errores++;
                }
            }

            console.log("\n==================================");
            console.log("🏁 MIGRACIÓN FINALIZADA");
            console.log(`✔️ Exitosos: ${exitosos}`);
            console.log(`❌ Errores/No encontrados: ${errores}`);
            console.log("==================================\n");
            process.exit(0);
        });
}

iniciarMigracion();