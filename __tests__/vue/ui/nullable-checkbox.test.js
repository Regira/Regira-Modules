import { describe, test, expect } from "vitest"
import { createApp, defineComponent, h, nextTick, ref } from "vue"

import NullableCheckBox from "../../../src/vue/ui/input/NullableCheckBox.vue"

function mount(props = {}) {
    const host = document.createElement("div")
    document.body.appendChild(host)
    const model = ref(props.modelValue)
    const app = createApp(
        defineComponent({
            setup: () => () =>
                h(NullableCheckBox, {
                    ...props,
                    modelValue: model.value,
                    "onUpdate:modelValue": (v) => (model.value = v),
                }),
        })
    )
    app.mount(host)
    return {
        host,
        model,
        input: () => host.querySelector("input"),
        label: () => host.querySelector("label"),
    }
}

describe("NullableCheckBox", () => {
    test("without a label it renders the bare input, and fallthrough attrs land on it", () => {
        // The single-root shape is what every existing call site styles against (form-check layouts pass
        // their own <label for>), so `inheritAttrs: false` must not move id/class off the input.
        const { host, input } = mount({ id: "isActive", class: "form-check-input" })

        expect(host.children).toHaveLength(1)
        expect(input().getAttribute("id")).toBe("isActive")
        expect(input().classList.contains("form-check-input")).toBe(true)
        expect(input().classList.contains("rg-nullable-checkbox")).toBe(true)
        expect(host.querySelector("label")).toBeNull()
    })

    test("a label is rendered and associated with the input by id", () => {
        const { input, label } = mount({ id: "isOpen", label: "Open only" })

        expect(label().textContent).toBe("Open only")
        expect(label().getAttribute("for")).toBe("isOpen")
        expect(input().getAttribute("id")).toBe("isOpen")
    })

    test("clicking cycles true -> false -> undefined", async () => {
        const { model, input } = mount()

        input().click()
        await nextTick()
        expect(model.value).toBe(true)

        input().click()
        await nextTick()
        expect(model.value).toBe(false)

        input().click()
        await nextTick()
        expect(model.value).toBeUndefined()
    })

    test("a disabled control ignores the label click too", async () => {
        // `disabled` is a fallthrough attr, so the input refuses clicks by itself — the label is the only path
        // that would otherwise still mutate the value.
        const { model, label, input } = mount({ id: "isOpen", label: "Open only", disabled: true })

        label().click()
        input().click()
        await nextTick()
        expect(model.value).toBeUndefined()
    })

    test("clicking the label advances the value exactly once, with or without an id", async () => {
        // The component handles the label click and prevents the browser's own label activation; letting both
        // run would forward a second click to the input and skip a state.
        for (const props of [{ label: "Open only" }, { id: "isOpen", label: "Open only" }]) {
            const { model, label } = mount(props)

            label().click()
            await nextTick()
            expect(model.value).toBe(true)

            label().click()
            await nextTick()
            expect(model.value).toBe(false)
        }
    })
})
