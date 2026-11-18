import type { App } from "vue"
import { sharedIsOnline } from "./online-checker"

export default {
    install(app: App<Element>) {
        // the shared ref every useOnlineChecker() returns, in setup or outside it
        const isOnline = sharedIsOnline()

        app.config.globalProperties.$isOnline = isOnline
        app.provide("isOnline", isOnline)
    },
}
