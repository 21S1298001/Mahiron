import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    outDir: process.env.OUT_DIR ?? '../mahiron-server/dist/ui',
  },
  plugins: [react()],
})
