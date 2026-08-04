import type { App } from "vue"
import { useOnlineChecker } from "./online-checker"

export default {
    install(app: App<Element>) {
        const { isOnline } = useOnlineChecker()

        const checkOnline = () => (isOnline.value = navigator.onLine)
        window.addEventListener("offline", checkOnline)
        window.addEventListener("online", checkOnline)

        app.config.globalProperties.$isOnline = isOnline
        app.provide("isOnline", isOnline)
    },
}
