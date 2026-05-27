import { defineConfig } from 'vite';
import plugin from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [plugin()],
    server: {
        port: 5173,
        proxy: {
            '/api': {
                target: 'http://localhost:5000',
                changeOrigin: true,
                secure: false,  // accept self-signed HTTPS cert from dev backend
            }
        }
    }
})