import { describe, test, expect } from "vitest"
import { createApp, h } from "vue"

import FormButtonsRow from "../../../src/vue/ui/input/FormButtonsRow.vue"

// `readonly` is the write gate the permission-gating pattern threads through a slice: it renders no buttons.
// Save, Delete and Restore cannot act, and Cancel only discards edits a readonly form cannot have — the way back
// is the page's navigation or the modal's own close button.
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
        host,
        emitted,
        button: (cls) => host.querySelector(`button.${cls}`),
    }
}

describe("FormButtonsRow", () => {
    test("readonly renders no Restore on an archived item", () => {
        const { button } = mount({ item: { isArchived: true }, readonly: true })

        expect(button("btn-warning")).toBeNull()
    })

    test("Restore is live on an archived item when the form is writable", () => {
        const { button, emitted } = mount({ item: { isArchived: 1 }, readonly: false })

        expect(button("btn-warning").disabled).toBe(false)
        button("btn-warning").click()
        expect(emitted).toEqual(["restore"])
    })

    test("readonly renders no buttons at all — no Save, no Delete, no Cancel", () => {
        const { host } = mount({ item: { isArchived: false }, readonly: true, showDelete: true })

        expect(host.querySelectorAll("button")).toHaveLength(0)
    })

    test("a writable form renders Save, Cancel and Delete, and Cancel emits", () => {
        const { button, emitted } = mount({ item: { isArchived: false }, readonly: false, showDelete: true })

        expect(button("btn-primary")).not.toBeNull()
        expect(button("btn-danger").disabled).toBe(false)
        button("btn-secondary").click()
        expect(emitted).toEqual(["cancel"])
    })
})
