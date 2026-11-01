import { describe, test, expect, vi, beforeEach } from "vitest"
import { createApp, defineComponent, h, nextTick, reactive } from "vue"

// The generated slice InputSelector, mounted against a stubbed slice: its store resolves an id to a row, and the
// child controls are inert. What is under test is the resolution of `idValue` into the displayed `modelValue`.
const { list } = vi.hoisted(() => {
    const row = (id) => ({ id: Number(id), $id: Number(id), $title: "Row " + id })
    return { list: vi.fn(async (so) => (so.ids ?? [so.id]).map(row)) }
})
vi.mock("../../_template/entity-slice/data/store", () => ({ default: () => ({ fromPool: (x) => x, list }) }))
vi.mock("../../_template/entity-slice/config/config", () => ({ default: { key: "Foo" } }))
vi.mock("../../_template/entity-slice/data/Entity", () => ({ default: class {} }))
// the edit button renders a marker, so a test can tell whether the control shows it, and records what it is given
const { modalButtons } = vi.hoisted(() => ({ modalButtons: new Map() }))
vi.mock("../../_template/entity-slice/details/FormModalButton.vue", async () => {
    const { h } = await import("vue")
    return {
        default: {
            props: ["modelValue", "readonly", "closeOnSave", "itemDefaults", "onSave", "onUpdate:modelValue"],
            render() {
                modalButtons.set(this.modelValue?.id ?? "new", this)
                return h("span", { class: "form-modal-button" })
            },
        },
    }
})
// the picker records what it is given and hands a test its `select`, standing in for a pick
const { picker } = vi.hoisted(() => ({ picker: {} }))
vi.mock("../../_template/entity-slice/selecting/Autocomplete.vue", () => ({
    default: {
        props: ["modelValue", "filterDefaults", "placeholder", "confirmSelection", "onSelect", "onUpdate:modelValue"],
        render() {
            picker.value = this.modelValue
            picker.filter = this.filterDefaults
            picker.placeholder = this.placeholder
            picker.confirmSelection = this.confirmSelection
            picker.select = this.onSelect
            picker.update = this["onUpdate:modelValue"]
            return null
        },
    },
}))
vi.mock("../../_template/entity-slice/selecting/SelectorModalButton.vue", () => ({ default: { render: () => null } }))
vi.mock("@regira/modules/vue/ui", () => ({ Icon: { render: () => null } }))

const { default: InputSelector } = await import("../../_template/entity-slice/selecting/InputSelector.vue")

// a slice runs under langPlugin, which provides $t (the clear button's accessible name)
function mountApp(Parent) {
    const app = createApp(Parent)
    app.config.globalProperties.$t = (key) => key
    const el = document.createElement("div")
    app.mount(el)
    return el
}

const flush = async () => {
    for (let i = 0; i < 5; i++) await nextTick()
}

/** a parent binding both v-models, the way a scaffolded form does — or only `v-model` with `modelOnly` */
function mount(state, { modelOnly = false, readonly = false } = {}) {
    const Parent = defineComponent({
        setup: () => () =>
            h(InputSelector, {
                modelValue: state.model,
                "onUpdate:modelValue": (v) => (state.model = v),
                ...(modelOnly ? {} : { idValue: state.id, "onUpdate:idValue": (v) => (state.id = v) }),
                readonly,
            }),
    })
    return mountApp(Parent)
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
    mountApp(Parent)
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

    test("a row the caller may not read (403) keeps the FK and shows nothing, without an uncaught error", async () => {
        list.mockRejectedValueOnce(Object.assign(new Error("Request failed with status code 403"), { response: { status: 403 } }))
        const state = reactive({ id: 5, model: undefined })
        const errors = []
        const app = createApp(
            defineComponent({
                setup: () => () =>
                    h(InputSelector, {
                        modelValue: state.model,
                        "onUpdate:modelValue": (v) => (state.model = v),
                        idValue: state.id,
                        "onUpdate:idValue": (v) => (state.id = v),
                    }),
            })
        )
        app.config.globalProperties.$t = (key) => key
        app.config.errorHandler = (err) => errors.push(err)
        app.mount(document.createElement("div"))
        await flush()

        expect(list).toHaveBeenCalledTimes(1)
        expect(errors).toEqual([])
        expect(state.model).toBeUndefined()
        expect(state.id).toBe(5)
    })
})

// the prepend button opens the selected row, or a new one: a read-only control opens only a row that is there
describe("generated InputSelector — readonly", () => {
    const button = (el) => el.querySelector(".form-modal-button")

    test("an empty read-only control shows no button", async () => {
        const el = mount(reactive({ id: undefined, model: undefined }), { readonly: true })
        await flush()

        expect(button(el)).toBeNull()
    })

    test("a read-only control keeps the button while a row is selected", async () => {
        const el = mount(reactive({ id: 5, model: { id: 5, $title: "Row 5" } }), { readonly: true })
        await flush()

        expect(button(el)).not.toBeNull()
    })

    test("an editable empty control shows the button, to create a row", async () => {
        const el = mount(reactive({ id: undefined, model: undefined }))
        await flush()

        expect(button(el)).not.toBeNull()
    })
})

describe("generated InputSelector — confirmSelection", () => {
    test("is off for a single control unless the caller sets it", async () => {
        mount(reactive({ id: undefined, model: undefined }))
        await flush()

        expect(picker.confirmSelection).toBe(false)
    })
})

describe("generated InputSelector — multiple", () => {
    const row = (id) => ({ id, $id: id, $title: "Row " + id })
    const titles = (el) => [...el.querySelectorAll(".input-selector-multiple .border")].map((x) => x.textContent.trim())

    /** a parent binding both v-models of a multi-select; `selected` collects its `select` payloads */
    function mountMultiple(state, props = {}) {
        const Parent = defineComponent({
            setup: () => () =>
                h(InputSelector, {
                    multiple: true,
                    modelValue: state.model,
                    "onUpdate:modelValue": (v) => (state.model = v),
                    idsValue: state.ids,
                    "onUpdate:idsValue": (v) => (state.ids = v),
                    onSelect: (v) => state.selected?.push(v),
                    ...props,
                }),
        })
        return mountApp(Parent)
    }

    /** what a real pick does: the Autocomplete's v-model first, its `select` after */
    function pick(selected) {
        picker.update(selected)
        picker.select(selected)
    }
    function deferred() {
        let resolve
        const promise = new Promise((r) => (resolve = r))
        return { promise, resolve }
    }

    beforeEach(() => {
        list.mockClear()
        modalButtons.clear()
    })

    test("shows a chip per row, with the single control to pick the next one", async () => {
        const el = mountMultiple(reactive({ ids: [1, 2], model: [row(1), row(2)] }))
        await flush()

        expect(titles(el)).toEqual(["Row 1", "Row 2"])
        expect(el.querySelector(".input-selector.input-group")).not.toBeNull()
    })

    test("a pick adds the row to both v-models and fires select with it", async () => {
        const state = reactive({ ids: [1], model: [row(1)], selected: [] })
        mountMultiple(state)
        await flush()

        pick(row(2))
        await flush()

        expect(state.model.map((x) => x.id)).toEqual([1, 2])
        expect(state.ids).toEqual([1, 2])
        expect(state.selected.map((x) => x.id)).toEqual([2])
        expect(list).not.toHaveBeenCalled() // the ids it emitted name the rows it holds
    })

    test("select fires after both v-models, because a filter's handleUpdate searches on it", async () => {
        const state = reactive({ ids: [1], model: [row(1)] })
        const seen = []
        mountMultiple(state, { onSelect: () => seen.push({ ids: [...state.ids], rows: state.model.length }) })
        await flush()

        pick(row(2))
        await flush()

        expect(seen).toEqual([{ ids: [1, 2], rows: 2 }])
    })

    test("the picker stays empty after a pick, ready for the next one", async () => {
        mountMultiple(reactive({ ids: [1], model: [row(1)] }))
        await flush()

        pick(row(2))
        await flush()

        expect(picker.value).toBeUndefined()
    })

    test("a row created from the picker becomes a chip and leaves the picker empty", async () => {
        // useModal emits `save` first and `update:modelValue` after it
        const state = reactive({ ids: [1], model: [row(1)], selected: [] })
        mountMultiple(state)
        await flush()

        const create = modalButtons.get("new")
        create.onSave({ saved: row(7) })
        create["onUpdate:modelValue"](row(7))
        await flush()

        expect(state.ids).toEqual([1, 7])
        expect(state.selected.map((x) => x.id)).toEqual([7])
        expect(picker.value).toBeUndefined()
        expect(modalButtons.get("new").modelValue).toBeUndefined()
    })

    test("a pick while the ids are resolving keeps them", async () => {
        const held = deferred()
        list.mockReturnValueOnce(held.promise)
        const state = reactive({ ids: ["1", "2"], model: undefined })
        mountMultiple(state)
        await flush()

        pick(row(3))
        await flush()
        expect(state.ids).toEqual(["1", "2", 3])

        held.resolve([row(1), row(2)]) // answers for ids that have changed since
        await flush()

        expect(state.ids).toEqual(["1", "2", 3])
        expect(state.model.map((x) => x.id)).toEqual([1, 2, 3])
    })

    test("a pick after the ids could not be resolved (403) keeps them", async () => {
        const forbidden = Object.assign(new Error("Request failed with status code 403"), { response: { status: 403 } })
        list.mockRejectedValueOnce(forbidden).mockRejectedValueOnce(forbidden)
        const state = reactive({ ids: [1, 2], model: undefined })
        mountMultiple(state)
        await flush()

        pick(row(3))
        await flush()

        expect(state.ids).toEqual([1, 2, 3])
        expect(state.model.map((x) => x.id)).toEqual([3])
    })

    test("removing a chip keeps an id the API returned no row for", async () => {
        list.mockResolvedValueOnce([row(1)]).mockResolvedValueOnce([])
        const state = reactive({ ids: [1, 99], model: undefined })
        const el = mountMultiple(state)
        await flush()

        el.querySelector("button[aria-label='remove']").click()
        await flush()

        expect(state.ids).toEqual([99])
        expect(state.model).toEqual([])
    })

    test("picking a row whose id is still resolving lists it once", async () => {
        const held = deferred()
        list.mockReturnValueOnce(held.promise)
        const state = reactive({ ids: ["1", "2"], model: undefined })
        mountMultiple(state)
        await flush()

        pick(row(1))
        await flush()

        expect(state.ids).toEqual(["2", 1])
    })

    test("a pick after the parent changed the ids drops the rows they no longer name", async () => {
        const forbidden = Object.assign(new Error("Request failed with status code 403"), { response: { status: 403 } })
        const state = reactive({ ids: [1, 2], model: [row(1), row(2)] })
        mountMultiple(state)
        await flush()
        list.mockRejectedValueOnce(forbidden)
        state.ids = [3] // Back/Forward, and the rows for it are refused
        await flush()

        pick(row(3))
        await flush()

        expect(state.ids).toEqual([3])
        expect(state.model.map((x) => x.id)).toEqual([3])
    })

    test("refused rows leave only the chips the ids still name, and a dropped row can be picked again", async () => {
        const forbidden = Object.assign(new Error("Request failed with status code 403"), { response: { status: 403 } })
        const state = reactive({ ids: [1, 2], model: [row(1), row(2)] })
        mountMultiple(state)
        await flush()
        list.mockRejectedValueOnce(forbidden).mockRejectedValueOnce(forbidden)
        state.ids = [1, 3] // Back/Forward, and the rows for it are refused
        await flush()

        expect(state.model.map((x) => x.id)).toEqual([1])

        pick(row(2))
        await flush()

        expect(state.ids).toEqual([1, 3, 2])
        expect(state.model.map((x) => x.id)).toEqual([1, 2])
    })

    test("a refusal for ids that newer ids replaced changes nothing", async () => {
        let refuse
        const state = reactive({ ids: [1, 2], model: [row(1), row(2)] })
        mountMultiple(state)
        await flush()
        list.mockReturnValueOnce(new Promise((_, reject) => (refuse = reject))).mockReturnValueOnce(new Promise(() => {}))
        state.ids = [1, 3]
        await flush()
        state.ids = [2, 4]
        await flush()

        refuse(new Error("Request failed with status code 403"))
        await flush()

        expect(state.model.map((x) => x.id)).toEqual([1, 2])
    })

    test("a pick of a row the ids no longer name, while the new rows load, gives it one chip", async () => {
        const state = reactive({ ids: [1, 2], model: [row(1), row(2)] })
        mountMultiple(state)
        await flush()
        list.mockReturnValueOnce(new Promise(() => {})).mockReturnValueOnce(new Promise(() => {}))
        state.ids = [1, 3]
        await flush()

        pick(row(2))
        await flush()

        expect(state.ids).toEqual([1, 3, 2])
        expect(state.model.map((x) => x.id)).toEqual([1, 2])
    })

    test("an id without its row takes a pick, which gives it a chip", async () => {
        list.mockRejectedValueOnce(Object.assign(new Error("Request failed with status code 403"), { response: { status: 403 } }))
        const state = reactive({ ids: [1, 2], model: undefined })
        mountMultiple(state)
        await flush()

        pick(row(2))
        await flush()

        expect(state.ids).toEqual([1, 2])
        expect(state.model.map((x) => x.id)).toEqual([2])
    })

    test("the picker excludes an id without its row, not a row without its id", async () => {
        const state = reactive({ ids: [1, 2], model: [row(1), row(2)] })
        mountMultiple(state)
        await flush()
        list.mockReturnValueOnce(new Promise(() => {}))
        state.ids = [1, 3]
        await flush()

        expect(picker.filter.exclude).toEqual([1, 3])
    })

    test("rows bound without ids get theirs on the first change", async () => {
        const state = reactive({ ids: undefined, model: [row(1)] })
        mountMultiple(state)
        await flush()

        pick(row(2))
        await flush()

        expect(state.ids).toEqual([1, 2])
    })

    test("a row already selected is not added twice", async () => {
        const state = reactive({ ids: [1], model: [row(1)], selected: [] })
        mountMultiple(state)
        await flush()

        pick(row(1))
        await flush()

        expect(state.model).toHaveLength(1)
        expect(state.selected).toEqual([])
    })

    test("removing a chip updates both v-models and fires select with undefined", async () => {
        const state = reactive({ ids: [1, 2], model: [row(1), row(2)], selected: [] })
        const el = mountMultiple(state)
        await flush()

        el.querySelector(".input-selector-multiple button[aria-label='remove']").click()
        await flush()

        expect(state.model.map((x) => x.id)).toEqual([2])
        expect(state.ids).toEqual([2])
        expect(state.selected).toEqual([undefined])
    })

    test("the picker excludes the selected rows, next to the caller's own exclude", async () => {
        mountMultiple(reactive({ ids: [1], model: [row(1)] }), { filterDefaults: { foo: "bar", exclude: [9] } })
        await flush()

        expect(picker.filter).toEqual({ foo: "bar", exclude: [9, 1] })
    })

    test("the picker confirms a pick and takes the control's options", async () => {
        const itemDefaults = { foo: 1 }
        mountMultiple(reactive({ ids: [1], model: [row(1)] }), { itemDefaults, closeOnSave: true, placeholder: "Add" })
        await flush()

        expect(picker.confirmSelection).toBe(true)
        expect(picker.placeholder).toBe("Add")
        expect(modalButtons.get("new").itemDefaults).toEqual(itemDefaults)
        expect(modalButtons.get("new").closeOnSave).toBe(true)
    })

    test("a chip's edit button takes the row, closeOnSave and readonly", async () => {
        mountMultiple(reactive({ ids: [1], model: [row(1)] }), { closeOnSave: true, readonly: true })
        await flush()

        expect(modalButtons.get(1).closeOnSave).toBe(true)
        expect(modalButtons.get(1).readonly).toBe(true)
    })

    test("canEdit false shows no edit button, on the chips or the picker", async () => {
        const el = mountMultiple(reactive({ ids: [1], model: [row(1)] }), { canEdit: false })
        await flush()

        expect(el.querySelector(".form-modal-button")).toBeNull()
    })

    test("slots go to the picker", async () => {
        const Parent = defineComponent({
            setup: () => () => h(InputSelector, { multiple: true, modelValue: [row(1)] }, { prepend: () => h("i", { class: "my-prepend" }) }),
        })
        const el = mountApp(Parent)
        await flush()

        expect(el.querySelector(".input-selector.input-group .my-prepend")).not.toBeNull()
        expect(el.querySelector(".form-modal-button")).not.toBeNull() // the chip's, untouched by the slot
    })

    test("warns when the ids are bound without v-model", async () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
        mountApp(defineComponent({ setup: () => () => h(InputSelector, { multiple: true, idsValue: [1] }) }))
        await flush()

        expect(warn.mock.calls.flat().join()).toContain("v-model:idsValue is bound without v-model")
        warn.mockRestore()
    })

    test("readonly shows the chips without a remove button or a picker", async () => {
        const el = mountMultiple(reactive({ ids: [1], model: [row(1)] }), { readonly: true })
        await flush()

        expect(titles(el)).toEqual(["Row 1"])
        expect(el.querySelector("button[aria-label='remove']")).toBeNull()
        expect(el.querySelector(".input-selector.input-group")).toBeNull()
    })

    test("ids restored from the query string resolve into the rows", async () => {
        const state = reactive({ ids: ["1", "2"], model: undefined })
        mountMultiple(state)
        await flush()

        expect(list).toHaveBeenCalledWith({ ids: ["1", "2"], pageSize: 2 })
        expect(state.model.map((x) => x.id)).toEqual([1, 2])
    })

    test("a query string with one id arrives as a scalar", async () => {
        const state = reactive({ ids: "1", model: undefined })
        mountMultiple(state)
        await flush()

        expect(state.model.map((x) => x.id)).toEqual([1])
    })

    test("ids that are strings match their numeric rows, so nothing is requested", async () => {
        mountMultiple(reactive({ ids: ["1"], model: [row(1)] }))
        await flush()

        expect(list).not.toHaveBeenCalled()
    })

    test("bound with v-model only, the rows are never cleared", async () => {
        const state = reactive({ model: [row(1)] })
        mountApp(
            defineComponent({
                setup: () => () => h(InputSelector, { multiple: true, modelValue: state.model, "onUpdate:modelValue": (v) => (state.model = v) }),
            })
        )
        await flush()

        expect(state.model.map((x) => x.id)).toEqual([1])
        expect(list).not.toHaveBeenCalled()
    })

    test("the same ids in a rebuilt array, now strings, request nothing", async () => {
        const state = reactive({ ids: [1, 2], model: [row(1), row(2)] })
        mountMultiple(state)
        await flush()

        state.ids = ["1", "2"]
        await flush()

        expect(list).not.toHaveBeenCalled()
    })

    test("other ids of the same length relabel the chips", async () => {
        const state = reactive({ ids: [1, 2], model: [row(1), row(2)] })
        mountMultiple(state)
        await flush()

        state.ids = [3, 4] // Back/Forward
        await flush()

        expect(state.model.map((x) => x.id)).toEqual([3, 4])
    })

    test("an id removed in code removes its chip", async () => {
        const state = reactive({ ids: [1, 2], model: [row(1), row(2)] })
        mountMultiple(state)
        await flush()

        state.ids = [1]
        await flush()

        expect(state.model.map((x) => x.id)).toEqual([1])
    })

    test("an empty query value is no id", async () => {
        mountMultiple(reactive({ ids: "", model: undefined }))
        await flush()

        expect(list).not.toHaveBeenCalled()
    })

    test("clearing the ids in code clears the rows", async () => {
        const state = reactive({ ids: [1], model: [row(1)] })
        mountMultiple(state)
        await flush()

        state.ids = undefined
        await flush()

        expect(state.model).toEqual([])
    })

    test("rows resolved for ids that changed meanwhile are dropped", async () => {
        const held = deferred()
        list.mockReturnValueOnce(held.promise)
        const state = reactive({ ids: [1], model: undefined })
        mountMultiple(state)
        await flush()

        state.ids = [2]
        await flush()
        held.resolve([row(1)]) // lands after the rows for 2
        await flush()

        expect(state.model.map((x) => x.id)).toEqual([2])
    })

    test("rows the caller may not read (403) keep the ids, without an uncaught error", async () => {
        list.mockRejectedValueOnce(Object.assign(new Error("Request failed with status code 403"), { response: { status: 403 } }))
        const state = reactive({ ids: [1], model: undefined })
        const el = mountMultiple(state)
        await flush()

        expect(titles(el)).toEqual([])
        expect(state.ids).toEqual([1])
    })

    test("a route round trip after a 403 does not ask again", async () => {
        list.mockRejectedValueOnce(Object.assign(new Error("Request failed with status code 403"), { response: { status: 403 } }))
        const state = reactive({ ids: [1], model: undefined })
        mountMultiple(state)
        await flush()

        state.ids = ["1"]
        await flush()

        expect(list).toHaveBeenCalledTimes(1)
    })

    test("clearing ids that never resolved leaves the model alone", async () => {
        list.mockRejectedValueOnce(Object.assign(new Error("Request failed with status code 403"), { response: { status: 403 } }))
        const state = reactive({ ids: [1], model: undefined })
        mountMultiple(state)
        await flush()

        state.ids = []
        await flush()

        expect(state.model).toBeUndefined()
    })
})
