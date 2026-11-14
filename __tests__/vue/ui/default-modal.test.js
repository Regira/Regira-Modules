import { describe, test, expect, beforeEach, afterEach, vi } from "vitest"
import { createApp, defineComponent, h, nextTick, onMounted, ref } from "vue"

import DefaultModal from "../../../src/vue/ui/modal/DefaultModal.vue"

// Esc is heard on the modal's mask, so it only worked once focus was inside the modal: a keyboard user had to click
// into a freshly opened dialog first. The modal takes focus when it opens, without stealing it from its content.
let apps = []
beforeEach(() => {
    document.body.innerHTML = ""
})
afterEach(() => {
    apps.forEach((app) => app.unmount())
    apps = []
})

function mount(render) {
    const host = document.createElement("div")
    document.body.appendChild(host)
    const app = createApp({ render })
    app.mount(host)
    apps.push(app)
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
        const { host } = mount(() => [
            h("button", { class: "trigger" }, "open"),
            shown.value ? h(DefaultModal, { isVisible: true, title: "t" }) : null,
        ])
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

describe("DefaultModal as a dialog", () => {
    afterEach(() => {
        document.body.removeAttribute("style")
    })
    // the key goes to the focused element and bubbles, as a browser sends it
    const tab = (shiftKey = false) =>
        document.activeElement.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", shiftKey, bubbles: true, cancelable: true }))

    test("is a modal dialog named by its title", async () => {
        const { host } = mount(() => h(DefaultModal, { isVisible: true, title: "Edit row" }))
        await nextTick()

        const dialog = host.querySelector(".rg-modal .modal")
        expect(dialog.getAttribute("role")).toBe("dialog")
        expect(dialog.getAttribute("aria-modal")).toBe("true")
        expect(document.getElementById(dialog.getAttribute("aria-labelledby")).textContent.trim()).toBe("Edit row")
    })

    test("gives a title slot the id that names the dialog, and a modal without a header its title as a label", async () => {
        const { host } = mount(() => [
            h(DefaultModal, { isVisible: true, title: "t" }, { title: ({ titleId }) => h("h2", { id: titleId, class: "own" }, "Own title") }),
            h(DefaultModal, { isVisible: true, title: "No header", showHeader: false }),
        ])
        await nextTick()

        const [withSlot, headerless] = host.querySelectorAll(".rg-modal .modal")
        expect(document.getElementById(withSlot.getAttribute("aria-labelledby")).textContent).toBe("Own title")
        expect(headerless.getAttribute("aria-labelledby")).toBeNull()
        expect(headerless.getAttribute("aria-label")).toBe("No header")
    })

    test("keeps Tab and Shift+Tab inside the dialog", async () => {
        const { host } = mount(() => [
            h("button", { class: "outside" }, "page"),
            h(
                DefaultModal,
                { isVisible: true, title: "t", showFooter: false },
                { default: () => [h("input", { class: "first-input" }), h("button", { class: "last" }, "ok")] }
            ),
        ])
        await nextTick()
        await nextTick()
        const dialog = host.querySelector(".rg-modal .modal")
        const close = dialog.querySelector(".rg-modal__header button")
        const last = dialog.querySelector("button.last")
        expect(document.activeElement).toBe(dialog)

        tab(true) // from the dialog itself, back to its last element
        expect(document.activeElement).toBe(last)
        tab() // past the last, round to the first
        expect(document.activeElement).toBe(close)
        tab(true) // before the first, round to the last
        expect(document.activeElement).toBe(last)
    })

    test("holds the page's scroll while any modal is open, nested ones releasing it once", async () => {
        document.body.style.overflow = "auto"
        const outer = ref(false)
        const inner = ref(false)
        mount(() => [h(DefaultModal, { isVisible: outer.value, title: "outer" }), h(DefaultModal, { isVisible: inner.value, title: "inner" })])

        outer.value = true
        await nextTick()
        expect(document.body.style.overflow).toBe("hidden")
        inner.value = true
        await nextTick()
        inner.value = false
        await nextTick()
        expect(document.body.style.overflow).toBe("hidden")
        outer.value = false
        await nextTick()
        expect(document.body.style.overflow).toBe("auto")
    })

    test("a modal unmounted while open releases the scroll too", async () => {
        const shown = ref(true)
        mount(() => (shown.value ? h(DefaultModal, { isVisible: true, title: "t" }) : null))
        await nextTick()
        expect(document.body.style.overflow).toBe("hidden")

        shown.value = false
        await nextTick()
        expect(document.body.style.overflow).toBe("")
    })
})
