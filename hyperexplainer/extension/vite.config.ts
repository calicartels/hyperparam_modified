import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  root: ".",
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        popup: path.resolve(__dirname, "src/popup/index.html"),
        content: path.resolve(__dirname, "src/contentScript.ts")
      },
      output: {
        entryFileNames: "[name].js"
      }
    }
  },
  plugins: [react()]
});