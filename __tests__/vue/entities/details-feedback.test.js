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

        expect(details().feedback.status.value).toBe(FeedbackStatus.failed)
    })

    test("a successful retry clears the previous failure", async () => {
        let fail = true
        const { details } = await mountDetails(
            makeService(() => (fail ? Promise.reject({ response: { status: 403 } }) : Promise.resolve({ id: 7 })))
        )
        await flush()
        expect(details().feedback.status.value).toBe(FeedbackStatus.failed)

        fail = false
        await details().load()

        expect(details().feedback.status.value).toBe(FeedbackStatus.none)
        expect(details().item.value).toEqual({ id: 7 })
    })

    test("a response-less failure (network/CORS) still reports instead of throwing out of the load", async () => {
        const { details } = await mountDetails(makeService(() => Promise.reject(new Error("Network Error"))))
        await flush()

        expect(details().feedback.status.value).toBe(FeedbackStatus.failed)
        expect(details().feedback.message.value).toContain("Network Error")
    })
})
