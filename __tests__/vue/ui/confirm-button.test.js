import { describe, test, expect, beforeEach } from "vitest"
import { createApp, h, nextTick } from "vue"

import ConfirmButton from "../../../src/vue/ui/buttons/ConfirmButton.vue"
import FormButtonsRow from "../../../src/vue/ui/input/FormButtonsRow.vue"
import EjectedConfirmButton from "./fixtures/EjectedConfirmButton.vue"

// The confirm dialog's footer buttons were hard-coded English ("Cancel" / "Submit"), so a translated app still
// asked every delete question in English. The labels travel ConfirmButton → modal like its title does.
beforeEach(() => {
    document.body.innerHTML = '<div id="modals"></div>'
})

async function open(component, props) {
    const host = document.createElement("div")
    document.body.appendChild(host)
    createApp({ render: () => h(component, props) }).mount(host)
    host.querySelector("button.rg-confirm-button").click()
    await nextTick()
    return [...document.querySelectorAll("#modals .modal-footer button")].map((b) => b.textContent.trim())
}

describe("ConfirmButton", () => {
    test("modalLabels label the dialog's footer buttons", async () => {
        const labels = await open(ConfirmButton, { modalLabels: { cancel: "Annuleren", submit: "Verwijderen" } })

        expect(labels).toEqual(["Annuleren", "Verwijderen"])
    })

    test("without modalLabels the footer keeps its English defaults", async () => {
        expect(await open(ConfirmButton, {})).toEqual(["Cancel", "Submit"])
    })

    test("FormButtonsRow's delete dialog answers with its own Cancel / Delete labels", async () => {
        expect(await open(FormButtonsRow, { showDelete: true, item: {} })).toEqual(["Cancel", "Delete"])
        document.body.innerHTML = '<div id="modals"></div>'
        expect(await open(FormButtonsRow, { showDelete: true, item: {}, labels: { cancel: "Annuleren", delete: "Wissen" } })).toEqual([
            "Annuleren",
            "Wissen",
        ])
    })
})

describe("ConfirmButton disabled", () => {
    async function buttonOf(component, props) {
        const host = document.createElement("div")
        document.body.appendChild(host)
        createApp({ render: () => h(component, props) }).mount(host)
        await nextTick()
        return host.querySelector("button.rg-confirm-button")
    }

    test("disables the button", async () => {
        expect((await buttonOf(ConfirmButton, { disabled: true })).disabled).toBe(true)
    })

    // `disabled` falls through to the root button, so a copy ejected before the contract types listed props
    // keeps working: declaring it would swallow the attribute in every copy that does not bind it
    test("an ejected 6.5.0 copy keeps a disabled button disabled", async () => {
        expect((await buttonOf(EjectedConfirmButton, { disabled: true })).disabled).toBe(true)
    })
})

describe("ConfirmButton focus", () => {
    test("Esc in its dialog gives focus back to the button", async () => {
        const host = document.createElement("div")
        document.body.appendChild(host)
        createApp({ render: () => h(ConfirmButton, { "aria-label": "delete" }) }).mount(host)
        const button = host.querySelector("button.rg-confirm-button")
        button.focus()
        button.click()
        await nextTick()
        await nextTick()
        const dialog = document.querySelector("#modals .rg-modal .modal")
        expect(document.activeElement).toBe(dialog)

        dialog.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }))
        await nextTick()
        await nextTick()

        expect(document.activeElement).toBe(button)
    })
})
