import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Tauri expects a fixed dev server port and clears the screen itself
  clearScreen: false,
  server: {
    port: 5173,
    strictPort: true,
  },
})
