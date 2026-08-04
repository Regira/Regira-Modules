import { ref, computed } from "vue"
import { defineStore } from "pinia"

export enum AppStatus {
    Init = "Init",
    Loading = "Loading",
    Mounting = "Mounting",
    Ready = "Ready",
}

export const useAppStore = defineStore("AppStore", () => {
    const status = ref<AppStatus>(AppStatus.Init)
    const culture = ref(navigator.language)
    const logo = ref<string>()

    return {
        culture,
        logo,
        status,
        isReady: computed(() => status.value == AppStatus.Ready),
        setCulture(value?: string) {
            culture.value = value || navigator.language
        },
        setStatus(value: AppStatus) {
            status.value = value
        },
        setLogo(value: string) {
            logo.value = value
        },
    }
})

export default useAppStore
