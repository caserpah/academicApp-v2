import { fakerES as faker } from "@faker-js/faker";

/** @type {import('sequelize-cli').Migration} */
export default {
  async up(queryInterface, Sequelize) {
    const acudientes = [];
    const CANTIDAD = 3000; // Ajusta la cantidad según necesites

    console.log(`⏳ Generando ${CANTIDAD} acudientes mayores de 18 años...`);

    for (let i = 0; i < CANTIDAD; i++) {
      // 1. Generar género para concordancia de nombres
      const sexoEnum = faker.helpers.arrayElement(["M", "F"]);
      const sexoFaker = sexoEnum === 'M' ? 'male' : 'female';

      // 2. Selección de Documento para Adultos (>18)
      // Aunque el modelo tiene TI/RC, los filtramos porque pediste mayores de edad.
      const tipoDoc = faker.helpers.arrayElement(['CC', 'CE', 'PA']);

      acudientes.push({
        tipoDocumento: tipoDoc,

        // --- UNICIDAD GARANTIZADA ---
        // Usamos una base (ej: 70 millones) + i para que nunca se repita
        documento: (70000000 + i).toString(),

        // --- NOMBRES Y APELLIDOS (MAYÚSCULAS Y CORTADOS) ---
        primerNombre: faker.person.firstName(sexoFaker).slice(0, 30).toUpperCase(),
        segundoNombre: Math.random() > 0.5 ? (faker.person.middleName(sexoFaker) || "").slice(0, 30).toUpperCase() : null,
        primerApellido: faker.person.lastName().slice(0, 30).toUpperCase(),
        segundoApellido: Math.random() > 0.5 ? faker.person.lastName().slice(0, 30).toUpperCase() : null,

        // --- DATOS DE CONTACTO ---
        // Dirección max 80 chars
        direccion: faker.location.streetAddress().slice(0, 80).toUpperCase(),

        // Contacto max 12 chars
        contacto: faker.string.numeric(10),

        // Email max 80 chars
        email: faker.internet.email().slice(0, 80).toLowerCase(),

        // --- TIMESTAMPS (Requeridos por bulkInsert) ---
        fechaCreacion: new Date(),
        fechaActualizacion: new Date()
      });
    }

    try {
      await queryInterface.bulkInsert('acudientes', acudientes, {});
      console.log('✅ ¡Carga de acudientes exitosa!');
    } catch (error) {
      console.error("❌ ERROR AL INSERTAR ACUDIENTES:");
      if (error.errors) {
        error.errors.forEach(e => {
          console.error(`- Campo: ${e.path}, Valor: ${e.value}, Error: ${e.message}`);
        });
      } else {
        console.error(error);
      }
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('acudientes', null, {});
  }
};