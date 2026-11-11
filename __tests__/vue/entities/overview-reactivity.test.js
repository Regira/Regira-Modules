import { describe, test, expect } from "vitest"
import { isProxy, readonly, ref, toRaw, watch, watchEffect } from "vue"
import { useSearchView } from "../../../src/vue/entities/overview/search-view"
import { useListView } from "../../../src/vue/entities/overview/list-view"
import { FeedbackStatus } from "../../../src/vue/ui/feedback"

// What the shared scenarios cannot see: that the composables' state reacts. A wrapper that dropped `computed`,
// `reactive()` or the deep ref would still read right in __tests__/contract, and leave a view that never updates.

const rows = () => [
    { $id: 1, $title: "chair" },
    { $id: 2, $title: "table" },
]
function searchView(options = {}) {
    return useSearchView({ service: { search: async () => ({ items: rows(), count: 60 }), ...options.service }, searchObject: {}, ...options.view })
}

describe("the overview's state reacts", () => {
    test("items re-runs a view after a search, a save and a delete", async () => {
        const view = searchView()
        const seen = []
        watchEffect(() => seen.push(view.items.value?.map((x) => x.$title).join(",")), { flush: "sync" })

        await view.searchHandler()
        view.handleSave({ saved: { $id: 3, $title: "lamp" }, isNew: true })
        view.handleRemove({ $id: 1 })

        expect(seen).toEqual([undefined, "chair,table", "chair,table,lamp", "table,lamp"])
    })

    test("a shallow watch on items fires on a save, which hands it a new array", async () => {
        const view = searchView()
        await view.searchHandler()
        let fired = 0
        watch(view.items, () => fired++, { flush: "sync" })

        view.handleSave({ saved: { $id: 1, $title: "armchair" }, isNew: false })

        expect(fired).toBe(1)
    })

    test("hasMore follows the pages loaded", async () => {
        const view = searchView({ view: { append: true, defaultPageSize: 2 } })
        const seen = []
        watchEffect(() => seen.push(view.hasMore.value), { flush: "sync" })

        await view.searchHandler(true)

        expect(seen).toEqual([false, true])
    })

    test("the feedback's fields react through the reactive object", async () => {
        const view = useListView({ service: { list: async () => Promise.reject(new Error("Network Error")) }, searchObject: {} })
        const seen = []
        watchEffect(() => seen.push(view.feedback.status), { flush: "sync" })
        const error = console.error
        console.error = () => {}
        try {
            await view.listHandler()
        } finally {
            console.error = error
        }

        expect(seen).toContain(FeedbackStatus.failed)
    })

    test("a filter's in-place edit of the search object reaches a deep watch", () => {
        const view = searchView({ view: { searchObject: { q: "" } } })
        let fired = 0
        watch(view.searchObject, () => fired++, { deep: true, flush: "sync" })

        view.searchObject.value.q = "chair"

        expect(fired).toBe(1)
    })

    test("a search object passed as a ref is that ref, as ref() had it", async () => {
        // the mistake OverviewCoreIn warns about, which ref() forgave: the search object is the ref itself
        const calls = []
        const searchObject = ref({ q: "chair" })
        const view = useListView({ service: { list: async (so) => (calls.push(so), []) }, searchObject })

        await view.listHandler()

        expect(view.searchObject).toBe(searchObject)
        expect(calls[0]).toMatchObject({ q: "chair" })
        expect(calls[0]).not.toHaveProperty("_rawValue")
    })

    test("a readonly search object stays readonly", () => {
        const source = { q: "" }
        const view = searchView({ view: { searchObject: readonly(source) } })
        const warn = console.warn
        console.warn = () => {}
        try {
            view.searchObject.value.q = "chair"
        } finally {
            console.warn = warn
        }

        expect(source.q).toBe("")
    })

    test("the rows behind items stay raw after a save and a loaded page", async () => {
        const view = searchView({ view: { append: true, defaultPageSize: 2 } })
        await view.searchHandler(true)
        await view.loadMore()
        view.handleSave({ saved: { $id: 9, $title: "lamp" }, isNew: true })

        expect(toRaw(view.items.value).some(isProxy)).toBe(false)
        expect(() => structuredClone(toRaw(view.items.value))).not.toThrow()
    })
})
