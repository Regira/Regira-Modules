import { describe, test, expect } from "vitest"
import { createApp, defineComponent, h, nextTick, ref } from "vue"

import DateInput from "../../../src/vue/ui/input/DateInput.vue"

function mount(props = {}) {
    const host = document.createElement("div")
    document.body.appendChild(host)
    const model = ref(props.modelValue)
    let emitted = 0
    const app = createApp(
        defineComponent({
            setup: () => () =>
                h(DateInput, {
                    ...props,
                    modelValue: model.value,
                    "onUpdate:modelValue": (v) => {
                        emitted++
                        model.value = v
                    },
                }),
        })
    )
    app.mount(host)
    const input = () => host.querySelector("input")
    return {
        model,
        input,
        emits: () => emitted,
        change: (value) => {
            input().value = value
            input().dispatchEvent(new Event("change"))
            return nextTick()
        },
    }
}

describe("DateInput", () => {
    test("a Date model prefills the yyyy-MM-dd the native control needs", () => {
        const { input } = mount({ modelValue: new Date("2026-01-15T00:00:00Z") })

        expect(input().value).toBe("2026-01-15")
    })

    test("picking a date emits a Date", async () => {
        const { model, change } = mount()

        await change("2026-03-01")

        expect(model.value).toBeInstanceOf(Date)
        expect(model.value.getTime()).toBe(new Date("2026-03-01").getTime())
    })

    test("clearing the field emits undefined, never an Invalid Date", async () => {
        // `new Date("")` is an Invalid Date AND truthy, so emitting it left a bound filter field non-null:
        // the filter stayed "active" (value != null) and the control red, while the value was dropped from
        // the query string and nothing was actually filtered.
        const { model, change } = mount({ modelValue: new Date("2026-01-15T00:00:00Z") })

        await change("")

        expect(model.value).toBeUndefined()
    })

    test("readonly refuses the emit — a native picker cannot write through it", async () => {
        const { model, emits, change } = mount({ modelValue: new Date("2026-01-15T00:00:00Z"), readonly: true })

        await change("")

        expect(emits()).toBe(0)
        expect(model.value).toEqual(new Date("2026-01-15T00:00:00Z"))
    })
})
