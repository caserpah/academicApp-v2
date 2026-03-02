import { Resend } from 'resend';
import nodemailer from 'nodemailer';

// Leemos las variables de entorno
const isProduction = process.env.NODE_ENV === 'production';

// Configurar Cliente RESEND (Para Desarrollo)
const resend = new Resend(process.env.RESEND_API_KEY);

// Configurar Cliente NODEMAILER (Para Producción)
// Esto solo se activará cuando se cambie NODE_ENV a 'production'
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: false, // true para puerto 465, false para otros
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

export const emailService = {
    /**
     * Envía el código OTP al usuario.
     * @param {string} email - Correo del destinatario
     * @param {string} otpCode - Código de 6 dígitos
     */
    async sendOTP(email, otpCode) {

        const asunto = "🔐 Código de Verificación - AcademicApp";

        // HTML del correo (Diseño simple y limpio)
        const htmlContent = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                <h2 style="color: #2563eb; text-align: center;">Control de Acceso</h2>
                <p style="font-size: 16px; color: #333;">Hola,</p>
                <p style="font-size: 16px; color: #333;">Estás intentando iniciar sesión en el sistema académico. Utiliza el siguiente código para completar el proceso:</p>

                <div style="background-color: #f3f4f6; padding: 15px; text-align: center; border-radius: 8px; margin: 20px 0;">
                    <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #1f2937;">${otpCode}</span>
                </div>

                <p style="font-size: 14px; color: #666; text-align: center;">Este código expira en 5 minutos.</p>
                <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="font-size: 12px; color: #999; text-align: center;">Si no solicitaste este código, ignora este mensaje.</p>
            </div>
        `;

        try {
            if (!isProduction) {
                // === MODO DESARROLLO (Resend) ===
                console.log(`📡 Enviando email vía Resend a: ${email}`);

                const data = await resend.emails.send({
                    from: 'AcademicApp <onboarding@resend.dev>', // Resend usa este remitente por defecto en la versión gratis
                    to: [email], // En modo gratis, SOLO puedes enviar al correo con el que te registraste en Resend (para pruebas).
                    subject: asunto,
                    html: htmlContent,
                });

                if (data.error) {
                    console.error("❌ Error Resend:", data.error);
                    throw new Error("No se pudo enviar el correo de desarrollo.");
                }

                console.log("✅ Correo enviado (Dev Mode):", data.id);
                return true;

            } else {
                // === MODO PRODUCCIÓN (SMTP) ===
                console.log(`📡 Enviando email vía SMTP Institucional a: ${email}`);

                const info = await transporter.sendMail({
                    from: `"Sistema Académico" <${process.env.SMTP_USER}>`,
                    to: email,
                    subject: asunto,
                    html: htmlContent,
                });

                console.log("✅ Correo enviado (Prod Mode):", info.messageId);
                return true;
            }

        } catch (error) {
            console.error("🔥 Error crítico enviando correo:", error);
            // En desarrollo, no queremos que la app se rompa si falla el email,
            // pero en un login real es crítico.
            throw new Error("El servicio de correo no está disponible.");
        }
    },

    /**
     * Envía correo de recuperación de contraseña con lógica híbrida.
     * @param {string} email - Destinatario
     * @param {string} otpCode - Código de 6 dígitos
     */
    async sendRecoveryEmail(email, otpCode) {

        const asunto = "🔄 Recuperación de Contraseña - AcademicApp";

        // HTML Específico para Recuperación (Tono de seguridad/alerta en Rojo)
        const htmlContent = `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
                
                <div style="background-color: #dc2626; padding: 20px; text-align: center;">
                    <h2 style="color: #ffffff; margin: 0; font-size: 24px;">Restablecer Contraseña</h2>
                </div>

                <div style="padding: 30px 20px;">
                    <p style="font-size: 16px; color: #374151; margin-bottom: 20px; text-align: center;">
                        Hola, hemos recibido una solicitud para cambiar tu contraseña.
                    </p>
                    
                    <div style="background-color: #fef2f2; padding: 20px; text-align: center; border-radius: 8px; margin: 25px 0; border: 1px dashed #fca5a5;">
                        <span style="display: block; font-size: 14px; color: #7f1d1d; margin-bottom: 5px;">Tu código de seguridad es:</span>
                        <span style="font-size: 36px; font-weight: 800; letter-spacing: 6px; color: #991b1b;">${otpCode}</span>
                    </div>
                    
                    <p style="font-size: 14px; color: #6b7280; text-align: center;">
                        Este código expira en <strong>10 minutos</strong>.
                    </p>
                </div>

                <div style="background-color: #f9fafb; padding: 15px; text-align: center; border-top: 1px solid #e5e7eb;">
                    <p style="font-size: 12px; color: #9ca3af; margin: 0;">
                        Si no solicitaste este cambio, por favor ignora este correo. Tu cuenta sigue segura.
                    </p>
                </div>
            </div>
        `;

        try {
            // ==========================================
            // 🛑 LÓGICA HÍBRIDA (DEV vs PROD)
            // ==========================================

            if (!isProduction) {
                // CASO A: DESARROLLO (Resend)
                console.log(`🔄 [DEV - RESEND] Enviando código de recuperación a: ${email}`);

                const data = await resend.emails.send({
                    from: 'AcademicApp Security <onboarding@resend.dev>',
                    to: [email], // Recuerda: En plan gratis, solo a tu correo registrado
                    subject: asunto,
                    html: htmlContent,
                });

                if (data.error) {
                    console.error("❌ Error Resend:", data.error);
                    throw new Error("No se pudo enviar el correo de recuperación (Dev).");
                }

                console.log("✅ Correo enviado (Resend ID):", data.id);
                return true;

            } else {
                // CASO B: PRODUCCIÓN (SMTP Institucional)
                console.log(`🔄 [PROD - SMTP] Enviando código de recuperación a: ${email}`);

                const info = await transporter.sendMail({
                    from: `"Seguridad Académica" <${process.env.SMTP_USER}>`,
                    to: email,
                    subject: asunto,
                    html: htmlContent,
                });

                console.log("✅ Correo enviado (SMTP ID):", info.messageId);
                return true;
            }

        } catch (error) {
            console.error("🔥 Error crítico enviando correo de recuperación:", error);
            throw new Error("El servicio de correo no está disponible.");
        }
    }
};