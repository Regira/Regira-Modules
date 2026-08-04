import { getCurrentInstance } from "vue"

export function useCulture() {
    const app = getCurrentInstance()
    return app?.appContext.config.globalProperties.$culture
}

export default useCulture
