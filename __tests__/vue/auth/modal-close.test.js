import { describe, test, expect, beforeEach, vi } from "vitest"
import { createApp, defineComponent, h, nextTick } from "vue"

import LoginModal from "../../../src/vue/auth/LoginModal.vue"
import ForgotPasswordModal from "../../../src/vue/auth/ForgotPasswordModal.vue"
import { MODAL_COMPONENT_KEY } from "../../../src/vue/ui/modal"

// The shell listens for `@close` on both auth modals: the header X of the injected modal. The modals declare and
// forward it, so it shows in their emits and keeps working in an ejected copy or under a swapped-in modal.
beforeEach(() => {
    document.body.innerHTML = ""
})

// stands for the app's modal: one root that emits close from its header X
const StubModal = defineComponent({
    emits: ["close"],
    setup(_, { emit, slots }) {
        return () => h("div", [h("button", { class: "header-x", onClick: () => emit("close") }), slots.default?.()])
    },
})

async function clickClose(component) {
    const onClose = vi.fn()
    const host = document.createElement("div")
    document.body.appendChild(host)
    const app = createApp({ render: () => h(component, { onClose }, { default: () => h("p", "slotted form") }) })
    app.provide(MODAL_COMPONENT_KEY, StubModal)
    app.mount(host)
    await nextTick()
    host.querySelector("button.header-x").click()
    await nextTick()
    app.unmount()
    return onClose
}

describe("auth modals emit close", () => {
    test.each([
        ["LoginModal", LoginModal],
        ["ForgotPasswordModal", ForgotPasswordModal],
    ])("%s declares close", (_, component) => {
        expect(component.emits).toContain("close")
    })

    test.each([
        ["LoginModal", LoginModal],
        ["ForgotPasswordModal", ForgotPasswordModal],
    ])("%s passes the modal's close to the parent once", async (_, component) => {
        const onClose = await clickClose(component)

        expect(onClose).toHaveBeenCalledTimes(1)
    })
})

// While sign-in is required the shell's LoginModal has nowhere to close to, so it shows no X there. LoginModal fills
// the modal contract's header-close-button slot, which works under DefaultModal and any modal honouring the contract.
describe("LoginModal showClose", () => {
    async function headerButtons(props) {
        const host = document.createElement("div")
        document.body.appendChild(host)
        // no MODAL_COMPONENT_KEY provided: injectModal() falls back to DefaultModal
        const app = createApp({ render: () => h(LoginModal, props, { default: () => h("p", "slotted form") }) })
        app.mount(host)
        await nextTick()
        const buttons = host.querySelectorAll(".rg-modal__header button").length
        const title = host.querySelector(".rg-modal__header .modal-title")?.textContent.trim()
        app.unmount()
        return { buttons, title }
    }

    test("shows the header X by default", async () => {
        expect(await headerButtons({ title: "Sign in" })).toEqual({ buttons: 1, title: "Sign in" })
    })

    test("showClose false drops the X and keeps the title", async () => {
        expect(await headerButtons({ title: "Sign in", showClose: false })).toEqual({ buttons: 0, title: "Sign in" })
    })
})
