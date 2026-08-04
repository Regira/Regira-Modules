import { type App } from "vue"
import useAppStore, { AppStatus } from "./store"

export const plugin = {
    install(app: App, { culture }: { culture?: string } = {}) {
        const store = useAppStore()
        store.setCulture(culture)

        // culture
        Object.defineProperty(app.config.globalProperties, "$culture", {
            get() {
                return store.culture
            },
            enumerable: true,
            configurable: true,
        })
        app.config.globalProperties.$setCulture = (value: string) => store.setCulture(value)
        // ready
        Object.defineProperty(app.config.globalProperties, "$isReady", {
            get() {
                return store.isReady
            },
            enumerable: true,
            configurable: true,
        })
        // status
        Object.defineProperty(app.config.globalProperties, "$appStatus", {
            get() {
                return store.status
            },
            enumerable: true,
            configurable: true,
        })
        app.config.globalProperties.$setAppStatus = (value: AppStatus) => store.setStatus(value)
    },
}

export default plugin
