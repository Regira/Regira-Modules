import { describe, test, expect } from "vitest"
import { createApp, defineComponent, h } from "vue"
import feedbackPlugin, { useAppFeedback } from "../../../src/vue/ui/feedback/plugin"

describe("useAppFeedback", () => {
    test("resolves the plugin's panel during setup", () => {
        let feedback
        const app = createApp(defineComponent({ setup: () => ((feedback = useAppFeedback()), () => h("div")) }))
        app.use(feedbackPlugin)
        app.mount(document.createElement("div"))

        expect(feedback).toBe(app.config.globalProperties.$feedback)
        app.unmount()
    })

    // a click handler runs outside setup: inject() finds nothing there, which must not read as a missing plugin
    test("outside setup it says so, not that the plugin is missing", () => {
        expect(() => useAppFeedback()).toThrow(/during setup/)
    })

    test("without the plugin it names the plugin", () => {
        let error
        const app = createApp(
            defineComponent({
                setup: () => {
                    try {
                        useAppFeedback()
                    } catch (e) {
                        error = e
                    }
                    return () => h("div")
                },
            })
        )
        app.mount(document.createElement("div"))

        expect(error?.message).toMatch(/requires the feedback plugin/)
        app.unmount()
    })
})
