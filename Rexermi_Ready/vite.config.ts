import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: './',
  plugins: [react()],
  server: {
    port: 5173,
    host: '0.0.0.0', // Allow external access for Duck DNS
    allowedHosts: [
      'localhost',
      'rexermi.duckdns.org',
      'rexermidigital.duckdns.org',
    ],
  },
})
