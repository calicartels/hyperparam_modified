// extension/vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  root: 'src',           // look under src/ for HTML & TSX
  publicDir: '../public',// copy manifest.json (+icons) into dist/
  plugins: [react()],
  build: {
    outDir: '../dist',   // emit into extension/dist
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup:  path.resolve(__dirname, 'src/popup.html'),
        detail: path.resolve(__dirname, 'src/detail.html'),
        content:path.resolve(__dirname, 'src/contentScript.ts'),
      },
      output: {
        entryFileNames: chunk =>
          chunk.name === 'content' ? 'content.js' : '[name].js',
        chunkFileNames:   'assets/[name]-[hash].js',
        assetFileNames:   'assets/[name]-[hash][extname]',
      },
    },
  },
})