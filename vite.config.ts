import { defineConfig } from "vite"
import { resolve } from "path"
import vue from "@vitejs/plugin-vue"
import { fileURLToPath } from "url"
import pkg from "./package.json" with { type: "json" }

const root = import.meta.dirname

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
                "index": resolve(root, "src/index.ts"),
                // top-level modules
                "entities/index": resolve(root, "src/entities/index.ts"),
                "events/index": resolve(root, "src/events/index.ts"),
                "extensions/index": resolve(root, "src/extensions/index.ts"),
                "firebase/index": resolve(root, "src/firebase/index.ts"),
                "identity/index": resolve(root, "src/identity/index.ts"),
                "io/index": resolve(root, "src/io/index.ts"),
                "treelist/index": resolve(root, "src/treelist/index.ts"),
                "utilities/index": resolve(root, "src/utilities/index.ts"),
                // individual utility files
                "extensions/date-extensions": resolve(root, "src/extensions/date-extensions.ts"),
                "utilities/array-utility": resolve(root, "src/utilities/array-utility.ts"),
                "utilities/file-utility": resolve(root, "src/utilities/file-utility.ts"),
                "utilities/promise-utility": resolve(root, "src/utilities/promise-utility.ts"),
                "utilities/string-utility": resolve(root, "src/utilities/string-utility.ts"),
                // vue modules
                "vue/index": resolve(root, "src/vue/index.ts"),
                "vue/vue-helper": resolve(root, "src/vue/vue-helper.ts"),
                "vue/app/index": resolve(root, "src/vue/app/index.ts"),
                "vue/auth/index": resolve(root, "src/vue/auth/index.ts"),
                "vue/debug/index": resolve(root, "src/vue/debug/index.ts"),
                "vue/directives/index": resolve(root, "src/vue/directives/index.ts"),
                "vue/entities/index": resolve(root, "src/vue/entities/index.ts"),
                "vue/entities/details/index": resolve(root, "src/vue/entities/details/index.ts"),
                "vue/entities/form/index": resolve(root, "src/vue/entities/form/index.ts"),
                "vue/entities/abstractions/index": resolve(root, "src/vue/entities/abstractions/index.ts"),
                "vue/entities/abstractions/IEntity": resolve(root, "src/vue/entities/abstractions/IEntity.ts"),
                "vue/formatters/index": resolve(root, "src/vue/formatters/index.ts"),
                "vue/http/index": resolve(root, "src/vue/http/index.ts"),
                "vue/http/axios": resolve(root, "src/vue/http/axios.ts"),
                "vue/ioc/index": resolve(root, "src/vue/ioc/index.ts"),
                "vue/lang/index": resolve(root, "src/vue/lang/index.ts"),
                "vue/online/index": resolve(root, "src/vue/online/index.ts"),
                "vue/ui/index": resolve(root, "src/vue/ui/index.ts"),
                "vue/ui/feedback/index": resolve(root, "src/vue/ui/feedback/index.ts"),
                "vue/ui/icons/index": resolve(root, "src/vue/ui/icons/index.ts"),
                "vue/ui/modal/index": resolve(root, "src/vue/ui/modal/index.ts"),
            },
            formats: ["es"],
            // all extracted component CSS lands in dist/style.css — consumers import "@regira/modules/style.css"
            cssFileName: "style",
        },
        rollupOptions: {
            external: ["axios", "date-fns", "pinia", "vue", "vue-router"],
            output: {
                chunkFileNames: `_chunks/[name]-${pkg.version}.js`,
            },
        },
    },
})
