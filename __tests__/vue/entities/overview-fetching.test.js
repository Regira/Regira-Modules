import { describe, test, expect, vi, afterEach } from "vitest"
import { useSearchView } from "../../../src/vue/entities/overview/search-view"
import { useListView } from "../../../src/vue/entities/overview/list-view"
import { FeedbackStatus } from "../../../src/vue/ui/feedback"

// Two fetches really do overlap on a hard reload: useRouteOverview fetches on mount, and the
// onAuthenticated hook fetches again the moment the restored token lands. Whichever settled LAST used to
// win — and the bad ordering is the common one, the mount fetch 401'ing after the retry already succeeded.

/** a service whose fetches you settle by hand, in whatever order the test needs */
function deferredService(method) {
    const pending = []
    return {
        [method]: () => new Promise((resolve, reject) => pending.push({ resolve, reject })),
        resolveWith: (index, result) => pending[index].resolve(result),
        rejectWith: (index, error) => pending[index].reject(error),
    }
}

afterEach(() => vi.restoreAllMocks())

describe("useSearchView overlapping searches", () => {
    test("a slower earlier search does not overwrite the newer result", async () => {
        const service = deferredService("search")
        const { items, itemsCount, searchHandler } = useSearchView({ service, searchObject: {} })

        const first = searchHandler()
        const second = searchHandler()
        service.resolveWith(1, { items: [{ id: "fresh" }], count: 1 })
        service.resolveWith(0, { items: [{ id: "stale" }], count: 99 })
        await Promise.all([first, second])

        expect(items.value).toEqual([{ id: "fresh" }])
        expect(itemsCount.value).toBe(1)
    })

    test("a superseded failure leaves no banner over the data that did load", async () => {
        // feedback.fail() does not auto-hide, so the 401 arriving late used to sit on top of the rows.
        vi.spyOn(console, "error").mockImplementation(() => {})
        const service = deferredService("search")
        const { items, feedback, searchHandler } = useSearchView({ service, searchObject: {} })

        const first = searchHandler()
        const second = searchHandler()
        service.resolveWith(1, { items: [{ id: "fresh" }], count: 1 })
        service.rejectWith(0, { response: { status: 401 } })
        await Promise.all([first, second])

        expect(feedback.status).toBe(FeedbackStatus.none)
        expect(items.value).toEqual([{ id: "fresh" }])
    })

    test("the spinner stays up until the newest search settles", async () => {
        const service = deferredService("search")
        const { isLoading, searchHandler } = useSearchView({ service, searchObject: {} })

        const first = searchHandler()
        const second = searchHandler()
        service.resolveWith(0, { items: [], count: 0 }) // the superseded one lands first
        await first
        expect(isLoading.value).toBe(true)

        service.resolveWith(1, { items: [{ id: "fresh" }], count: 1 })
        await second
        expect(isLoading.value).toBe(false)
    })

    test("a lone failing search still reports", async () => {
        vi.spyOn(console, "error").mockImplementation(() => {})
        const service = deferredService("search")
        const { feedback, searchHandler } = useSearchView({ service, searchObject: {} })

        const only = searchHandler()
        service.rejectWith(0, { response: { status: 500, data: { errors: { q: "invalid" } } } })
        await only

        expect(feedback.status).toBe(FeedbackStatus.failed)
        expect(feedback.error).toEqual({ q: "invalid" })
    })
})

// The two composables are a fetch-shape choice and nothing else — same inputs, same overview surface — so
// useListView has to send the same search object and settle overlapping fetches the same way.
describe("useListView", () => {
    /** records what reached service.list() */
    function recordingService() {
        const calls = []
        return { calls, list: async (so) => (calls.push(so), []) }
    }

    test("sends the search object, not paging alone", async () => {
        const service = recordingService()
        const { listHandler } = useListView({ service, searchObject: { q: "widget" }, defaultPageSize: 20 })

        await listHandler()

        expect(service.calls[0]).toMatchObject({ q: "widget", page: 1, pageSize: 20 })
    })

    test("follows the search object the view mutates, not the one it was constructed with", async () => {
        // what Filter.vue and useRouteOverview do — they write the ref the composable handed back
        const service = recordingService()
        const { searchObject, listHandler } = useListView({ service, searchObject: { q: "widget" } })

        searchObject.value = { q: "gadget" }
        await listHandler()

        expect(service.calls[0]).toMatchObject({ q: "gadget" })
    })

    test("a slower earlier list does not overwrite the newer result", async () => {
        const service = deferredService("list")
        const { items, itemsCount, listHandler } = useListView({ service, searchObject: {} })

        const first = listHandler()
        const second = listHandler()
        service.resolveWith(1, [{ id: "fresh" }])
        service.resolveWith(0, [{ id: "stale" }, { id: "also-stale" }])
        await Promise.all([first, second])

        expect(items.value).toEqual([{ id: "fresh" }])
        expect(itemsCount.value).toBe(1)
    })
})
