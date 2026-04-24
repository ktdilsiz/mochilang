import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), babel({ presets: [reactCompilerPreset()] })],
  server: {
    host: true, // exposes on LAN for your phone
    port: 5173,
    proxy: {
      '/api': 'http://localhost:8080', // forward API calls to Go
    },
  },
})
