import { DataTypes } from 'sequelize';
import { sequelize } from '../database/db.connect.js';
import bcrypt from 'bcrypt';

// Roles permitidos
const ROLES = ["admin", "director", "coordinador", "docente", "acudiente"];

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
            allowNull: false,
            validate: {
                notEmpty: { msg: "El nombre es obligatorio." },
            },
        },
        apellidos: {
            type: DataTypes.STRING(80),
            allowNull: false,
            validate: {
                notEmpty: { msg: "Los apellidos son obligatorios." },
            },
        },
        documento: {
            type: DataTypes.STRING(20),
            allowNull: false,
            unique: true,
            set(value) {
                this.setDataValue("documento", value?.trim());
            },
            validate: {
                notEmpty: { msg: "El número de documento es obligatorio." },
                len: {
                    args: [5, 20],
                    msg: "El documento debe tener entre 5 y 20 caracteres.",
                },
            },
        },
        telefono: {
            type: DataTypes.STRING(12),
            allowNull: true,
        },
        // Credenciales y Roles
        email: {
            type: DataTypes.STRING(80),
            allowNull: false,
            unique: true,
            set(value) {
                this.setDataValue("email", value?.trim().toLowerCase());
            },
            validate: {
                isEmail: { msg: "Debe ingresar un correo electrónico válido." },
                notEmpty: { msg: "El correo electrónico es obligatorio." },
            },
        },
        password: {
            type: DataTypes.STRING(100), // Se usa un string largo para almacenar el hash
            allowNull: false,
            validate: {
                notEmpty: { msg: "La contraseña es obligatoria." },
                len: {
                    args: [8, 100],
                    msg: "La contraseña debe tener al menos 8 caracteres.",
                },
            },
        },
        role: {
            type: DataTypes.ENUM(...ROLES),
            allowNull: false,
            defaultValue: "acudiente",
            validate: {
                isIn: {
                    args: [ROLES],
                    msg: "El rol especificado no es válido.",
                },
            },
        },
        activo: {
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
    // Aquí puedes añadir más opciones del modelo si las necesitas
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