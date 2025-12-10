import { sequelize } from "../src/database/db.connect.js";
import { Grado } from "../src/models/grado.js";
import { ConfigGrado } from "../src/models/config_grado.js";

async function main() {
    try {
        console.log("⏳ Conectando a la BD...");
        await sequelize.authenticate();
        console.log("✔ Conectado.\n");

        const grados = await Grado.findAll();

        if (await ConfigGrado.count() > 0) {
            console.log("ℹ️ Configuración de grados ya existe. No se insertó nada.");
            return process.exit();
        }

        const rows = [];

        for (const g of grados) {

            if (["PRE_JARDIN", "JARDIN", "TRANSICION"].includes(g.nombre)) {
                rows.push({
                    gradoId: g.id,
                    usaDesempenosMultiples: true,
                    usaRangosNotas: true,
                    periodosPermitidos: [1, 2, 3, 4],
                    muestraNotaEnBoletin: false
                });
            }

            else if (g.nombre === "CICLO_V") {
                rows.push({
                    gradoId: g.id,
                    usaDesempenosMultiples: false,
                    usaRangosNotas: false,
                    periodosPermitidos: [1, 2],
                    muestraNotaEnBoletin: true
                });
            }

            else if (g.nombre === "CICLO_VI") {
                rows.push({
                    gradoId: g.id,
                    usaDesempenosMultiples: false,
                    usaRangosNotas: false,
                    periodosPermitidos: [3, 4],
                    muestraNotaEnBoletin: true
                });
            }

            else {
                rows.push({
                    gradoId: g.id,
                    usaDesempenosMultiples: false,
                    usaRangosNotas: false,
                    periodosPermitidos: [1, 2, 3, 4],
                    muestraNotaEnBoletin: true
                });
            }
        }

        await ConfigGrado.bulkCreate(rows);

        console.log("🎉 Configuración de grados insertada correctamente.");
        process.exit();

    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

main();