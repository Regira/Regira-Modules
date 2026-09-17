import { describe, test, expect } from "vitest"
import { createApp, defineComponent, h, nextTick, ref } from "vue"
import { createRouter, createMemoryHistory } from "vue-router"
import { useRouteOverview } from "../../../src/vue/entities/overview/route-overview"

class TicketSearchObject {
    open = true
    q = undefined
}

async function mountOverview(url, searchObject) {
    const router = createRouter({
        history: createMemoryHistory(),
        routes: [{ path: "/tickets", name: "tickets", component: { render: () => null } }],
    })
    router.push(url)
    await router.isReady()

    const searched = []
    const so = ref(searchObject)
    const pagingInfo = ref({ page: 1, pageSize: 10 })
    let overview = null
    const app = createApp(
        defineComponent({
            setup() {
                overview = useRouteOverview({ searchObject: so, pagingInfo, handler: async () => searched.push(so.value) })
                return () => h("div")
            },
        })
    )
    app.use(router)
    app.mount(document.createElement("div"))
    await nextTick()
    return { router, so, searched, overview: () => overview }
}

const settle = () => new Promise((resolve) => setTimeout(resolve))

describe("useRouteOverview first search", () => {
    // The view hands useSearchView a search object with defaults (an overview of open tickets); the first search
    // keeps it while the URL carries no search parameters.
    test("a URL without search parameters keeps the view's defaults", async () => {
        const { searched } = await mountOverview("/tickets", new TicketSearchObject())

        expect(searched).toHaveLength(1)
        expect(searched[0]).toBeInstanceOf(TicketSearchObject)
        expect(searched[0].open).toBe(true)
    })

    test("a URL with search parameters wins, as strings", async () => {
        const { searched } = await mountOverview("/tickets?open=false&q=printer", new TicketSearchObject())

        expect(searched[0]).toEqual({ open: "false", q: "printer" })
    })

    test("a hash-only navigation (a tab selection) neither searches nor drops the defaults", async () => {
        const { router, so, searched } = await mountOverview("/tickets", new TicketSearchObject())

        await router.push("/tickets#board")
        await settle()

        expect(searched).toHaveLength(1)
        expect(so.value).toBeInstanceOf(TicketSearchObject)
    })

    test("clearing the filters later is not undone by the defaults", async () => {
        const { router, searched } = await mountOverview("/tickets?q=printer", new TicketSearchObject())

        await router.push("/tickets")
        await settle()

        expect(searched.at(-1)).toEqual({})
    })
})

describe("useRouteOverview route writes", () => {
    // vue-router coerces query values with String(), and ASP.NET Core's DateTime binder rejects
    // Date.prototype.toString() — a Date filter goes into the route as ISO-8601.
    test("a Date filter is written as ISO-8601 with its offset", async () => {
        const { router, so, overview } = await mountOverview("/tickets", { minCreated: new Date(2026, 6, 29, 7, 0, 0) })

        overview().updateOverviewRoute()
        await settle()

        expect(router.currentRoute.value.query.minCreated).toMatch(/^2026-07-29T07:00:00\.000[+-]\d{2}:\d{2}$/)
        expect(so.value.minCreated).toMatch(/^2026-07-29T07:00:00/)
    })

    test("an invalid Date is left out", async () => {
        const { router, overview } = await mountOverview("/tickets", { minCreated: new Date("nope"), q: "x" })

        overview().updateOverviewRoute()
        await settle()

        expect(router.currentRoute.value.query.minCreated).toBeUndefined()
        expect(router.currentRoute.value.query.q).toBe("x")
    })
})
