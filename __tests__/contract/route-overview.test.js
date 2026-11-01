import { describe, test, expect, afterEach } from "vitest"
import { DEFAULT_PAGESIZE } from "../../src/core/entities/abstractions"
import { runOn } from "./drivers"

// The overview's search in the URL: the first search keeps the view's defaults, a later empty query clears them,
// and a filter goes into the route as the API reads it.

class TicketSearchObject {
    open = true
    q = undefined
}

let mounted
afterEach(() => {
    mounted?.unmount?.()
    mounted = undefined
})

runOn(["core", "vue"], "route overview", (driver) => {
    const overview = async (url, searchObject) => (mounted = await driver.routeOverview({ url, searchObject }))

    describe("first search", () => {
        // The view hands the search view a search object with defaults (an overview of open tickets); the first search
        // keeps it while the URL carries no search parameters.
        test("a URL without search parameters keeps the view's defaults", async () => {
            const { searched } = await overview("/tickets", new TicketSearchObject())

            expect(searched).toHaveLength(1)
            expect(searched[0]).toBeInstanceOf(TicketSearchObject)
            expect(searched[0].open).toBe(true)
        })

        test("a URL with search parameters wins, as strings", async () => {
            const { searched } = await overview("/tickets?open=false&q=printer", new TicketSearchObject())

            expect(searched[0]).toEqual({ open: "false", q: "printer" })
        })

        test("a hash-only navigation (a tab selection) neither searches nor drops the defaults", async () => {
            const page = await overview("/tickets", new TicketSearchObject())

            await page.go("/tickets#board")

            expect(page.searched).toHaveLength(1)
            expect(page.searchObject()).toBeInstanceOf(TicketSearchObject)
        })

        test("clearing the filters later is not undone by the defaults", async () => {
            const page = await overview("/tickets?q=printer", new TicketSearchObject())

            await page.go("/tickets")

            expect(page.searched.at(-1)).toEqual({})
        })

        test("a URL without a page size searches with the default one", async () => {
            const page = await overview("/tickets", new TicketSearchObject())

            expect(page.pagingInfo()).toEqual({ page: 1, pageSize: DEFAULT_PAGESIZE })
        })

        test("leaving for another page searches nothing", async () => {
            const page = await overview("/tickets?q=printer", new TicketSearchObject())

            await page.go("/tickets/5?tab=history")

            expect(page.searched).toHaveLength(1)
        })
    })

    describe("route writes", () => {
        // a router coerces query values with String(), and ASP.NET Core's DateTime binder rejects
        // Date.prototype.toString() — a Date filter goes into the route as ISO-8601.
        test("a Date filter is written as ISO-8601 with its offset", async () => {
            const page = await overview("/tickets", { minCreated: new Date(2026, 6, 29, 7, 0, 0) })

            await page.view.call("updateOverviewRoute")
            await new Promise((resolve) => setTimeout(resolve))

            expect(page.query().minCreated).toMatch(/^2026-07-29T07:00:00\.000[+-]\d{2}:\d{2}$/)
            expect(page.searchObject().minCreated).toMatch(/^2026-07-29T07:00:00/)
        })

        test("each Date in a list is written as ISO-8601", async () => {
            const page = await overview("/tickets", { days: [new Date(2026, 6, 29, 7, 0, 0), new Date(2026, 6, 30, 7, 0, 0)] })

            await page.view.call("updateOverviewRoute")
            await new Promise((resolve) => setTimeout(resolve))

            expect(page.query().days).toHaveLength(2)
            expect(page.query().days[0]).toMatch(/^2026-07-29T07:00:00\.000[+-]\d{2}:\d{2}$/)
            expect(page.query().days[1]).toMatch(/^2026-07-30T07:00:00\.000[+-]\d{2}:\d{2}$/)
        })

        // a filter form hands the view a search object of its own: what else the URL carries, and its tab, stay
        test("a filter keeps the query parameters the search object does not hold, and the hash", async () => {
            const page = await overview("/tickets?view=board#list", new TicketSearchObject())

            page.filter({ q: "printer" })
            await page.view.call("updateOverviewRoute")
            await new Promise((resolve) => setTimeout(resolve))

            expect(page.query()).toEqual({ view: "board", q: "printer", pageSize: String(DEFAULT_PAGESIZE) })
            expect(page.fullPath()).toMatch(/#list$/)
        })

        test("an invalid Date is left out", async () => {
            const page = await overview("/tickets", { minCreated: new Date("nope"), q: "x" })

            await page.view.call("updateOverviewRoute")
            await new Promise((resolve) => setTimeout(resolve))

            expect(page.query().minCreated).toBeUndefined()
            expect(page.query().q).toBe("x")
        })

        test("a reset goes back to the first page and keeps the page size", async () => {
            const page = await overview("/tickets?page=3&pageSize=10", {})

            await page.view.call("updateOverviewRoute", true)
            await new Promise((resolve) => setTimeout(resolve))

            expect(page.query().page).toBeUndefined() // the first page is the default, so the URL leaves it out
            expect(page.query().pageSize).toBe("10")
        })
    })
})
