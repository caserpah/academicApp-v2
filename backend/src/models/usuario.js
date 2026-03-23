import { DataTypes } from 'sequelize';
import { sequelize } from '../database/db.connect.js';
import bcrypt from 'bcrypt';

// Roles permitidos
const ROLES = ["admin", "director", "coordinador", "docente", "acudiente", "secretaria"];

export const Usuario = sequelize.define(
    "usuario",
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
            allowNull: false,
        },

        // Datos de identificación
        nombre: {
            type: DataTypes.STRING(60),
            allowNull: false
        },

        apellidos: {
            type: DataTypes.STRING(80),
            allowNull: false
        },

        documento: {
            type: DataTypes.STRING(20),
            allowNull: false,
            set(value) {
                this.setDataValue("documento", value?.trim());
            }
        },

        telefono: {
            type: DataTypes.STRING(12),
            allowNull: true,
        },
        // Credenciales y Roles

        email: {
            type: DataTypes.STRING(80),
            allowNull: true,
            set(value) {
                if (value) this.setDataValue("email", value.trim().toLowerCase());
            }
        },

        password: {
            type: DataTypes.STRING(100), // Se usa un string largo para almacenar el hash
            allowNull: false
        },

        role: {
            type: DataTypes.ENUM(...ROLES),
            allowNull: false,
            defaultValue: "acudiente"
        },

        activo: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },

        requiereCambioPassword: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: true,
        },

        otpCode: {
            type: DataTypes.STRING(100), // Almacenamos el hash del OTP
            allowNull: true,
            comment: "Código OTP para autenticación de dos factores (2FA), almacenado como hash por seguridad.",
        },

        otpExpires: {
            type: DataTypes.DATE,
            allowNull: true,
        }
    }, {
    tableName: 'usuarios',
    timestamps: true,
    createdAt: 'fechaCreacion', // Renombra el campo createdAt
    updatedAt: 'fechaActualizacion', // Renombra el campo updatedAt

    indexes: [
            {
                unique: true,
                fields: ['documento'],
                name: 'unique_documento_index'
            },
            {
                unique: true,
                fields: ['email'],
                name: 'unique_email_index'
            }
        ]
});

// Hook (gancho) de Sequelize para hashear la contraseña antes de guardar
Usuario.beforeCreate(async (usuario) => {
    // Genera un salt y hashea la contraseña
    const salt = await bcrypt.genSalt(10);
    usuario.password = await bcrypt.hash(usuario.password, salt);
});

// Hook (gancho) de Sequelize para hashear la contraseña antes de actualizar
Usuario.beforeUpdate(async (usuario) => {
    // Solo hashear si la contraseña ha sido modificada
    if (usuario.changed("password") && typeof usuario.password === "string") {
        const salt = await bcrypt.genSalt(10);
        usuario.password = await bcrypt.hash(usuario.password, salt);
    }
});

// Comparar contraseña ingresada con la almacenada
Usuario.prototype.validarPassword = async function (password) {
    return await bcrypt.compare(password, this.password);
};

// Ocultar el hash en respuestas JSON
Usuario.prototype.toJSON = function () {
    const values = { ...this.get() };
    delete values.password;
    delete values.otpCode;     // Ocultamos el OTP también
    delete values.otpExpires;  // Ocultamos la expiración
    return values;
};