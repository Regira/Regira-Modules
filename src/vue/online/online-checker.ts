import { hasInjectionContext, inject, ref, type Ref } from "vue"

export type IsOnline = { isOnline: Ref<boolean> }

// one ref for the whole app, made on first use so an import has no side effect (server-side rendering included). It
// follows the browser's online and offline events from then on, and stays writable: an app may set it from what its
// requests answer
let shared: Ref<boolean> | undefined
export function sharedIsOnline(): Ref<boolean> {
    if (shared == null) {
        const isOnline = ref(typeof navigator === "undefined" ? true : navigator.onLine)
        if (typeof window !== "undefined") {
            const checkOnline = () => (isOnline.value = navigator.onLine)
            window.addEventListener("offline", checkOnline)
            window.addEventListener("online", checkOnline)
        }
        shared = isOnline
    }
    return shared
}

export function useOnlineChecker(): IsOnline {
    // in setup, what the app provides under "isOnline" (the plugin provides the shared ref); elsewhere the shared ref
    const provided = hasInjectionContext() ? inject<Ref<boolean> | null>("isOnline", null) : null
    return { isOnline: provided ?? sharedIsOnline() }
}

export default useOnlineChecker
