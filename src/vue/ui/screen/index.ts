export { SCREEN_SIZES, useScreen, type IScreen, type IScreenSize } from "./screen"
export { default as plugin, default } from "./plugin"

declare module "@vue/runtime-core" {
    interface ComponentCustomProperties {
        $screen: import("./screen").IScreen
    }
}
