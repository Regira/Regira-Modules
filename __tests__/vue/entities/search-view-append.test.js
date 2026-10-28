import { describe, test, expect } from "vitest"
import { useSearchView } from "../../../src/vue/entities/overview/search-view"

// A list that must not move while more loads: `append` adds the next page below the rows on screen instead of
// replacing them, and a refresh keeps every row that is already shown.

/** 60 rows on a server that pages them (at most `maxPageSize` per request, as the API's MaxPageSize does) */
function pagedService(total = 60, maxPageSize = 100) {
    const rows = Array.from({ length: total }, (_, i) => ({ $id: i + 1 }))
    const requests = []
    return {
        rows,
        requests,
        search: async (so) => {
            requests.push({ page: so.page, pageSize: so.pageSize })
            const pageSize = Math.min(so.pageSize, maxPageSize)
            const start = (so.page - 1) * pageSize
            return { items: rows.slice(start, start + pageSize), count: rows.length }
        },
    }
}
/** the same server, but each request waits until the test releases it */
function heldService(total = 60) {
    const inner = pagedService(total)
    const held = []
    return {
        ...inner,
        search: (so) => new Promise((resolve) => held.push(() => inner.search(so).then(resolve))),
        release: () => held.shift()(),
        get waiting() {
            return held.length
        },
    }
}
const ids = (items) => items.value.map((x) => x.$id)
const view = (service, pageSize = 25) => useSearchView({ service, searchObject: {}, defaultPageSize: pageSize, append: true })
const flush = () => new Promise((resolve) => setTimeout(resolve))

describe("useSearchView({ append: true })", () => {
    test("loadMore adds the next page below the rows on screen until the count is reached", async () => {
        const service = pagedService()
        const { items, hasMore, searchHandler, loadMore } = view(service)

        await searchHandler(true)
        const firstRows = items.value.slice()
        await loadMore()
        expect(items.value).toHaveLength(50)
        expect(items.value.slice(0, 25)).toEqual(firstRows) // the rows on screen stay where they were

        await loadMore()
        expect(ids(items)).toEqual(service.rows.map((x) => x.$id))
        expect(hasMore.value).toBe(false)
    })

    test("a row removed since the last page does not hide the row that moved up", async () => {
        const service = pagedService()
        const { items, handleRemove, searchHandler, loadMore } = view(service)
        await searchHandler(true)

        const removed = items.value[3]
        service.rows.splice(3, 1)
        handleRemove(removed)
        await loadMore()

        expect(ids(items)).toEqual(service.rows.slice(0, 50).map((x) => x.$id))
    })

    test("a row the server dropped but the screen keeps does not hide the row that moved up", async () => {
        // the add-to-list screen keeps an added article on screen, marked, while the server's filter now leaves it out
        const service = pagedService()
        const { items, searchHandler, loadMore } = view(service)
        await searchHandler(true)

        const kept = service.rows.splice(3, 1)[0]
        await loadMore()

        expect(ids(items)).toContain(26) // moved up into page 1 on the server
        expect(ids(items)).toContain(kept.$id)
        expect(new Set(ids(items)).size).toBe(items.value.length)
    })

    test("rows the screen keeps after the server dropped them do not end the list early", async () => {
        const service = pagedService()
        const { items, hasMore, searchHandler, loadMore } = view(service)
        await searchHandler(true)

        service.rows.splice(0, 10) // ten rows marked "bought" leave the server's result but stay on screen
        while (hasMore.value) await loadMore()

        for (const row of service.rows) expect(ids(items)).toContain(row.$id)
        expect(items.value).toHaveLength(60)
    })

    test("a row added on the server since the last fetch is not shown twice", async () => {
        const service = pagedService()
        const { items, searchHandler, loadMore } = view(service)
        await searchHandler(true)

        service.rows.unshift({ $id: 100 }) // another shopper's new row sorts first
        await loadMore()

        expect(new Set(ids(items)).size).toBe(items.value.length)
        for (const row of service.rows.slice(0, 50)) expect(ids(items)).toContain(row.$id)
    })

    test("a refresh fetches every page on screen again, past the API's page size cap", async () => {
        const service = pagedService(200, 100)
        const { items, searchHandler, loadMore } = view(service, 50)
        await searchHandler(true)
        await loadMore()
        await loadMore()

        await searchHandler()

        expect(items.value).toHaveLength(150)
        expect(service.requests.slice(-3)).toEqual([
            { page: 1, pageSize: 50 },
            { page: 2, pageSize: 50 },
            { page: 3, pageSize: 50 },
        ])
    })

    test("loadMore during a search does nothing, and the search lands", async () => {
        const service = heldService()
        const { items, searchHandler, loadMore } = view(service)
        const first = searchHandler(true)
        service.release()
        await first

        const search = searchHandler(true)
        const more = loadMore()
        expect(service.waiting).toBe(1) // the search's request only
        service.release()
        await Promise.all([search, more])

        expect(ids(items)).toEqual(service.rows.slice(0, 25).map((x) => x.$id))
    })

    test("a new search drops a page that settles after it, and the next loadMore is a fetch of its own", async () => {
        const service = heldService()
        const { items, searchHandler, loadMore } = view(service)
        const first = searchHandler(true)
        service.release()
        await first

        const stale = loadMore() // waits on its first request
        const search = searchHandler(true)
        service.release() // the stale page
        service.release() // the search
        await search
        const fresh = loadMore()
        expect(fresh).not.toBe(stale)
        while (service.waiting) {
            service.release()
            await flush()
        }
        await Promise.all([stale, fresh])

        expect(ids(items)).toEqual(service.rows.slice(0, 50).map((x) => x.$id))
    })

    test("a row removed from the last page fetched does not end the list before the row that moved up", async () => {
        const service = pagedService(51)
        const { items, hasMore, handleRemove, searchHandler, loadMore } = view(service)
        await searchHandler(true)
        await loadMore()

        const removed = items.value[30]
        service.rows.splice(30, 1)
        handleRemove(removed) // the screen's count drops to 50, which two pages of 25 already cover
        expect(hasMore.value).toBe(true) // the server's page 2 now ends with row 51, which the screen has not seen
        await loadMore()

        expect(ids(items)).toContain(51)
        expect(hasMore.value).toBe(false)
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
            const { items, searchObject, applySave, searchHandler } = useSearchView({ service, searchObject: { tag: "a" }, defaultPageSize: 10, append })
            const first = searchHandler(true)
            held.shift()()
            await first

            searchObject.value.tag = "b"
            const search = searchHandler(true)
            await applySave(items.value[0]) // a row of the list saved while the new filter's search runs
            held.shift()()
            await search

            expect(items.value.every((x) => x.tag === "b")).toBe(true)
        })
    }

    test("a second call while a page loads joins it", async () => {
        const service = pagedService()
        const { items, searchHandler, loadMore } = view(service)
        await searchHandler(true)

        await Promise.all([loadMore(), loadMore()])

        expect(items.value).toHaveLength(50)
    })

    test("without append there is no more to load and a search replaces the page", async () => {
        const service = pagedService()
        const { items, hasMore, searchHandler, loadMore } = useSearchView({ service, searchObject: {}, defaultPageSize: 25 })
        await searchHandler(true)

        await loadMore()

        expect(hasMore.value).toBe(false)
        expect(items.value).toHaveLength(25)
    })
})
