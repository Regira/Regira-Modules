import { ref, type Ref } from "vue"

export type IsOnline = { isOnline: Ref<boolean> }

export function useOnlineChecker(): IsOnline {
    const isOnline = ref(navigator.onLine)

    return { isOnline }
}

export default useOnlineChecker
