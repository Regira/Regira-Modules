import { describe, test, expect, beforeEach, vi } from "vitest"
import { createApp, defineComponent, h, nextTick, onMounted, ref } from "vue"

import DefaultModal from "../../../src/vue/ui/modal/DefaultModal.vue"

// Esc is heard on the modal's mask, so it only worked once focus was inside the modal: a keyboard user had to click
// into a freshly opened dialog first. The modal takes focus when it opens, without stealing it from its content.
beforeEach(() => {
    document.body.innerHTML = ""
})

function mount(render) {
    const host = document.createElement("div")
    document.body.appendChild(host)
    const app = createApp({ render })
    app.mount(host)
    return { host, app }
}

describe("DefaultModal focus", () => {
    test("a modal mounted open takes focus, and Esc then closes it", async () => {
        const onClose = vi.fn()
        const { host } = mount(() => h(DefaultModal, { isVisible: true, title: "t", onClose }, { default: () => h("p", "body") }))
        await nextTick()

        const dialog = host.querySelector(".rg-modal .modal")
        expect(document.activeElement).toBe(dialog)
        dialog.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }))
        expect(onClose).toHaveBeenCalledTimes(1)
    })

    test("a modal that opens later takes focus when it opens", async () => {
        const isVisible = ref(false)
        const { host } = mount(() => h(DefaultModal, { isVisible: isVisible.value, title: "t" }))
        await nextTick()
        expect(host.querySelector(".rg-modal")).toBeNull()

        isVisible.value = true
        await nextTick()
        await nextTick()

        expect(document.activeElement).toBe(host.querySelector(".rg-modal .modal"))
    })

    test("an element inside the modal that took focus itself keeps it", async () => {
        const FocusedInput = defineComponent({
            setup() {
                const input = ref()
                onMounted(() => input.value.focus())
                return () => h("input", { ref: input, class: "own-focus" })
            },
        })
        const { host } = mount(() => h(DefaultModal, { isVisible: true, title: "t" }, { default: () => h(FocusedInput) }))
        await nextTick()
        await nextTick()

        expect(document.activeElement).toBe(host.querySelector("input.own-focus"))
    })

    // a keyboard user keeps their place, and an outer modal whose trigger opened this one hears Esc again
    test("a modal gives focus back to the element that had it when it closes", async () => {
        const isVisible = ref(false)
        const { host } = mount(() => [h("button", { class: "trigger" }, "open"), h(DefaultModal, { isVisible: isVisible.value, title: "t" })])
        const trigger = host.querySelector("button.trigger")
        trigger.focus()

        isVisible.value = true
        await nextTick()
        await nextTick()
        expect(document.activeElement).toBe(host.querySelector(".rg-modal .modal"))

        isVisible.value = false
        await nextTick()
        await nextTick()
        expect(document.activeElement).toBe(trigger)
    })

    test("a modal unmounted while open gives focus back too", async () => {
        const shown = ref(true)
        const { host } = mount(() => [h("button", { class: "trigger" }, "open"), shown.value ? h(DefaultModal, { isVisible: true, title: "t" }) : null])
        const trigger = host.querySelector("button.trigger")
        // the modal mounted open took focus from the body: focus the trigger and reopen it, as a click on it would
        shown.value = false
        await nextTick()
        trigger.focus()
        shown.value = true
        await nextTick()
        await nextTick()
        expect(document.activeElement).toBe(host.querySelector(".rg-modal .modal"))

        shown.value = false
        await nextTick()
        expect(document.activeElement).toBe(trigger)
    })
})

describe("DefaultModal footer-submit-button slot", () => {
    test("passes handleSubmit, and the deprecated handleClose is the same function", async () => {
        const onSubmit = vi.fn()
        let slotProps
        mount(() =>
            h(
                DefaultModal,
                { isVisible: true, title: "t", onSubmit },
                {
                    "footer-submit-button": (props) => {
                        slotProps = props
                        return h("button", { class: "my-submit", onClick: props.handleSubmit }, "Save")
                    },
                }
            )
        )
        await nextTick()

        expect(typeof slotProps.handleSubmit).toBe("function")
        expect(slotProps.handleClose).toBe(slotProps.handleSubmit)
        document.querySelector("button.my-submit").click()
        expect(onSubmit).toHaveBeenCalledTimes(1)
    })
})
