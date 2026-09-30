import { describe, test, expect, beforeEach } from "vitest"
import { createApp, h, nextTick } from "vue"

import ErrorSummary from "../../../src/vue/ui/feedback/ErrorSummary.vue"
import Feedback from "../../../src/vue/ui/feedback/Feedback.vue"
import { useFeedback } from "../../../src/vue/ui/feedback"

// Feedback hands ErrorSummary `undefined` for every failure without a field map — a 404, 409 or 500 — and Vue
// substitutes the prop's `{}` default for it: whether there is an error to show is read from the content.
beforeEach(() => {
    document.body.innerHTML = '<div id="modals"></div>'
})

function render(component, props) {
    const host = document.createElement("div")
    document.body.appendChild(host)
    createApp({ render: () => h(component, props) }).mount(host)
    return host
}
const summaryButtons = (host) => [...host.querySelectorAll(".rg-error-summary button")]

describe("ErrorSummary", () => {
    test.each([
        ["no error", undefined],
        ["an empty map", {}],
        ["an empty string", ""],
    ])("with %s its button is disabled and the popup button hidden", (_, error) => {
        const buttons = summaryButtons(render(ErrorSummary, { msg: "Deleting failed", error, enablePopup: true }))

        expect(buttons).toHaveLength(1)
        expect(buttons[0].disabled).toBe(true)
    })

    test("with a field map its buttons open the summary", async () => {
        const host = render(ErrorSummary, { msg: "Saving failed", error: { title: ["Required"] }, enablePopup: true })
        const buttons = summaryButtons(host)

        expect(buttons).toHaveLength(2)
        expect(buttons.every((b) => !b.disabled)).toBe(true)
        buttons[0].click()
        await nextTick()
        expect(document.querySelector("#modals .rg-modal__body").textContent).toContain("Required")
    })

    test("a Feedback that failed without a field map disables it", async () => {
        const feedback = useFeedback({ autoHideDelay: 0 })
        const host = render(Feedback, { feedback, enableErrorPopup: true })

        feedback.fail("Deleting failed", "A database constraint rejected the change.")
        await nextTick()

        const buttons = summaryButtons(host)
        expect(buttons).toHaveLength(1)
        expect(buttons[0].disabled).toBe(true)
    })
})
