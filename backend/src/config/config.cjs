require('dotenv').config(); // Carga las variables del .env

module.exports = {
    development: {
        username: process.env.DB_USER || "root",
        password: process.env.DB_PASSWORD || "",
        database: process.env.DB_NAME || "varsovia",
        host: process.env.DB_HOST || "127.0.0.1",
        port: process.env.DB_PORT || 3306,
        dialect: process.env.DB_DIALECT || "mysql"
    },
    test: {
        username: process.env.DB_USER || "root",
        password: process.env.DB_PASSWORD || "",
        database: process.env.DB_NAME_TEST || "database_test",
        host: process.env.DB_HOST || "127.0.0.1",
        dialect: process.env.DB_DIALECT || "mysql"
    },
    production: {
        username: process.env.DB_USER || "root",
        password: process.env.DB_PASSWORD || "",
        database: process.env.DB_NAME_PROD || "database_prod",
        host: process.env.DB_HOST || "127.0.0.1",
        dialect: process.env.DB_DIALECT || "mysql"
    }
};