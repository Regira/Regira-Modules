import { describe, test, expect, beforeEach } from "vitest"
import { createApp, h, nextTick } from "vue"

import ConfirmButton from "../../../src/vue/ui/buttons/ConfirmButton.vue"
import FormButtonsRow from "../../../src/vue/ui/input/FormButtonsRow.vue"

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
