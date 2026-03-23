module.exports = {
    apps: [
        {
            name: "api-varsovia",
            script: "./app.js",
            instances: "max",     // Usa los 2 núcleos del VPS KVM 2
            exec_mode: "cluster", // Activa el balanceo de carga para 4000 alumnos
            env: {
                NODE_ENV: "production",
                PORT: 3001
            }
        }
    ]
};