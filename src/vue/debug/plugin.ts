import { ref, type App } from "vue"
import { globalOptions } from "../ioc"
import type { DebugComponent } from "./debug"
import Display from "./Display.vue"

type IOptions = {
    isDebug: boolean
    /** the component registered app-wide as `Debug` when registerComponentsGlobally is on (compile-checked) */
    Debug?: DebugComponent
}

export default {
    install(app: App<Element>, options?: IOptions) {
        const isDebug = ref<boolean>(!!options?.isDebug)
        const enableDebug = ref(true)

        if (globalOptions.registerComponentsGlobally) {
            app.component("Debug", options?.Debug ?? (Display as unknown as DebugComponent))
        }

        Object.defineProperty(app.config.globalProperties, "$isDebug", {
            get() {
                const router = app.config.globalProperties.$router
                const queryDebug = router.currentRoute.value.query?.debug
                return enableDebug.value && (typeof queryDebug !== "undefined" ? queryDebug === "1" : isDebug.value)
            },
            enumerable: true,
            configurable: true,
        })
        app.config.globalProperties.$setDebug = (value = true) => (enableDebug.value = value)
    },
}
