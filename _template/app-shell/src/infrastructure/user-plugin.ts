import { type App, watch } from "vue"
import { useAuthStore } from "@regira/modules/vue/auth"
import { useLang } from "@regira/modules/vue/lang"
import { Roles } from "@/infrastructure/permissions"

// $isAdmin from the auth store + persists the chosen language (auth-only — omitted on --no-auth)
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

        const { langCode, setLangCode } = useLang()
        const last = localStorage.getItem("lang")
        if (!authStore.isAuthenticated && last && last !== langCode.value) setLangCode(last.substring(0, 2))
        watch(langCode, (code) => localStorage.setItem("lang", code))
    },
}

export default plugin
