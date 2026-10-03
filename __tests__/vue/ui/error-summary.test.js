import { describe, test, expect, beforeEach } from "vitest"
import { createApp, h, nextTick } from "vue"

import ErrorSummary from "../../../src/vue/ui/feedback/ErrorSummary.vue"
import Feedback from "../../../src/vue/ui/feedback/Feedback.vue"
import { useFeedback, setErrorTranslator, fieldLabel } from "../../../src/vue/ui/feedback"

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
        ["a map whose fields hold no message", { title: [], code: "" }],
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

describe("ErrorSummary field headings", () => {
    test("head each field with its label, not its key, and the errors of no one field without a heading", () => {
        const host = render(ErrorSummary, { msg: "Saving failed", error: { dueDate: ["Required"], categoryId: ["Unknown"], "": ["The order is closed"] } })
        const headings = [...host.querySelectorAll(".rg-error-summary b")].map((b) => b.textContent)

        expect(headings).toEqual(["Due date", "Category"])
        expect(host.textContent).toContain("The order is closed")
    })

    test("a field's translation heads its errors", () => {
        setErrorTranslator((key) => (key === "dueDate" ? "Deadline" : undefined))
        try {
            const host = render(ErrorSummary, { msg: "Saving failed", error: { dueDate: ["Required"] } })
            expect(host.querySelector(".rg-error-summary b").textContent).toBe("Deadline")
        } finally {
            setErrorTranslator(undefined)
        }
    })

    test.each([
        ["title", "Title"],
        ["unitPrice", "Unit price"],
        ["categoryId", "Category"],
        ["id", "Id"],
        ["pdfURLText", "Pdf url text"],
        ["lines[0].unitPrice", "lines[0].unitPrice"],
        ["", ""],
    ])("fieldLabel(%j) reads %j without a translation", (key, label) => {
        expect(fieldLabel(key)).toBe(label)
    })

    test("hideFieldErrors leaves the named fields to the form's inputs and keeps the errors of no one field", async () => {
        const feedback = useFeedback({ autoHideDelay: 0 })
        const host = render(Feedback, { feedback, hideFieldErrors: true })

        feedback.fail("Saving failed", { title: ["Required"], "": ["The order is closed"] })
        await nextTick()

        expect(host.textContent).not.toContain("Required")
        expect(host.textContent).toContain("The order is closed")
    })

    test("hideFieldErrors with only named fields shows the message alone", async () => {
        const feedback = useFeedback({ autoHideDelay: 0 })
        const host = render(Feedback, { feedback, hideFieldErrors: true, enableErrorPopup: true })

        feedback.fail("Saving failed", { title: ["Required"] })
        await nextTick()

        expect(host.textContent).toContain("Saving failed")
        expect(host.textContent).not.toContain("Required")
        const buttons = summaryButtons(host)
        expect(buttons).toHaveLength(1)
        expect(buttons[0].disabled).toBe(true)
    })
})
