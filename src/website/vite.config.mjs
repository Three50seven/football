import fs from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "vite";
import { viteStaticCopy } from "vite-plugin-static-copy";

export function unbundledDevPlugin() {
  let bundles = [];
  let outputDirs = { js: "content/js", css: "content/css" };

  try {
    const bundlesContent = fs.readFileSync(new URL("./bundles.json", import.meta.url), "utf8");
    bundles = JSON.parse(bundlesContent);
  } catch (err) {
    console.warn("Could not load bundles.json:", err.message);
  }

  try {
    const appsettingsContent = fs.readFileSync(new URL("./appsettings.json", import.meta.url), "utf8");
    const appsettings = JSON.parse(appsettingsContent);
    if (appsettings?.Bundling?.OutputDirectories) {
      outputDirs = appsettings.Bundling.OutputDirectories;
    }
  } catch (err) {
    console.warn("Could not load appsettings.json:", err.message);
  }

  function getExtension(bundle) {
    if (bundle.outputfilename) {
      const match = /(?:\.([^.]+))?$/.exec(bundle.outputfilename);
      if (match && match[1]) return match[1].toLowerCase();
    }
    if (bundle.files && bundle.files.length) {
      for (const f of bundle.files) {
        const match = /(?:\.([^.]+))?$/.exec(f);
        if (match && match[1]) return match[1].toLowerCase();
      }
    }
    return "js";
  }

  function getRawFiles(bundle) {
    let files = [];
    if (bundle && bundle.files && bundle.files.length) {
      for (const f of bundle.files) {
        const subBundle = bundles.find(b => (b.name || "").toLowerCase() === f.toLowerCase());
        if (subBundle) {
          files = files.concat(getRawFiles(subBundle));
        } else {
          files.push(f.replace(/\\/g, "/"));
        }
      }
    }
    return files;
  }

  return {
    name: "unbundled-dev-html",
    apply: "serve", // Only active during dev server, leaves bundles untouched for production build
    configureServer(server) {
      server.watcher.add([
        resolve(import.meta.dirname, "wwwroot"),
        resolve(import.meta.dirname, "bundles.json"),
        resolve(import.meta.dirname, "appsettings.json")
      ]);

      const reload = (file) => {
        if (!file) return;
        const normalized = file.replace(/\\/g, "/");
        if (
          normalized.includes("/wwwroot/") ||
          normalized.endsWith(".html") ||
          normalized.endsWith(".json")
        ) {
          server.ws.send({
            type: "full-reload",
            path: "*"
          });
        }
      };

      server.watcher.on("change", reload);
      server.watcher.on("add", reload);
      server.watcher.on("unlink", reload);

      // Disable caching for dev assets to guarantee fresh responses
      server.middlewares.use((req, res, next) => {
        if (req.url && (req.url.startsWith("/wwwroot") || req.url.includes(".html") || req.url === "/")) {
          res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
          res.setHeader("Pragma", "no-cache");
          res.setHeader("Expires", "0");
        }
        next();
      });
    },
    transformIndexHtml(html) {
      let result = html;
      for (const b of bundles) {
        const ext = getExtension(b);
        const outName = b.outputfilename || `${b.name.replace(/ /g, "_")}.min.${ext}`;
        const sub = b.subpath || "";
        const outDir = b.outputdirectory || outputDirs[ext] || "";
        const relOut = [outDir, sub, outName].filter(Boolean).join("/").replace(/\/+/g, "/");
        const rawFiles = getRawFiles(b).map(f => `/wwwroot/${f.replace(/^\/+/, "")}`);

        const escapedRelOut = relOut.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

        if (ext === "css") {
          const linkRegex = new RegExp(`<link\\s+[^>]*href=["'][^"']*${escapedRelOut}["'][^>]*\\/?>`, "gi");
          result = result.replace(linkRegex, () => {
            return rawFiles.map(f => `<link rel="stylesheet" type="text/css" href="${f}" media="screen" />`).join("\n        ");
          });
        } else if (ext === "js") {
          const scriptRegex = new RegExp(`<script\\s+[^>]*src=["'][^"']*${escapedRelOut}["'][^>]*><\\/script>`, "gi");
          result = result.replace(scriptRegex, () => {
            return rawFiles.map(f => `<script src="${f}"></script>`).join("\n        ");
          });
        }
      }
      return result;
    }
  };
}

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
    unbundledDevPlugin(),
    viteStaticCopy({
      targets: [
        {
          src: "wwwroot",
          dest: "."
        },
        {
          src: "favicon.ico",
          dest: "."
        }
      ]
    })
  ]
});