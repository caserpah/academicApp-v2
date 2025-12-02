import { sequelize } from "../src/database/db.connect.js";
import { Desempeno } from "../src/models/desempeno.js";
import { DesempenoRango } from "../src/models/desempeno_rango.js";
import { Vigencia } from "../src/models/vigencia.js";

async function main() {
    try {
        console.log("⏳ Conectando a la BD...");
        await sequelize.authenticate();
        console.log("✔ Conectado.\n");

        if (await DesempenoRango.count() > 0) {
            console.log("ℹ️ Los rangos de desempeño ya existen. No se insertó nada.");
            return process.exit();
        }

        const vig = await Vigencia.findOne({ order: [["id", "DESC"]] });
        if (!vig) {
            console.log("❌ No hay vigencias creadas.");
            return process.exit(1);
        }

        const desempenos = await Desempeno.findAll();

        const mapa = {
            BAJO: [1.00, 2.99],
            BASICO: [3.00, 3.99],
            ALTO: [4.00, 4.59],
            SUPERIOR: [4.60, 5.00]
        };

        const rows = [];

        for (const d of desempenos) {
            if (mapa[d.nombre]) {
                rows.push({
                    desempenoId: d.id,
                    vigenciaId: vig.id,
                    minNota: mapa[d.nombre][0],
                    maxNota: mapa[d.nombre][1]
                });
            }
        }

        await DesempenoRango.bulkCreate(rows);

        console.log("🎉 Rangos de desempeño insertados correctamente.");
        process.exit();

    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

main();
