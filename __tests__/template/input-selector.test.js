import { describe, test, expect, vi, beforeEach } from "vitest"
import { createApp, defineComponent, h, nextTick, reactive } from "vue"

// The generated slice InputSelector, mounted against a stubbed slice: its store resolves an id to a row, and the
// child controls are inert. What is under test is the resolution of `idValue` into the displayed `modelValue`.
const { list } = vi.hoisted(() => ({ list: vi.fn(async (so) => [{ id: Number(so.id), $title: "Row " + so.id }]) }))
vi.mock("../../_template/entity-slice/data/store", () => ({ default: () => ({ fromPool: (x) => x, list }) }))
vi.mock("../../_template/entity-slice/config/config", () => ({ default: { key: "Foo" } }))
vi.mock("../../_template/entity-slice/data/Entity", () => ({ default: class {} }))
vi.mock("../../_template/entity-slice/details/FormModalButton.vue", () => ({ default: { render: () => null } }))
vi.mock("../../_template/entity-slice/selecting/Autocomplete.vue", () => ({ default: { render: () => null } }))
vi.mock("../../_template/entity-slice/selecting/SelectorModalButton.vue", () => ({ default: { render: () => null } }))
vi.mock("@regira/modules/vue/ui", () => ({ Icon: { render: () => null } }))

const { default: InputSelector } = await import("../../_template/entity-slice/selecting/InputSelector.vue")

const flush = async () => {
    for (let i = 0; i < 5; i++) await nextTick()
}

/** a parent binding both v-models, the way a scaffolded form does — or only `v-model` with `modelOnly` */
function mount(state, { modelOnly = false } = {}) {
    const Parent = defineComponent({
        setup: () => () =>
            h(InputSelector, {
                modelValue: state.model,
                "onUpdate:modelValue": (v) => (state.model = v),
                ...(modelOnly ? {} : { idValue: state.id, "onUpdate:idValue": (v) => (state.id = v) }),
            }),
    })
    createApp(Parent).mount(document.createElement("div"))
}

/** the scaffolded FilterAdv: a local entity ref, and the id on a search object the overview rebuilds from the URL */
function mountFilter(state) {
    const Parent = defineComponent({
        setup: () => () =>
            h(InputSelector, {
                modelValue: state.filterBar,
                "onUpdate:modelValue": (v) => (state.filterBar = v),
                idValue: state.searchObject.barId,
                "onUpdate:idValue": (v) => (state.searchObject.barId = v),
            }),
    })
    createApp(Parent).mount(document.createElement("div"))
}

describe("generated InputSelector — as an overview filter", () => {
    beforeEach(() => {
        list.mockClear()
    })

    test("an id restored from the query string is translated into id + model", async () => {
        const state = reactive({ searchObject: { barId: "5" }, filterBar: undefined })
        mountFilter(state)
        await flush()

        expect(state.filterBar?.id).toBe(5)
        expect(list).toHaveBeenCalledTimes(1)
    })

    test("a search object rebuilt from the URL with the same id (now a string) requests nothing", async () => {
        const state = reactive({ searchObject: { barId: 5 }, filterBar: { id: 5, $title: "Row 5" } })
        mountFilter(state)
        await flush()

        state.searchObject = { barId: "5" } // the route round trip
        await flush()

        expect(list).not.toHaveBeenCalled()
        expect(state.filterBar?.id).toBe(5)
    })

    test("Back/Forward to another id relabels the control", async () => {
        const state = reactive({ searchObject: { barId: "5" }, filterBar: undefined })
        mountFilter(state)
        await flush()

        state.searchObject = { barId: "8" }
        await flush()

        expect(state.filterBar?.id).toBe(8)
    })

    test("the filter's reset (search object and entity cleared together) requests nothing", async () => {
        const state = reactive({ searchObject: { barId: 5 }, filterBar: { id: 5, $title: "Row 5" } })
        mountFilter(state)
        await flush()

        state.searchObject = {}
        state.filterBar = undefined
        await flush()

        expect(list).not.toHaveBeenCalled()
        expect(state.filterBar).toBeUndefined()
    })
})

describe("generated InputSelector — idValue resolution", () => {
    beforeEach(() => {
        list.mockClear() // in braces: a function returned from beforeEach runs as its cleanup hook
    })

    test("resolves an id that is set before mount", async () => {
        const state = reactive({ id: 5, model: undefined })
        mount(state)
        await flush()

        expect(state.model?.id).toBe(5)
    })

    test("resolves an id assigned after mount (a deep-link prefill in the parent's onMounted)", async () => {
        const state = reactive({ id: undefined, model: undefined })
        mount(state)
        await flush()
        expect(list).not.toHaveBeenCalled()

        state.id = 7
        await flush()

        expect(state.model?.id).toBe(7)
    })

    test("follows a programmatic reassignment instead of showing the previous row", async () => {
        const state = reactive({ id: 5, model: { id: 5, $title: "Row 5" } })
        mount(state)
        await flush()
        expect(list).not.toHaveBeenCalled() // already consistent — no request

        state.id = 9
        await flush()

        expect(state.model?.id).toBe(9)
    })

    test("clearing the FK in code clears the displayed row", async () => {
        const state = reactive({ id: 5, model: { id: 5, $title: "Row 5" } })
        mount(state)
        await flush()

        state.id = undefined
        await flush()

        expect(state.model).toBeUndefined()
    })

    test("a row resolved for an FK that was cleared meanwhile is dropped", async () => {
        const state = reactive({ id: undefined, model: undefined })
        mount(state)
        await flush()

        state.id = 7
        state.id = undefined // before the pre-flush watcher runs: nothing is requested at all
        await flush()
        state.id = 8
        await nextTick() // the request for 8 is in flight…
        state.id = undefined // …and the FK is cleared before it lands
        await flush()

        expect(state.model).toBeUndefined()
    })

    test("bound with v-model only, the displayed row is never cleared", async () => {
        const state = reactive({ model: { id: 5, $title: "Row 5" } })
        mount(state, { modelOnly: true })
        await flush()

        expect(state.model?.id).toBe(5)
        expect(list).not.toHaveBeenCalled()
    })

    test("a string id from the route matches its numeric row, so nothing is re-fetched", async () => {
        const state = reactive({ id: "5", model: { id: 5, $title: "Row 5" } })
        mount(state)
        await flush()

        expect(list).not.toHaveBeenCalled()
    })
})
