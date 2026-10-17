import { hasInjectionContext, inject, ref, type Ref } from "vue"

export type IsOnline = { isOnline: Ref<boolean> }

export function useOnlineChecker(): IsOnline {
    // the plugin's live ref inside setup; elsewhere, or without the plugin, a ref seeded once from navigator.onLine
    const provided = hasInjectionContext() ? inject<Ref<boolean> | null>("isOnline", null) : null
    const isOnline = provided ?? ref(navigator.onLine)

    return { isOnline }
}

export default useOnlineChecker
