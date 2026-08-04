export { useOnlineChecker, type IsOnline } from "./online-checker"
export { default as plugin, default } from "./plugin"

declare module "@vue/runtime-core" {
    interface ComponentCustomProperties {
        $isOnline: import("vue").Ref<boolean>
    }
}
