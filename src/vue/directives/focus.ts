import type { App } from "vue"

export const focus = {
    mounted: (el: HTMLElement) => {
        setTimeout(() => el.focus(), 250)
    },
}

export default {
    install(app: App<Element>) {
        app.directive("focus", focus)
    },
}
