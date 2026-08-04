export * from "./icons"
export { default as Icon } from "./Icon.vue"
export { default as BsIcon } from "./BsIcon.vue"
export { default as FaIcon } from "./FaIcon.vue"
export { default as IconButton } from "./IconButton.vue"
export { default as plugin, default, type IIconProvider } from "./plugin"

declare module "@vue/runtime-core" {
    interface ComponentCustomProperties {
        $icons: import("./plugin").IIconProvider
    }
}
