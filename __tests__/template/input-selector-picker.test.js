import { describe, test, expect, vi } from "vitest"
import { createApp, defineComponent, h, reactive } from "vue"

// The generated InputSelector over the real slice and library Autocomplete: the keyboard path the mocked picker in
// input-selector.test.js cannot reach.
const { row, service } = vi.hoisted(() => {
    const row = (id) => ({ id, $id: id, $title: "Row " + id })
    return { row, service: { list: vi.fn(async () => [row(1), row(2), row(3)]) } }
})
vi.mock("../../_template/entity-slice/data/store", () => ({ default: () => ({ fromPool: (x) => x, list: service.list }) }))
vi.mock("../../_template/entity-slice/config/config", () => ({ default: { key: "Foo" } }))
vi.mock("../../_template/entity-slice/data/Entity", () => ({ default: class {} }))
vi.mock("../../_template/entity-slice/details/FormModalButton.vue", () => ({ default: { render: () => null } }))
vi.mock("../../_template/entity-slice/selecting/SelectorModalButton.vue", () => ({ default: { render: () => null } }))
vi.mock("@regira/modules/vue/ioc", () => ({ get: () => service }))

const { default: InputSelector } = await import("../../_template/entity-slice/selecting/InputSelector.vue")

const settle = () => new Promise((resolve) => setTimeout(resolve, 300)) // past the search's debounce

function mountControl(props) {
    const state = reactive({ ids: [], model: [], selected: [] })
    const Parent = defineComponent({
        setup: () => () =>
            h(InputSelector, {
                modelValue: state.model,
                "onUpdate:modelValue": (v) => (state.model = v),
                idsValue: state.ids,
                "onUpdate:idsValue": (v) => (state.ids = v),
                onSelect: (v) => state.selected.push(v),
                ...props,
            }),
    })
    const app = createApp(Parent)
    app.config.globalProperties.$t = (key) => key
    let clickOutside
    app.directive("clickOutside", { mounted: (el, binding) => (clickOutside = binding.value) })
    const host = document.createElement("div")
    document.body.appendChild(host)
    app.mount(host)
    return { state, input: host.querySelector("input"), clickOutside: () => clickOutside({ target: document.body }) }
}
async function type(input, text) {
    input.value = text
    input.dispatchEvent(new Event("input"))
    await settle()
}
async function press(input, ...keys) {
    for (const key of keys) {
        input.dispatchEvent(new KeyboardEvent("keydown", { key }))
    }
    await settle()
}

describe("generated InputSelector — multiple, over the real Autocomplete", () => {
    test("the arrow keys add nothing, and Enter adds the highlighted row", async () => {
        const { state, input } = mountControl({ multiple: true })
        input.dispatchEvent(new FocusEvent("focus"))
        await settle()

        await press(input, "ArrowDown", "ArrowDown", "ArrowDown")
        expect(state.ids).toEqual([])
        expect(state.selected).toEqual([])

        await press(input, "Enter")

        expect(state.ids).toEqual([3])
        expect(state.selected.map((x) => x.id)).toEqual([3])
        expect(input.value).toBe("")
    })

    test("two picks in a row each add a row", async () => {
        const { state, input } = mountControl({ multiple: true })
        input.dispatchEvent(new FocusEvent("focus"))
        await settle()

        await press(input, "ArrowDown", "Enter")
        await press(input, "ArrowDown") // the panel closed with the first pick: this opens it
        await press(input, "ArrowDown", "ArrowDown", "Enter")

        expect(state.ids).toEqual([1, 2])
    })

    test("Enter adds the row whose exact title is typed", async () => {
        const { state, input } = mountControl({ multiple: true })
        await type(input, "Row 2")

        await press(input, "Enter")

        expect(state.ids).toEqual([2])
        expect(input.value).toBe("")
    })

    test("Enter before the results arrive keeps the panel, and a second Enter adds the row", async () => {
        const { state, input } = mountControl({ multiple: true })
        input.value = "Row 2"
        input.dispatchEvent(new Event("input"))

        await press(input, "Enter") // inside the search's debounce

        expect(state.ids).toEqual([])
        expect(input.getAttribute("aria-expanded")).toBe("true")
        expect(input.value).toBe("Row 2")

        await press(input, "Enter")

        expect(state.ids).toEqual([2])
        expect(input.value).toBe("")
    })

    test("Enter on a text that names no row keeps the panel, and a click outside clears the text", async () => {
        const { state, input, clickOutside } = mountControl({ multiple: true })
        await type(input, "Row")

        await press(input, "Enter")

        expect(state.ids).toEqual([])
        expect(input.getAttribute("aria-expanded")).toBe("true")

        clickOutside()
        await settle()

        expect(state.ids).toEqual([])
        expect(input.value).toBe("")
    })

    test("a click outside the control adds the row whose exact title is typed", async () => {
        const { state, input, clickOutside } = mountControl({ multiple: true })
        await type(input, "Row 2")

        clickOutside()
        await settle()

        expect(state.ids).toEqual([2])
        expect(input.value).toBe("")
    })

    test("Tab adds nothing", async () => {
        const { state, input } = mountControl({ multiple: true })
        await type(input, "Row 2")

        input.dispatchEvent(new FocusEvent("blur"))
        await settle()

        expect(state.ids).toEqual([])
    })
})
