import { describe, test, expect } from "vitest"
import { createApp, defineComponent, h } from "vue"
import { createRouter, createMemoryHistory } from "vue-router"
import { useDetails } from "../../../src/vue/entities/details"
import { FeedbackStatus } from "../../../src/vue/ui/feedback"

// The deep-link-while-anonymous shape: the details load fires before the token is there, fails, and the
// login hook retries it. Nothing else clears the failure, so the banner has to be reset by the load itself.
function mountDetails(service) {
    const router = createRouter({
        history: createMemoryHistory(),
        routes: [
            { path: "/things", name: "ThingOverview", component: { render: () => null } },
            { path: "/things/:id", name: "ThingForm", component: { render: () => null } },
        ],
    })

    let details = null
    const app = createApp(
        defineComponent({
            setup() {
                details = useDetails(service)
                return () => h("div")
            },
        })
    )
    app.use(router)

    return router.push("/things/7").then(() => {
        app.mount(document.createElement("div"))
        return { app, details: () => details }
    })
}

/** onMounted(setItem) is async — let its promise chain settle. */
const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

function makeService(behaviour) {
    return {
        details: async () => behaviour(),
        newEntity: async () => ({ id: 0 }),
    }
}

describe("useDetails feedback", () => {
    test("a failed load reports it", async () => {
        const { details } = await mountDetails(makeService(() => Promise.reject({ response: { status: 403 } })))
        await flush()

        expect(details().feedback.status).toBe(FeedbackStatus.failed)
    })

    test("a successful retry clears the previous failure", async () => {
        let fail = true
        const { details } = await mountDetails(
            makeService(() => (fail ? Promise.reject({ response: { status: 403 } }) : Promise.resolve({ id: 7 })))
        )
        await flush()
        expect(details().feedback.status).toBe(FeedbackStatus.failed)

        fail = false
        await details().load()

        expect(details().feedback.status).toBe(FeedbackStatus.none)
        expect(details().item.value).toEqual({ id: 7 })
    })

    test("a response-less failure (network/CORS) still reports instead of throwing out of the load", async () => {
        const { details } = await mountDetails(makeService(() => Promise.reject(new Error("Network Error"))))
        await flush()

        expect(details().feedback.status).toBe(FeedbackStatus.failed)
        expect(details().feedback.message).toContain("Network Error")
    })
})

/** a service whose loads you settle by hand, in whatever order the test needs */
function deferredService() {
    const pending = []
    return {
        details: () => new Promise((resolve, reject) => pending.push({ resolve, reject })),
        newEntity: async () => ({ id: 0 }),
        resolveWith: (index, result) => pending[index].resolve(result),
        rejectWith: (index, error) => pending[index].reject(error),
    }
}

// The retry above genuinely overlaps the load it retries whenever the first has not settled yet — the mount
// load is still in flight while the restored token fires the reload hook. Whichever settles LAST used to
// win, and the damaging ordering is the quiet one: the anonymous attempt's 401 lands after the retry
// already succeeded.
describe("useDetails overlapping loads", () => {
    test("a superseded failure does not paint its banner over the newer result", async () => {
        const service = deferredService()
        const { details } = await mountDetails(service) // mount starts load #0
        const d = details()

        d.load() // the reload hook starts load #1
        service.resolveWith(1, { id: 7 }) // newer succeeds…
        service.rejectWith(0, { response: { status: 401 } }) // …and the older 401 lands after it
        await flush()

        expect(d.item.value).toEqual({ id: 7 })
        expect(d.feedback.status).toBe(FeedbackStatus.none)
    })

    test("a superseded success does not overwrite the newer item", async () => {
        const service = deferredService()
        const { details } = await mountDetails(service)
        const d = details()

        d.load()
        service.resolveWith(1, { id: "fresh" })
        service.resolveWith(0, { id: "stale" })
        await flush()

        expect(d.item.value).toEqual({ id: "fresh" })
    })

    test("a superseded load leaves the spinner to the one that replaced it", async () => {
        const service = deferredService()
        const { details } = await mountDetails(service)
        const d = details()

        d.load()
        service.rejectWith(0, { response: { status: 401 } }) // the older one settles first, and alone
        await flush()

        expect(d.isLoading.value).toBe(true) // load #1 is still in flight
    })
})
