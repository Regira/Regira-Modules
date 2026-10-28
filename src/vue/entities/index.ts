export * from "../../core/entities/abstractions"
export * from "../../core/entities/config"

// $configs holds the IConfig registered by each entity's setup.ts; the ioc plugin initializes it to {}
declare module "@vue/runtime-core" {
    interface ComponentCustomProperties {
        $configs: Record<string, import("../../core/entities/abstractions/IConfig").IConfig>
    }
}
export * from "./describers"
export * from "./details"
export * from "./filter"
export * from "./form"
export * from "./lean"
export * from "../../core/entities/navigation"
export * from "./overview"
export { usePreloader, plugin as preloaderPlugin } from "./preloading"
export * from "./pooling"
export * from "./tree"
export * from "../../core/entities/utilities"
