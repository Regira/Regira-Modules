import { defineConfig } from "vite"
import { resolve } from "path"
import vue from "@vitejs/plugin-vue"
import { fileURLToPath } from "url"
import { version } from "./package.json"

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [vue()],
    resolve: {
        alias: {
            "@": fileURLToPath(new URL("./src", import.meta.url)),
        },
    },
    build: {
        lib: {
            entry: {
                // root
                "index": resolve(__dirname, "src/index.ts"),
                // top-level modules
                "entities/index": resolve(__dirname, "src/entities/index.ts"),
                "events/index": resolve(__dirname, "src/events/index.ts"),
                "extensions/index": resolve(__dirname, "src/extensions/index.ts"),
                "firebase/index": resolve(__dirname, "src/firebase/index.ts"),
                "identity/index": resolve(__dirname, "src/identity/index.ts"),
                "io/index": resolve(__dirname, "src/io/index.ts"),
                "treelist/index": resolve(__dirname, "src/treelist/index.ts"),
                "utilities/index": resolve(__dirname, "src/utilities/index.ts"),
                // individual utility files
                "extensions/date-extensions": resolve(__dirname, "src/extensions/date-extensions.ts"),
                "utilities/array-utility": resolve(__dirname, "src/utilities/array-utility.ts"),
                "utilities/file-utility": resolve(__dirname, "src/utilities/file-utility.ts"),
                "utilities/promise-utility": resolve(__dirname, "src/utilities/promise-utility.ts"),
                "utilities/string-utility": resolve(__dirname, "src/utilities/string-utility.ts"),
                // vue modules
                "vue/index": resolve(__dirname, "src/vue/index.ts"),
                "vue/vue-helper": resolve(__dirname, "src/vue/vue-helper.ts"),
                "vue/app/index": resolve(__dirname, "src/vue/app/index.ts"),
                "vue/auth/index": resolve(__dirname, "src/vue/auth/index.ts"),
                "vue/debug/index": resolve(__dirname, "src/vue/debug/index.ts"),
                "vue/directives/index": resolve(__dirname, "src/vue/directives/index.ts"),
                "vue/entities/index": resolve(__dirname, "src/vue/entities/index.ts"),
                "vue/entities/details/index": resolve(__dirname, "src/vue/entities/details/index.ts"),
                "vue/entities/form/index": resolve(__dirname, "src/vue/entities/form/index.ts"),
                "vue/entities/abstractions/index": resolve(__dirname, "src/vue/entities/abstractions/index.ts"),
                "vue/entities/abstractions/IEntity": resolve(__dirname, "src/vue/entities/abstractions/IEntity.ts"),
                "vue/formatters/index": resolve(__dirname, "src/vue/formatters/index.ts"),
                "vue/http/index": resolve(__dirname, "src/vue/http/index.ts"),
                "vue/http/axios": resolve(__dirname, "src/vue/http/axios.ts"),
                "vue/ioc/index": resolve(__dirname, "src/vue/ioc/index.ts"),
                "vue/lang/index": resolve(__dirname, "src/vue/lang/index.ts"),
                "vue/online/index": resolve(__dirname, "src/vue/online/index.ts"),
                "vue/ui/index": resolve(__dirname, "src/vue/ui/index.ts"),
                "vue/ui/feedback/index": resolve(__dirname, "src/vue/ui/feedback/index.ts"),
                "vue/ui/icons/index": resolve(__dirname, "src/vue/ui/icons/index.ts"),
                "vue/ui/modal/index": resolve(__dirname, "src/vue/ui/modal/index.ts"),
            },
            formats: ["es"],
            // all extracted component CSS lands in dist/style.css — consumers import "@regira/modules/style.css"
            cssFileName: "style",
        },
        rollupOptions: {
            external: ["axios", "date-fns", "pinia", "vue", "vue-router"],
            output: {
                chunkFileNames: `_chunks/[name]-${version}.js`,
            },
        },
    },
})
