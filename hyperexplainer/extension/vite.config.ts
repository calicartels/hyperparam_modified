// extension/vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  root: '.',      // extension folder
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        popup: path.resolve(__dirname, 'src/popup/index.html'),
        detail: path.resolve(__dirname, 'public/detail.html'),
        // <-- add this line to build your content script:
        content: path.resolve(__dirname, 'src/contentScript.ts'),
      },
      output: {
        // map each entry to `<name>.js`
        entryFileNames: chunk =>
          chunk.name === 'content' ? 'content.js' : '[name].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
})