import { type App, watch } from "vue"
import { useAuthStore } from "@regira/modules/vue/auth"
import { useLang } from "@regira/modules/vue/lang"
import Permissions from "@/infrastructure/permissions"

// $isAdmin from the auth store + persists the chosen language (auth-only — omitted on --no-auth)
export const plugin = {
    install(app: App) {
        const authStore = useAuthStore()
        Object.defineProperty(app.config.globalProperties, "$isAdmin", {
            get: () => authStore.authData.hasPermission(Permissions.ADMIN),
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
