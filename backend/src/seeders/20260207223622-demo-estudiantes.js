import { fakerES as faker } from "@faker-js/faker";

/** @type {import('sequelize-cli').Migration} */
export default {
  async up(queryInterface, Sequelize) {
    const estudiantes = [];
    const CANTIDAD = 5000;

    console.log(`⏳ Generando ${CANTIDAD} estudiantes... esto puede tardar unos segundos.`);

    for (let i = 0; i < CANTIDAD; i++) {
      // 1. Calcular Fecha de Nacimiento (Edad 3 a 19 años exactos)
      const fechaNacimiento = faker.date.birthdate({ min: 3, max: 19, mode: 'age' });

      // Calcular edad actual para lógica de documento
      const edad = new Date().getFullYear() - fechaNacimiento.getFullYear();

      // 2. Determinar Tipo de Documento según la edad
      let tipoDoc = "RC"; // Por defecto Registro Civil
      if (edad >= 18) {
        tipoDoc = "CC"; // Cédula
      } else if (edad >= 7) {
        tipoDoc = "TI"; // Tarjeta Identidad
      }

      // 3. Determinar Sexo y Generar Nombres acordes
      const sexoEnum = faker.helpers.arrayElement(["M", "F", "I"]);
      // Faker necesita 'male' o 'female' para generar nombres consistentes
      const sexoFaker = sexoEnum === 'M' ? 'male' : (sexoEnum === 'F' ? 'female' : undefined);

      estudiantes.push({
        // --- Identificación ---
        tipoDocumento: tipoDoc,
        // Generamos un número único grande para evitar colisiones
        documento: (1066538000 + i).toString(),
        lugarExpedicion: faker.location.city().slice(0, 100).toUpperCase(),

        // --- Nombres (Forzamos Mayúsculas) ---
        primerNombre: faker.person.firstName(sexoFaker).slice(0, 30).toUpperCase(),
        segundoNombre: Math.random() > 0.5 ? faker.person.middleName(sexoFaker)?.slice(0, 30).toUpperCase() : null,
        primerApellido: faker.person.lastName().slice(0, 30).toUpperCase(),
        segundoApellido: Math.random() > 0.5 ? faker.person.lastName().slice(0, 30).toUpperCase() : null,

        // --- Datos Demográficos ---
        fechaNacimiento: fechaNacimiento,
        lugarNacimiento: faker.location.city().slice(0, 100).toUpperCase(),
        sexo: sexoEnum,
        rh: faker.helpers.arrayElement(["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"]),

        // --- Ubicación ---
        municipioResidencia: faker.location.city().slice(0, 100).toUpperCase(),
        direccion: faker.location.streetAddress().slice(0, 80).toUpperCase(),
        barrio: faker.location.street().slice(0, 60).toUpperCase(), // Usamos calle como nombre de barrio

        // --- Socioeconómico ---
        contacto: faker.string.numeric(10),
        estrato: faker.number.int({ min: 1, max: 6 }),
        sisben: faker.helpers.arrayElement(["A1", "A2", "B1", "C1", "D1", "NO TIENE"]),
        subsidiado: faker.datatype.boolean(),
        eps: faker.company.name().slice(0, 29).toUpperCase(), // Slice para no exceder 30 caracteres

        // --- Caracterización (ENUMS exactos de tu modelo) ---
        victimas: faker.helpers.arrayElement(["DPZ", "DGA", "HDZ", "OTR", "NA"]),
        discapacidad: faker.helpers.arrayElement(["FISICA", "AUDITIVA", "VISUAL", "SORDOCEGUERA", "INTELECTUAL", "PSICOSOCIAL", "MULTIPLE", "OTRA", "NINGUNA"]),
        capacidades: faker.helpers.arrayElement(["SD", "CTC", "CTT", "CTS", "NA"]),
        etnia: faker.helpers.arrayElement(["INDIGENA", "AFROCOLOMBIANO", "RAIZAL", "ROM_GITANO", "NO_APLICA"]),

        // --- Timestamps (Obligatorios en bulkInsert) ---
        fechaCreacion: new Date(),
        fechaActualizacion: new Date()
      });
    }

    try {
      await queryInterface.bulkInsert('estudiantes', estudiantes, {});
      console.log('✅ ¡Carga exitosa!');
    } catch (error) {
      // ESTO TE DIRÁ EXACTAMENTE QUÉ FALLÓ
      console.error("❌ ERROR DETALLADO:");
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
    await queryInterface.bulkDelete('estudiantes', null, {}); // Comando para revertir el seed (borrar todo)
  }
};