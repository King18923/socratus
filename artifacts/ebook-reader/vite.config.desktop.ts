import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

// Desktop build config — no PORT/BASE_PATH required.
// Outputs to ../../desktop/app/ for Electron packaging.
export default defineConfig({
  base: "./",
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "../../desktop/app"),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        // Chunk large deps to keep initial load fast inside Electron
        manualChunks: {
          "epub":  ["epubjs"],
          "pdf":   ["react-pdf", "pdfjs-dist"],
          "radix": [
            "@radix-ui/react-dialog",
            "@radix-ui/react-sheet",
            "@radix-ui/react-select",
            "@radix-ui/react-tabs",
            "@radix-ui/react-context-menu",
          ],
        },
      },
    },
  },
});
