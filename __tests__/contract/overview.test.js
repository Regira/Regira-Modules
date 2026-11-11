import { describe, test, expect, vi, afterEach } from "vitest"
import { FeedbackStatus } from "../../src/core/feedback/feedback"
import { runOn } from "./drivers"
import { deferredService } from "./services"

// Two fetches really do overlap: the route overview fetches on mount while the slice's login/refresh reload
// hook searches again, and a filter change or fast paging does the same. Whichever settled LAST used to
// win — and the bad ordering is the common one, the earlier fetch 401'ing after the later one succeeded.

afterEach(() => vi.restoreAllMocks())

runOn(["core", "vue"], "overview", (driver) => {
    describe("overlapping searches", () => {
        test("a slower earlier search does not overwrite the newer result", async () => {
            const service = deferredService("search")
            const view = driver.searchView({ service, searchObject: {} })

            const first = view.call("searchHandler")
            const second = view.call("searchHandler")
            service.resolveWith(1, { items: [{ id: "fresh" }], count: 1 })
            service.resolveWith(0, { items: [{ id: "stale" }], count: 99 })
            await driver.settle(first, second)

            expect(view.read("items")).toEqual([{ id: "fresh" }])
            expect(view.read("itemsCount")).toBe(1)
        })

        test("a superseded failure leaves no banner over the data that did load", async () => {
            // feedback.fail() does not auto-hide, so the 401 arriving late used to sit on top of the rows.
            vi.spyOn(console, "error").mockImplementation(() => {})
            const service = deferredService("search")
            const view = driver.searchView({ service, searchObject: {} })

            const first = view.call("searchHandler")
            const second = view.call("searchHandler")
            service.resolveWith(1, { items: [{ id: "fresh" }], count: 1 })
            service.rejectWith(0, { response: { status: 401 } })
            await driver.settle(first, second)

            expect(view.read("feedback.status")).toBe(FeedbackStatus.none)
            expect(view.read("items")).toEqual([{ id: "fresh" }])
        })

        test("the spinner stays up until the newest search settles", async () => {
            const service = deferredService("search")
            const view = driver.searchView({ service, searchObject: {} })

            const first = view.call("searchHandler")
            const second = view.call("searchHandler")
            service.resolveWith(0, { items: [], count: 0 }) // the superseded one lands first
            await driver.settle(first)
            expect(view.read("isLoading")).toBe(true)

            service.resolveWith(1, { items: [{ id: "fresh" }], count: 1 })
            await driver.settle(second)
            expect(view.read("isLoading")).toBe(false)
        })

        test("a lone failing search still reports", async () => {
            vi.spyOn(console, "error").mockImplementation(() => {})
            const service = deferredService("search")
            const view = driver.searchView({ service, searchObject: {} })

            const only = view.call("searchHandler")
            service.rejectWith(0, { response: { status: 500, data: { errors: { q: "invalid" } } } })
            await driver.settle(only)

            expect(view.read("feedback.status")).toBe(FeedbackStatus.failed)
            expect(view.read("feedback.error")).toEqual({ q: "invalid" })
        })

        test("a network failure reports the exception's own text", async () => {
            vi.spyOn(console, "error").mockImplementation(() => {})
            const service = deferredService("search")
            const view = driver.searchView({ service, searchObject: {} })

            const only = view.call("searchHandler")
            service.rejectWith(0, new Error("Network Error"))
            await driver.settle(only)

            expect(view.read("feedback.message")).toBe("fetching data failed: Network Error")
        })
    })

    // The two views are a fetch-shape choice and nothing else — same inputs, same overview surface — so the list
    // view has to send the same search object and settle overlapping fetches the same way.
    describe("list view", () => {
        /** records what reached service.list() */
        function recordingService() {
            const calls = []
            return { calls, list: async (so) => (calls.push(so), []) }
        }

        test("sends the search object, not paging alone", async () => {
            const service = recordingService()
            const view = driver.listView({ service, searchObject: { q: "widget" }, defaultPageSize: 20 })

            await driver.settle(view.call("listHandler"))

            expect(service.calls[0]).toMatchObject({ q: "widget", page: 1, pageSize: 20 })
        })

        test("follows the search object the view writes, not the one it was constructed with", async () => {
            // what Filter.vue and useRouteOverview do — they write the box the controller handed back
            const service = recordingService()
            const view = driver.listView({ service, searchObject: { q: "widget" } })

            view.write("searchObject", { q: "gadget" })
            await driver.settle(view.call("listHandler"))

            expect(service.calls[0]).toMatchObject({ q: "gadget" })
        })

        test("a slower earlier list does not overwrite the newer result", async () => {
            const service = deferredService("list")
            const view = driver.listView({ service, searchObject: {} })

            const first = view.call("listHandler")
            const second = view.call("listHandler")
            service.resolveWith(1, [{ id: "fresh" }])
            service.resolveWith(0, [{ id: "stale" }, { id: "also-stale" }])
            await driver.settle(first, second)

            expect(view.read("items")).toEqual([{ id: "fresh" }])
            expect(view.read("itemsCount")).toBe(1)
        })
    })

    // The same invariant, one step further: a save or a delete writes the same isLoading/feedback the fetch
    // handlers do, and the two overlap in both directions — a row saved while a filter change is still
    // fetching, a list refreshed while a delete is in flight. They share one counter, so whichever call is
    // newest owns the shared state; each caller's own return value is delivered either way, because the list
    // update (handleSave/handleRemove) has to happen whatever else is on the wire.
    describe("saves and deletes settling against an in-flight fetch", () => {
        test("a save that settles mid-search does not clear the spinner the search owns", async () => {
            const service = deferredService("search", "save")
            const view = driver.searchView({ service, searchObject: {} })

            const save = view.call("applySave", { $id: "1", $title: "chair" })
            const search = view.call("searchHandler")
            service.resolveWith(0, { saved: { $id: "1" }, isNew: false }) // the save lands first
            await driver.settle(save)
            expect(view.read("isLoading")).toBe(true) // the search still owns it

            service.resolveWith(1, { items: [{ $id: "1" }], count: 1 })
            await driver.settle(search)
            expect(view.read("isLoading")).toBe(false)
        })

        test("a superseded save still returns its result, so the row is applied to the list", async () => {
            const service = deferredService("search", "save")
            const view = driver.searchView({ service, searchObject: {} })

            const save = view.call("applySave", { $id: "1", $title: "chair" })
            const search = view.call("searchHandler")
            service.resolveWith(0, { saved: { $id: "1", $title: "chair" }, isNew: false })
            service.resolveWith(1, { items: [], count: 0 })

            expect(await save).toEqual({ saved: { $id: "1", $title: "chair" }, isNew: false })
            await driver.settle(search)
        })

        test("a save that starts while a list fetch runs does not drop the fetched rows", async () => {
            // the save takes the core's turn, so the fetch used to return without writing: the previous filter's rows stayed
            const service = deferredService("list", "save")
            const view = driver.listView({ service, searchObject: {} })

            const list = view.call("listHandler")
            const save = view.call("applySave", { $id: "1", $title: "chair" })
            service.resolveWith(0, [{ $id: "1" }, { $id: "2" }])
            await driver.settle(list)
            expect(view.read("items")).toEqual([{ $id: "1" }, { $id: "2" }])
            expect(view.read("isLoading")).toBe(true) // the save owns the spinner now

            service.resolveWith(1, { saved: { $id: "1" }, isNew: false })
            await driver.settle(save)
            expect(view.read("isLoading")).toBe(false)
        })

        test("a superseded delete leaves no banner over the rows that did load", async () => {
            // feedback.fail() does not auto-hide — a 409 landing after the list refreshed used to sit on top
            vi.spyOn(console, "error").mockImplementation(() => {})
            const service = deferredService("list", "remove")
            const view = driver.listView({ service, searchObject: {} })

            const remove = view.call("applyRemove", { $id: "1", $title: "chair" })
            const list = view.call("listHandler")
            service.rejectWith(0, { response: { status: 409 } })
            service.resolveWith(1, [{ $id: "1" }])
            const removed = await remove
            await driver.settle(list)

            expect(removed).toBe(false) // the caller still learns the delete failed, and keeps the row
            expect(view.read("feedback.status")).toBe(FeedbackStatus.none)
            expect(view.read("items")).toEqual([{ $id: "1" }])
            expect(view.read("isLoading")).toBe(false)
        })

        test("a lone failing delete still reports", async () => {
            vi.spyOn(console, "error").mockImplementation(() => {})
            const service = deferredService("remove")
            const view = driver.listView({ service, searchObject: {} })

            const only = view.call("applyRemove", { $id: "1", $title: "chair" })
            service.rejectWith(0, { response: { data: { errors: { id: "still referenced" } } } })

            expect(await only).toBe(false)
            expect(view.read("feedback.status")).toBe(FeedbackStatus.failed)
            expect(view.read("feedback.error")).toEqual({ id: "still referenced" })
            expect(view.read("isLoading")).toBe(false)
        })

        test("a lone save reports success", async () => {
            const service = deferredService("save")
            const view = driver.listView({ service, searchObject: {} })

            const only = view.call("applySave", { $id: "1", $title: "chair" })
            service.resolveWith(0, { saved: { $id: "1" }, isNew: true })
            await driver.settle(only)

            expect(view.read("feedback.status")).toBe(FeedbackStatus.success)
        })
    })

    // The result count and the paging read `itemsCount`, so a row removed or added in place moves it with the list:
    // a stale count is what an overview showed after a delete until the next fetch.
    describe("the count follows the rows", () => {
        const page = () => [
            { $id: "1", $title: "chair" },
            { $id: "2", $title: "table" },
        ]
        async function searched(count = 25) {
            const view = driver.searchView({ service: { search: async () => ({ items: page(), count }) }, searchObject: {} })
            await driver.settle(view.call("searchHandler"))
            return view
        }

        test("a removed row lowers the search total once", async () => {
            const view = await searched()

            view.call("handleRemove", { $id: "1" })

            expect(view.read("items").map((x) => x.$id)).toEqual(["2"])
            expect(view.read("itemsCount")).toBe(24)
        })

        test("a delete applied the guarded way counts once: applyRemove leaves the count to handleRemove", async () => {
            const view = driver.searchView({
                service: { search: async () => ({ items: page(), count: 25 }), remove: async () => {} },
                searchObject: {},
            })
            await driver.settle(view.call("searchHandler"))

            const row = view.read("items")[0]
            if (await view.call("applyRemove", row)) view.call("handleRemove", row)

            expect(view.read("itemsCount")).toBe(24)
        })

        test("a row the list does not hold leaves the count alone", async () => {
            const view = await searched()

            view.call("handleRemove", { $id: "elsewhere" })

            expect(view.read("itemsCount")).toBe(25)
        })

        test("the count never drops below zero", async () => {
            const view = await searched(0)

            view.call("handleRemove", { $id: "1" })

            expect(view.read("itemsCount")).toBe(0)
        })

        test("a new row raises the count, an edited one does not", async () => {
            const view = await searched()

            view.call("handleSave", { saved: { $id: "3", $title: "lamp" }, isNew: true })
            view.call("handleSave", { saved: { $id: "1", $title: "armchair" }, isNew: false })

            expect(view.read("items").map((x) => x.$title)).toEqual(["armchair", "table", "lamp"])
            expect(view.read("itemsCount")).toBe(26)
        })

        test("a new row a later fetch already brought is replaced, not counted twice", async () => {
            const view = await searched()

            view.call("handleSave", { saved: { $id: "2", $title: "table" }, isNew: true })

            expect(view.read("items")).toHaveLength(2)
            expect(view.read("itemsCount")).toBe(25)
        })

        test("a save or a delete hands the list a new array", async () => {
            // what a box notices: an assignment, never an edit in place (the core's rule 3)
            const view = await searched()
            const before = view.read("items")

            view.call("handleSave", { saved: { $id: "3", $title: "lamp" }, isNew: true })
            const afterSave = view.read("items")
            view.call("handleRemove", { $id: "1" })

            expect(afterSave).not.toBe(before)
            expect(view.read("items")).not.toBe(afterSave)
        })

        test("the list view's count stays the rows' own length", async () => {
            const view = driver.listView({ service: { list: async () => page() }, searchObject: {} })
            await driver.settle(view.call("listHandler"))

            view.call("handleRemove", { $id: "1" })
            expect(view.read("itemsCount")).toBe(view.read("items").length)

            view.call("handleSave", { saved: { $id: "3", $title: "lamp" }, isNew: true })
            expect(view.read("itemsCount")).toBe(view.read("items").length)
            expect(view.read("itemsCount")).toBe(2)
        })

        test("before the first fetch nothing is counted", () => {
            const view = driver.searchView({ service: {}, searchObject: {} })

            view.call("handleSave", { saved: { $id: "1" }, isNew: true })
            view.call("handleRemove", { $id: "1" })

            expect(view.read("items")).toBeUndefined()
            expect(view.read("itemsCount")).toBeUndefined()
        })
    })

    describe("the overview core", () => {
        test("resetPage goes back to the first page and keeps the page size", () => {
            const view = driver.overviewCore({ service: {}, searchObject: {}, defaultPageSize: 30 })
            view.write("pagingInfo", { ...view.read("pagingInfo"), page: 4 })

            view.call("resetPage")

            expect(view.read("pagingInfo")).toMatchObject({ page: 1, pageSize: 30 })
        })
    })
})

// The Vue composables always report to a useFeedback() of their own; the core takes any sink (the core's rule 8).
runOn(["core"], "overview feedback sink", (driver) => {
    test("a feedback passed in is the one it reports to", async () => {
        const calls = []
        const feedback = { pending: () => {}, success: (msg) => calls.push(["success", msg]), fail: () => {}, reset: () => calls.push(["reset"]) }
        const view = driver.overviewCore({ service: { save: async (item) => ({ saved: item, isNew: false }) }, searchObject: {}, feedback })

        await driver.settle(view.call("applySave", { $id: "1", $title: "chair" }))

        expect(calls).toEqual([["reset"], ["success", "Saved chair"]])
    })
})
