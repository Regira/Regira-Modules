import { describe, test, expect, vi, afterEach } from "vitest"
import { FeedbackStatus } from "../../src/core/feedback/feedback"
import { runOn } from "./drivers"
import { deferredService } from "./services"

// The deep-link-while-anonymous shape: the details load fires before the token is there, fails, and the
// login hook retries it. Nothing else clears the failure, so the banner has to be reset by the load itself.

/** a load's promise chain settles */
const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

function makeService(behaviour) {
    return { details: async () => behaviour(), newEntity: async () => ({ id: 0 }) }
}
const heldService = () => ({ ...deferredService("details"), newEntity: async () => ({ id: 0 }) })

let mounted
afterEach(() => {
    mounted?.unmount?.()
    mounted = undefined
    vi.restoreAllMocks()
})

runOn(["core", "vue"], "details", (driver) => {
    const page = async (service, id) => (mounted = await driver.details({ service, id }))
    const quiet = () => vi.spyOn(console, "error").mockImplementation(() => {})

    describe("feedback", () => {
        test("a failed load reports it", async () => {
            quiet()
            const { view } = await page(makeService(() => Promise.reject({ response: { status: 403 } })))
            await flush()

            expect(view.read("feedback.status")).toBe(FeedbackStatus.failed)
            expect(view.read("feedback.message")).toBe("Fetching item #7 failed: Not allowed")
        })

        test.each([
            ["a 404", { response: { status: 404 } }, "Not found"],
            ["a server error with a body", { response: { status: 500, data: "Database offline" } }, "Database offline"],
        ])("%s names its reason", async (_, failure, reason) => {
            quiet()
            const { view } = await page(makeService(() => Promise.reject(failure)))
            await flush()

            expect(view.read("feedback.message")).toBe(`Fetching item #7 failed: ${reason}`)
        })

        test("a successful retry clears the previous failure", async () => {
            quiet()
            let fail = true
            const { view } = await page(makeService(() => (fail ? Promise.reject({ response: { status: 403 } }) : Promise.resolve({ id: 7 }))))
            await flush()
            expect(view.read("feedback.status")).toBe(FeedbackStatus.failed)

            fail = false
            await view.call("load")

            expect(view.read("feedback.status")).toBe(FeedbackStatus.none)
            expect(view.read("item")).toEqual({ id: 7 })
        })

        test("a response-less failure (network/CORS) still reports instead of throwing out of the load", async () => {
            quiet()
            const { view } = await page(makeService(() => Promise.reject(new Error("Network Error"))))
            await flush()

            expect(view.read("feedback.status")).toBe(FeedbackStatus.failed)
            expect(view.read("feedback.message")).toContain("Network Error")
        })

        test("`new` makes a new entity instead of fetching one", async () => {
            const { view } = await page({ details: () => Promise.reject(new Error("fetched")), newEntity: async () => ({ id: 0 }) }, "new")
            await flush()

            expect(view.read("isNew")).toBe(true)
            expect(view.read("item")).toEqual({ id: 0 })
            expect(view.read("isLoading")).toBe(false)
        })
    })

    // The retry above genuinely overlaps the load it retries whenever the first has not settled yet — the mount
    // load is still in flight while the restored token fires the reload hook. Whichever settles LAST used to
    // win, and the damaging ordering is the quiet one: the anonymous attempt's 401 lands after the retry
    // already succeeded.
    describe("overlapping loads", () => {
        test("a superseded failure does not paint its banner over the newer result", async () => {
            quiet()
            const service = heldService()
            const { view } = await page(service) // mount starts load #0

            view.call("load") // the reload hook starts load #1
            service.resolveWith(1, { id: 7 }) // newer succeeds…
            service.rejectWith(0, { response: { status: 401 } }) // …and the older 401 lands after it
            await flush()

            expect(view.read("item")).toEqual({ id: 7 })
            expect(view.read("feedback.status")).toBe(FeedbackStatus.none)
        })

        test("a superseded success does not overwrite the newer item", async () => {
            const service = heldService()
            const { view } = await page(service)

            view.call("load")
            service.resolveWith(1, { id: "fresh" })
            service.resolveWith(0, { id: "stale" })
            await flush()

            expect(view.read("item")).toEqual({ id: "fresh" })
        })

        test("a superseded load leaves the spinner to the one that replaced it", async () => {
            quiet()
            const service = heldService()
            const { view } = await page(service)

            view.call("load")
            service.rejectWith(0, { response: { status: 401 } }) // the older one settles first, and alone
            await flush()

            expect(view.read("isLoading")).toBe(true) // load #1 is still in flight
        })

        test("switching to `new` mid-fetch clears the spinner the superseded fetch raised", async () => {
            quiet()
            const service = heldService()
            const details = await page(service) // mount starts load #0
            expect(details.view.read("isLoading")).toBe(true)

            details.go("new") // the route change starts load #1, down the `new` path
            await flush()
            service.rejectWith(0, { response: { status: 401 } }) // load #0 settles behind it, and skips its guarded finally
            await flush()

            expect(details.view.read("item")).toEqual({ id: 0 })
            expect(details.view.read("isLoading")).toBe(false) // nothing is in flight any more
        })

        test("a superseded new entity does not overwrite the newer one", async () => {
            const service = { details: () => Promise.reject(new Error("fetched")), ...deferredService("newEntity") }
            const details = await page(service, "new") // mount starts load #0

            details.view.call("load") // load #1
            service.resolveWith(1, { id: 0, title: "fresh" })
            service.resolveWith(0, { id: 0, title: "stale" })
            await flush()

            expect(details.view.read("item")).toEqual({ id: 0, title: "fresh" })
        })
    })

    describe("navigation", () => {
        test("leaving for another page loads nothing", async () => {
            const loads = []
            const details = await page({ details: async (id) => (loads.push(id), { id }), newEntity: async () => ({ id: 0 }) })
            await flush()

            details.leave()
            await flush()

            expect(loads).toEqual(["7"])
        })

        test("another id on the same page loads again; leaving `new` for the saved id does not", async () => {
            const loads = []
            const service = { details: async (id) => (loads.push(id), { id }), newEntity: async () => ({ id: 0 }) }
            const details = await page(service, "new")
            await flush()

            details.go("9") // a new entity's form, saved: the page moves to its id and keeps the item it has
            await flush()
            details.go("10")
            await flush()

            expect(loads).toEqual(["10"])
        })
    })
})
