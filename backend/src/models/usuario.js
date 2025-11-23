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
        nombreCompleto: {
            type: DataTypes.STRING(80),
            allowNull: false,
            validate: {
                notEmpty: { msg: "El nombre completo es obligatorio." },
                len: {
                    args: [3, 80],
                    msg: "El nombre completo debe tener entre 3 y 80 caracteres.",
                },
            },
        },
        numeroDocumento: {
            type: DataTypes.STRING(20),
            allowNull: false,
            unique: true,
            set(value) {
                this.setDataValue("numeroDocumento", value?.trim());
            },
            validate: {
                notEmpty: { msg: "El número de documento es obligatorio." },
                len: {
                    args: [5, 20],
                    msg: "El documento debe tener entre 5 y 20 caracteres.",
                },
            },
        },
        contacto: {
            type: DataTypes.STRING(12),
            allowNull: true,
            validate: {
                isNumeric: { msg: "El contacto solo debe contener números." },
                len: {
                    args: [10, 12],
                    msg: "El contacto debe tener entre 10 y 12 dígitos.",
                },
            },
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
    return values;
};