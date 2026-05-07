import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), babel({ presets: [reactCompilerPreset()] })],
  server: {
    host: true, // exposes on LAN for your phone
    port: 5173,
    strictPort: false, // fall through to 5174/5175 if 5173 is busy
  },
  // The shared workspace package ships TS source rather than a built dist
  // directory; vite needs to know it's safe to dependency-optimize the
  // member but stay out of the local source resolution.
  optimizeDeps: {
    exclude: ['@mochilang/shared'],
  },
})
