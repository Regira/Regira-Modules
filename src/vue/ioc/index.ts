export { default, ServiceProvider, get, type IServiceProvider } from "../../core/ioc/ServiceProvider"
export { plugin } from "./plugin"
export { globalOptions, configureGlobals, type GlobalOptions } from "./globals"

declare module "@vue/runtime-core" {
    interface ComponentCustomProperties {
        $services: import("../../core/ioc/ServiceProvider").IServiceProvider
    }
}
