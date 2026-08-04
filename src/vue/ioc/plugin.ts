import type { App } from "vue"
import defaultServiceProvider, { type IServiceProvider } from "./ServiceProvider"

export const plugin = {
    install(app: App<Element>, { configure }: { configure?(services: IServiceProvider): IServiceProvider } = {}) {
        app.config.globalProperties.$services = defaultServiceProvider
        // container for entity IConfig registrations — each entity setup.ts writes $configs[Entity.name]
        app.config.globalProperties.$configs ??= {}
        app.provide("services", defaultServiceProvider)
        if (configure) {
            configure(defaultServiceProvider)
        }
    },
}

export default plugin
