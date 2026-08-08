import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import basicSsl from '@vitejs/plugin-basic-ssl'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react(), basicSsl()],
  resolve: {
    alias: {
      '@lib': path.resolve(__dirname, '../src/lib'),
    },
  },
  server: {
    port: 3000,
    strictPort: true,
    headers: {
      'Access-Control-Allow-Origin': '*',
    },
  },
  preview: {
    port: 3000,
    strictPort: true,
  },
})
