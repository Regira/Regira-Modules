import type { App } from "vue"

type Options = { maxGrow: number }
const DEFAULT_OPTIONS: Options = {
    maxGrow: 7,
}
let growOptions: Options

function convertRemToPixels(rem: number) {
    return rem * parseFloat(getComputedStyle(document.documentElement).fontSize)
}
function callback(e: Event) {
    const el = e.target as HTMLTextAreaElement
    const value = el.value
    const lines = value?.split("\n").length || 0
    if (lines > 1 && lines <= growOptions.maxGrow) {
        const newHeight = lines * 1.75
        if (convertRemToPixels(newHeight) > el.offsetHeight) {
            el.style.minHeight = newHeight + "rem"
        }
    } else if (value == "") {
        el.style.minHeight = ""
    }
}

export const grow = {
    beforeMount(el: HTMLTextAreaElement) {
        el.addEventListener("input", callback)
    },
    unmounted: (el: HTMLTextAreaElement) => {
        el.removeEventListener("input", callback)
    },
}

export default {
    install(app: App<Element>, options: Options = DEFAULT_OPTIONS) {
        growOptions = options
        app.directive("grow", grow)
    },
}
