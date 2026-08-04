import { describe, test, expect } from "vitest"
import { createApp, defineComponent, h, nextTick, ref } from "vue"
import { useOwnedCollection } from "../../../src/vue/entities/form/ownedCollections"

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

describe("useOwnedCollection — items", () => {
    test("reads as [] while the parent's collection is still unset", async () => {
        // The crash this prevents: a computed that maps items (e.g. :filter-defaults="{ exclude: items.map(…) }")
        // evaluates during setup, before onMounted materializes the array — "Cannot read properties of
        // undefined (reading 'map')", surfaced only in the dev-server log, rendering an empty comment node.
        const modelValue = ref(undefined)
        const { api, unmount } = mount(modelValue)

        expect(Array.isArray(api.items.value)).toBe(true)
        expect(api.items.value.map((r) => r.id)).toEqual([])

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
