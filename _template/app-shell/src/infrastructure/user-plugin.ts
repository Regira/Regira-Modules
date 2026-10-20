import type { App } from "vue"
import { useAuthStore } from "@regira/modules/vue/auth"
import { Roles } from "@/infrastructure/permissions"

// $isAdmin from the auth store (auth-only — omitted on --no-auth)
export const plugin = {
    install(app: App) {
        const authStore = useAuthStore()
        Object.defineProperty(app.config.globalProperties, "$isAdmin", {
            // Role-based API (Identity + AddRoles) — the default. On a backend that mints a "permissions"
            // claim instead, import { Permissions } above and use authStore.hasPermission(Permissions.ADMIN).
            get: () => authStore.hasRole(Roles.ADMIN),
            enumerable: true,
            configurable: true,
        })
    },
}

export default plugin
