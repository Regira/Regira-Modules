import { describe, test, expect } from "vitest"
import { createApp, h } from "vue"

import FormButtonsRow from "../../../src/vue/ui/input/FormButtonsRow.vue"

// `readonly` is the write gate the permission-gating pattern threads through a slice: Save hidden, Delete and
// Restore disabled, Cancel always rendered as the way out of a locked form.
function mount(props = {}) {
    const host = document.createElement("div")
    document.body.appendChild(host)
    const emitted = []
    createApp({
        render: () =>
            h(FormButtonsRow, {
                ...props,
                onCancel: () => emitted.push("cancel"),
                onRestore: () => emitted.push("restore"),
            }),
    }).mount(host)
    return {
        emitted,
        button: (cls) => host.querySelector(`button.${cls}`),
    }
}

describe("FormButtonsRow", () => {
    test("readonly disables Restore on an archived item", () => {
        const { button, emitted } = mount({ item: { isArchived: true }, readonly: true })

        expect(button("btn-warning").disabled).toBe(true)
        button("btn-warning").click()
        expect(emitted).toEqual([])
    })

    test("Restore is live on an archived item when the form is writable", () => {
        const { button, emitted } = mount({ item: { isArchived: 1 }, readonly: false })

        expect(button("btn-warning").disabled).toBe(false)
        button("btn-warning").click()
        expect(emitted).toEqual(["restore"])
    })

    test("readonly hides Save and disables Delete, but keeps Cancel", () => {
        const { button, emitted } = mount({ item: { isArchived: false }, readonly: true, showDelete: true })

        expect(button("btn-primary")).toBeNull()
        expect(button("btn-danger").disabled).toBe(true)
        expect(button("btn-secondary").disabled).toBe(false)
        button("btn-secondary").click()
        expect(emitted).toEqual(["cancel"])
    })
})
