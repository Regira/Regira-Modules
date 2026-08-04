import type { App } from "vue"
import useScreen, { SCREEN_SIZES } from "./screen"

export default {
    install: (app: App<Element>, { sizes }: { sizes?: Record<string, number> } = {}) => {
        if (sizes) {
            for (const key in sizes) {
                if (key in SCREEN_SIZES) {
                    SCREEN_SIZES[key]! = sizes[key]!
                }
            }
        }
        // useScreen owns the (single, debounced) resize/orientationchange subscription — the plugin only
        // exposes the shared instance as $screen / inject("screen")
        const { screen } = useScreen()

        app.config.globalProperties.$screen = screen
        app.provide("screen", screen)
    },
}
