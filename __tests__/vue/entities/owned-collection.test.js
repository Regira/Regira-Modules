import { describe, test, expect } from "vitest"
import { createApp, defineComponent, h, nextTick, ref } from "vue"
import { useOwnedCollection } from "../../../src/vue/entities/form/ownedCollections"
import { useListInput } from "../../../src/vue/entities/form/listInput"

// The owned-row model an editor is bound to. Only the PARENT passes through the service's toEntity, so the
// add-row never does — which is why field defaults have to come from somewhere.
class OrderLine {
    id = 0
    kind = "Purchase"
    quantity = 1
    get $id() {
        return this.id || "new"
    }
    get $title() {
        return this.kind
    }
}

/** Mounts a component that just exposes the composable, so the onMounted/watch wiring runs for real. */
function mount(modelValueRef, options = {}) {
    const host = document.createElement("div")
    document.body.appendChild(host)
    let api = null
    const app = createApp(
        defineComponent({
            setup() {
                const props = new Proxy(
                    {},
                    {
                        get: (_, key) => (key === "modelValue" ? modelValueRef.value : undefined),
                        has: (_, key) => key === "modelValue",
                    }
                )
                api = useOwnedCollection({
                    props,
                    emit: (event, value) => {
                        if (event === "update:modelValue") modelValueRef.value = value
                    },
                    ...options,
                })
                return () => h("div")
            },
        })
    )
    app.mount(host)
    return {
        api,
        unmount: () => {
            app.unmount()
            host.remove()
        },
    }
}

/**
 * Mounts a real parent that binds the editor with v-model, so the child's prop only changes when the parent
 * re-renders — the timing the props-ref harness above hides, since it reads the new value synchronously.
 */
function mountWithParent(composable, initial, options = {}) {
    const host = document.createElement("div")
    document.body.appendChild(host)
    const collection = ref(initial)
    let api = null
    const updates = []
    const Editor = defineComponent({
        props: { modelValue: Array },
        emits: ["update:modelValue"],
        setup(props, { emit }) {
            api = composable({ props, emit, ...options })
            return () => h("div")
        },
    })
    const app = createApp(
        defineComponent({
            setup() {
                return () =>
                    h(Editor, {
                        modelValue: collection.value,
                        "onUpdate:modelValue": (value) => {
                            updates.push(value)
                            collection.value = value
                        },
                    })
            },
        })
    )
    app.mount(host)
    return {
        api,
        collection,
        updates,
        unmount: () => {
            app.unmount()
            host.remove()
        },
    }
}

describe("useOwnedCollection — items", () => {
    test("reads as [] while the parent's collection is still unset, and leaves it unset", async () => {
        // The crash this prevents: a computed that maps items (e.g. :filter-defaults="{ exclude: items.map(…) }")
        // evaluates during setup, before onMounted materializes the array — "Cannot read properties of
        // undefined (reading 'map')", surfaced only in the dev-server log, rendering an empty comment node.
        const modelValue = ref(undefined)
        const { api, unmount } = mount(modelValue)
        await nextTick()

        expect(Array.isArray(api.items.value)).toBe(true)
        expect(api.items.value.map((r) => r.id)).toEqual([])
        // A collection that was never loaded stays undefined: `[]` would save as "delete every row".
        expect(modelValue.value).toBeUndefined()

        unmount()
    })

    test("emits nothing on mount or when the parent swaps the collection", async () => {
        const { collection, updates, unmount } = mountWithParent(useOwnedCollection, undefined)
        await nextTick()
        collection.value = [Object.assign(new OrderLine(), { id: 3 })]
        await nextTick()
        collection.value = undefined
        await nextTick()

        expect(updates).toEqual([])
        expect(collection.value).toBeUndefined()

        unmount()
    })

    test("writes through to the parent", async () => {
        const modelValue = ref([])
        const { api, unmount } = mount(modelValue)

        api.items.value = [Object.assign(new OrderLine(), { id: 7 })]
        await nextTick()

        expect(modelValue.value.map((r) => r.id)).toEqual([7])

        unmount()
    })
})

describe("useOwnedCollection — add-row", () => {
    test("without createRow the row is a bare { id: 0 } and class defaults are absent", async () => {
        const modelValue = ref([])
        const { api, unmount } = mount(modelValue)
        await nextTick()

        expect(api.newItem.value.id).toBe(0)
        expect(api.newItem.value.kind).toBeUndefined()

        unmount()
    })

    test("createRow mints the row from the model, so defaults and getters are present", async () => {
        const modelValue = ref([])
        const { api, unmount } = mount(modelValue, { createRow: () => new OrderLine() })
        await nextTick()

        expect(api.newItem.value.kind).toBe("Purchase")
        expect(api.newItem.value.quantity).toBe(1)
        expect(api.newItem.value.$title).toBe("Purchase")
        expect(api.newItem.value.id).toBe(0) // still marks the row unsaved

        unmount()
    })

    test("handleSave appends with a negative temp id and re-mints the add-row from createRow", async () => {
        const modelValue = ref([])
        const { api, unmount } = mount(modelValue, { createRow: () => new OrderLine() })
        await nextTick()

        api.handleSave({ saved: api.newItem.value, isNew: true })
        await nextTick()

        expect(modelValue.value).toHaveLength(1)
        expect(modelValue.value[0].id).toBe(-1) // negative temp ids keep pre-save rows unique
        // The re-minted row must carry the defaults too — this is the "seed it on EVERY reset" caveat that
        // consumers previously had to implement themselves with a watch.
        expect(api.newItem.value.kind).toBe("Purchase")

        unmount()
    })
})

describe("useOwnedCollection — appends in one tick", () => {
    test("two handleSave calls before the parent re-renders keep both rows with distinct temp ids", async () => {
        const { api, collection, unmount } = mountWithParent(useOwnedCollection, [Object.assign(new OrderLine(), { id: 4 })], {
            createRow: () => new OrderLine(),
        })
        await nextTick()

        api.handleSave({ saved: new OrderLine(), isNew: true })
        api.handleSave({ saved: new OrderLine(), isNew: true })
        await nextTick()

        expect(collection.value.map((r) => r.id)).toEqual([4, -1, -2])

        unmount()
    })

    test("an append after the parent replaced the collection builds on the new one", async () => {
        const { api, collection, unmount } = mountWithParent(useOwnedCollection, [])
        await nextTick()

        api.handleSave({ saved: new OrderLine(), isNew: true })
        await nextTick()
        collection.value = [Object.assign(new OrderLine(), { id: 9 })] // a reload
        await nextTick()
        api.handleSave({ saved: new OrderLine(), isNew: true })
        await nextTick()

        expect(collection.value.map((r) => r.id)).toEqual([9, -1])

        unmount()
    })
})

describe("useListInput", () => {
    test("appends to an unset collection, and two appends in one tick keep both rows", async () => {
        const { api, collection, updates, unmount } = mountWithParent(useListInput, undefined)
        await nextTick()

        expect(api.items.value).toEqual([])
        expect(updates).toEqual([])

        api.handleSave({ saved: { id: 0 }, isNew: true })
        api.handleSave({ saved: { id: 0 }, isNew: true })
        await nextTick()

        expect(collection.value.map((r) => r.id)).toEqual([-1, -2])

        unmount()
    })

    test("a new row next to stored rows gets a negative temp id", async () => {
        const { api, collection, unmount } = mountWithParent(useListInput, [{ id: 3 }, { id: 4 }])
        await nextTick()

        api.handleSave({ saved: { id: 0 }, isNew: true })
        await nextTick()

        expect(collection.value.map((r) => r.id)).toEqual([3, 4, -1]) // not 2, which may name a stored row
        unmount()
    })
})
