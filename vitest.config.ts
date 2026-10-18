import { defineConfig } from "vitest/config";
import vue from "@vitejs/plugin-vue";
import { fileURLToPath } from "url";

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    // the fs cache keys a .vue compile on the SFC's own source, so a change to an imported props type
    // (defineProps<T>() from a .ts file) keeps serving the old runtime props; the suite is no slower without it
    fsModuleCache: false,
  },
});
