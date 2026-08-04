import { onMounted, watch, getCurrentInstance } from "vue"
import useAppStore from "./store"

export function onAppReady(func: Function) {
    const appStore = useAppStore()
    const cmp = getCurrentInstance()
    if (appStore.isReady) {
        func()
    } else {
        watch(
            () => appStore.isReady,
            () => func(),
            { once: true }
        )
        if (cmp) {
            onMounted(() => {
                if (appStore.isReady) {
                    func()
                }
            })
        }
    }
}
export function whenAppReady(): Promise<void> {
    const appStore = useAppStore()
    return new Promise<void>((resolve) => {
        let isExecuted = false
        return appStore.isReady
            ? resolve()
            : onAppReady(() => {
                  if (!isExecuted) {
                      resolve()
                      isExecuted = true
                  }
              })
    })
}
