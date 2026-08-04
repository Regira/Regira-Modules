export * from "./plugin"
export * from "./culture"
export * from "./store"
export * from "./functions"

declare module "@vue/runtime-core" {
    interface ComponentCustomProperties {
        $culture: string
        $setCulture: (value: string) => void
        $isReady: boolean
        $appStatus: import("./store").AppStatus
        $setAppStatus: (value: import("./store").AppStatus) => void
    }
}
