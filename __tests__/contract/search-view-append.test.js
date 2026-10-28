import { test, expect } from "vitest"
import { runOn } from "./drivers"
import { heldService, pagedService } from "./services"

// A list that must not move while more loads: `append` adds the next page below the rows on screen instead of
// replacing them, and a refresh keeps every row that is already shown.

const flush = () => new Promise((resolve) => setTimeout(resolve))

runOn(["core", "vue"], "search view, append mode", (driver) => {
    const view = (service, pageSize = 25) => driver.searchView({ service, searchObject: {}, defaultPageSize: pageSize, append: true })
    const ids = (v) => v.read("items").map((x) => x.$id)

    test("loadMore adds the next page below the rows on screen until the count is reached", async () => {
        const service = pagedService()
        const v = view(service)

        await v.call("searchHandler", true)
        const firstRows = v.read("items").slice()
        await v.call("loadMore")
        expect(v.read("items")).toHaveLength(50)
        expect(v.read("items").slice(0, 25)).toEqual(firstRows) // the rows on screen stay where they were

        await v.call("loadMore")
        expect(ids(v)).toEqual(service.rows.map((x) => x.$id))
        expect(v.read("hasMore")).toBe(false)
    })

    test("a row removed since the last page does not hide the row that moved up", async () => {
        const service = pagedService()
        const v = view(service)
        await v.call("searchHandler", true)

        const removed = v.read("items")[3]
        service.rows.splice(3, 1)
        v.call("handleRemove", removed)
        await v.call("loadMore")

        expect(ids(v)).toEqual(service.rows.slice(0, 50).map((x) => x.$id))
    })

    test("a row the server dropped but the screen keeps does not hide the row that moved up", async () => {
        // the add-to-list screen keeps an added article on screen, marked, while the server's filter now leaves it out
        const service = pagedService()
        const v = view(service)
        await v.call("searchHandler", true)

        const kept = service.rows.splice(3, 1)[0]
        await v.call("loadMore")

        expect(ids(v)).toContain(26) // moved up into page 1 on the server
        expect(ids(v)).toContain(kept.$id)
        expect(new Set(ids(v)).size).toBe(v.read("items").length)
    })

    test("rows the screen keeps after the server dropped them do not end the list early", async () => {
        const service = pagedService()
        const v = view(service)
        await v.call("searchHandler", true)

        service.rows.splice(0, 10) // ten rows marked "bought" leave the server's result but stay on screen
        for (let page = 0; page < 10 && v.read("hasMore"); page++) await v.call("loadMore") // a regression fails, not hangs

        for (const row of service.rows) expect(ids(v)).toContain(row.$id)
        expect(v.read("items")).toHaveLength(60)
    })

    test("a row added on the server since the last fetch is not shown twice", async () => {
        const service = pagedService()
        const v = view(service)
        await v.call("searchHandler", true)

        service.rows.unshift({ $id: 100 }) // another shopper's new row sorts first
        await v.call("loadMore")

        expect(new Set(ids(v)).size).toBe(v.read("items").length)
        for (const row of service.rows.slice(0, 50)) expect(ids(v)).toContain(row.$id)
    })

    test("a refresh fetches every page on screen again, past the API's page size cap", async () => {
        const service = pagedService(200, 100)
        const v = view(service, 50)
        await v.call("searchHandler", true)
        await v.call("loadMore")
        await v.call("loadMore")

        await v.call("searchHandler")

        expect(v.read("items")).toHaveLength(150)
        expect(service.requests.slice(-3)).toEqual([
            { page: 1, pageSize: 50 },
            { page: 2, pageSize: 50 },
            { page: 3, pageSize: 50 },
        ])
    })

    test("loadMore during a search does nothing, and the search lands", async () => {
        const service = heldService()
        const v = view(service)
        const first = v.call("searchHandler", true)
        service.release()
        await first

        const search = v.call("searchHandler", true)
        const more = v.call("loadMore")
        expect(service.waiting).toBe(1) // the search's request only
        service.release()
        await driver.settle(search, more)

        expect(ids(v)).toEqual(service.rows.slice(0, 25).map((x) => x.$id))
    })

    test("a new search drops a page that settles after it, and the next loadMore is a fetch of its own", async () => {
        const service = heldService()
        const v = view(service)
        const first = v.call("searchHandler", true)
        service.release()
        await first

        const stale = v.call("loadMore") // waits on its first request
        const search = v.call("searchHandler", true)
        service.release() // the stale page
        service.release() // the search
        await search
        const fresh = v.call("loadMore")
        expect(fresh).not.toBe(stale)
        while (service.waiting) {
            service.release()
            await flush()
        }
        await driver.settle(stale, fresh)

        expect(ids(v)).toEqual(service.rows.slice(0, 50).map((x) => x.$id))
    })

    test("a row removed from the last page fetched does not end the list before the row that moved up", async () => {
        const service = pagedService(51)
        const v = view(service)
        await v.call("searchHandler", true)
        await v.call("loadMore")

        const removed = v.read("items")[30]
        service.rows.splice(30, 1)
        v.call("handleRemove", removed) // the screen's count drops to 50, which two pages of 25 already cover
        expect(v.read("hasMore")).toBe(true) // the server's page 2 now ends with row 51, which the screen has not seen
        await v.call("loadMore")

        expect(ids(v)).toContain(51)
        expect(v.read("hasMore")).toBe(false)
    })

    for (const append of [true, false]) {
        test(`a save while a search runs does not keep the previous filter's rows (append: ${append})`, async () => {
            const rows = Array.from({ length: 40 }, (_, i) => ({ $id: i + 1, $title: `row ${i + 1}`, tag: i % 2 ? "b" : "a" }))
            const held = []
            const service = {
                search: (so) =>
                    new Promise((resolve) => {
                        const matching = rows.filter((x) => x.tag === so.tag)
                        const start = (so.page - 1) * so.pageSize
                        held.push(() => resolve({ items: matching.slice(start, start + so.pageSize), count: matching.length }))
                    }),
                save: async (item) => ({ saved: item, isNew: false }),
            }
            const v = driver.searchView({ service, searchObject: { tag: "a" }, defaultPageSize: 10, append })
            const first = v.call("searchHandler", true)
            held.shift()()
            await first

            v.write("searchObject", { ...v.read("searchObject"), tag: "b" })
            const search = v.call("searchHandler", true)
            await v.call("applySave", v.read("items")[0]) // a row of the list saved while the new filter's search runs
            held.shift()()
            await search

            expect(v.read("items").every((x) => x.tag === "b")).toBe(true)
        })
    }

    test("a second call while a page loads joins it", async () => {
        const service = pagedService()
        const v = view(service)
        await v.call("searchHandler", true)

        await driver.settle(v.call("loadMore"), v.call("loadMore"))

        expect(v.read("items")).toHaveLength(50)
    })

    test("without append there is no more to load and a search replaces the page", async () => {
        const service = pagedService()
        const v = driver.searchView({ service, searchObject: {}, defaultPageSize: 25 })
        await v.call("searchHandler", true)

        await v.call("loadMore")

        expect(v.read("hasMore")).toBe(false)
        expect(v.read("items")).toHaveLength(25)
    })
})
