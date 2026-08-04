import { fileURLToPath, URL } from "node:url"
import { defineConfig } from "vite"
import vue from "@vitejs/plugin-vue"

export default defineConfig({
    plugins: [vue()],
    resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
    define: { __APP_VERSION__: JSON.stringify(process.env.npm_package_version) },
    server: { port: Number(process.env.PORT) || 5173 }, // honor a harness/preview-assigned PORT (Vite ignores it by default)
    // calling the API through a dev proxy instead of its origin? add server.proxy — see entities.setup.md → The URL contract
})
