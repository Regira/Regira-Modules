import { fileURLToPath, URL } from "node:url"
import { defineConfig } from "vite"
import vue from "@vitejs/plugin-vue"

export default defineConfig({
    plugins: [vue()],
    resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
    define: { __APP_VERSION__: JSON.stringify(process.env.npm_package_version) },
    server: {
        port: Number(process.env.PORT) || 5173, // honor a harness/preview-assigned PORT (Vite ignores it by default)
        // config.json → api is "/api": the SPA calls its own origin, in development as in production, and this
        // forwards /api to the API. Set the target to the API's launch URL (launchSettings.json → applicationUrl): its HTTPS
        // one, or its http:// one for an API that serves HTTP only in development. The API serves its routes under the
        // "api" prefix. See entities.setup.md → The URL contract
        proxy: { "/api": { target: "https://localhost:7001", changeOrigin: true, secure: false, xfwd: true } },
    },
})
