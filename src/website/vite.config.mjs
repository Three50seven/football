import { resolve } from "node:path";
import { defineConfig } from "vite";
import { viteStaticCopy } from "vite-plugin-static-copy";

export default defineConfig({
  appType: "mpa",
  publicDir: false,
  server: {
    host: "localhost",
    port: 8080,
    strictPort: true
  },
  preview: {
    host: "localhost",
    port: 8080,
    strictPort: true
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        index: resolve(import.meta.dirname, "index.html"),
        Football: resolve(import.meta.dirname, "Football.html")
      }
    }
  },
  plugins: [
    viteStaticCopy({
      targets: [
        {
          src: "wwwroot",
          dest: "."
        }
      ]
    })
  ]
});