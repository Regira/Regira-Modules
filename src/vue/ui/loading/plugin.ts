import type { App } from "vue"
import { globalOptions } from "../../ioc"
import { LOADING_COMPONENT_KEY, type LoadingButtonComponent, type LoadingComponent, type LoadingContainerComponent } from "./loading"
import Loading from "./Loading.vue"
import LoadingButton from "./LoadingButton.vue"
import LoadingContainer from "./LoadingContainer.vue"

export type LoadingInput = {
    /** custom loading image; when omitted the built-in spinner is used */
    img?: string
    /** swaps the loading indicator app-wide — including inside LoadingContainer/LoadingButton (compile-checked) */
    Loading?: LoadingComponent
    LoadingButton?: LoadingButtonComponent
    LoadingContainer?: LoadingContainerComponent
}

export default {
    install(app: App<Element>, options: LoadingInput = {}) {
        app.provide("loadingImg", options.img)

        // every library-internal loading indicator resolves to this component
        const loading = options.Loading ?? (Loading as unknown as LoadingComponent)
        app.provide(LOADING_COMPONENT_KEY, loading)

        if (globalOptions.registerComponentsGlobally) {
            app.component("Loading", loading)
            app.component("LoadingButton", options.LoadingButton ?? (LoadingButton as unknown as LoadingButtonComponent))
            app.component("LoadingContainer", options.LoadingContainer ?? (LoadingContainer as unknown as LoadingContainerComponent))
        }
    },
}
