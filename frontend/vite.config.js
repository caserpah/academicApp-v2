import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          // Si la dependencia viene de node_modules, la separa en un archivo llamado 'vendor'
          if (id.includes('node_modules')) {
            return 'vendor';
          }
        }
      }
    }
  }
})