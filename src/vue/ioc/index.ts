export { default, ServiceProvider, get, type IServiceProvider } from "./ServiceProvider"
export { plugin } from "./plugin"
export { globalOptions, configureGlobals, type GlobalOptions } from "./globals"

declare module "@vue/runtime-core" {
    interface ComponentCustomProperties {
        $services: import("./ServiceProvider").IServiceProvider
    }
}
