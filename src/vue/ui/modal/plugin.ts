import { inject, type App, type InjectionKey } from "vue"
import { globalOptions } from "../../ioc"
import type { ModalComponent } from "./modal"
import FallbackModal from "./DefaultModal.vue"

export const MODAL_COMPONENT_KEY: InjectionKey<ModalComponent> = Symbol("regira.modal")

/** resolves the app-wide modal (the `modalPlugin` swap-in, `DefaultModal` otherwise); call in setup */
export function injectModal(): ModalComponent {
    return inject(MODAL_COMPONENT_KEY, FallbackModal as unknown as ModalComponent)
}

export default {
    install(app: App<Element>, options: { Modal?: ModalComponent } = {}) {
        if ("DefaultModal" in options) {
            console.warn("[regira] modalPlugin option `DefaultModal` was renamed to `Modal` — pass app.use(modalPlugin, { Modal }).")
        }
        const modal = options.Modal ?? (FallbackModal as unknown as ModalComponent)
        // every modal in the app resolves to this component — including the ones inside library components
        app.provide(MODAL_COMPONENT_KEY, modal)
        if (globalOptions.registerComponentsGlobally) {
            app.component("MyModal", modal)
        }
    },
}
