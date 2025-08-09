import { defineConfig } from 'vite'

export default defineConfig({
  root: 'examples',
  server: {
    port: 3000,
    open: '/frontend-integration.html'
  },
  build: {
    outDir: '../dist/examples',
    emptyOutDir: true
  }
})