export class AppError extends Error {
    constructor(message, { status = 400, alertType = null, title = null, errors = null } = {}) {
        super(message);
        this.name = "AppError";
        this.status = status;
        // Si no se especifica alertType, los códigos 4xx se tratan como advertencia de negocio
        this.alertType = alertType || (status >= 400 && status < 500 ? "warning" : "error");
        this.title = title;
        this.errors = errors;
        Error.captureStackTrace(this, this.constructor);
    }
}

export class BusinessWarning extends AppError {
    constructor(message, title = "Advertencia", status = 422) {
        super(message, { status, alertType: "warning", title });
        this.name = "BusinessWarning";
    }
}

export class BusinessInfo extends AppError {
    constructor(message, title = "Información", status = 404) {
        super(message, { status, alertType: "info", title });
        this.name = "BusinessInfo";
    }
}