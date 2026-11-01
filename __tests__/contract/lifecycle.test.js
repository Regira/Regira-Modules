import { test, expect, vi, afterEach } from "vitest"
import { runOn } from "./drivers"

// The lifecycle scenarios (Phase 1, step 11): what a mounted view does over its life. Vue alone never needed them;
// they pin its behaviour before React arrives, and `react` joins the drivers in Phase 2. Only a framework driver
// mounts, so the core driver is not listed.

class Product {
    constructor() {
        this.id = 0
        this.title = ""
    }
    get $id() {
        return this.id
    }
    get $title() {
        return this.title
    }
}
const product = (values) => Object.assign(new Product(), values)

/** a service whose calls wait until the test settles them, and which counts them */
function heldService() {
    const calls = { details: [], search: [] }
    return {
        calls,
        details: (id) => new Promise((resolve, reject) => calls.details.push({ id, resolve, reject })),
        search: (so) => new Promise((resolve, reject) => calls.search.push({ so, resolve, reject })),
        newEntity: async () => product({}),
        toEntity: product,
    }
}
const flush = () => new Promise((resolve) => setTimeout(resolve))

let mounted
afterEach(() => {
    mounted?.unmount()
    mounted = undefined
    vi.restoreAllMocks()
})

runOn(["vue"], "lifecycle", (driver) => {
    test("a details page fetches once per mount, and shows what it fetched", async () => {
        const service = heldService()
        mounted = await driver.mount.details({ service, path: "/things/7" })
        await flush()

        expect(service.calls.details.map((call) => call.id)).toEqual(["7"])
        service.calls.details[0].resolve(product({ id: 7, title: "Laptop" }))
        await flush()

        expect(mounted.text()).toBe("Laptop")
    })

    test("a route overview searches once per mount", async () => {
        const service = heldService()
        mounted = await driver.mount.routeOverview({ service })
        await flush()

        expect(service.calls.search).toHaveLength(1)
        service.calls.search[0].resolve({ items: [product({ id: 1, title: "Chair" })], count: 1 })
        await flush()

        expect(mounted.text()).toBe("Chair")
    })

    test("a load that settles after unmount re-renders nothing and warns nothing", async () => {
        const warnings = vi.spyOn(console, "warn")
        const errors = vi.spyOn(console, "error")
        const service = heldService()
        const page = await driver.mount.details({ service, path: "/things/7" })
        await flush()
        expect(service.calls.details).toHaveLength(1) // in flight when the page goes
        page.unmount()
        const renders = page.renders()

        service.calls.details[0].resolve(product({ id: 7, title: "Laptop" }))
        await flush()

        expect(page.renders()).toBe(renders)
        expect(warnings).not.toHaveBeenCalled()
        expect(errors).not.toHaveBeenCalled()
    })

    test("two views of one pooled entity: an edit in one shows in the other, and only there", async () => {
        const pool = driver.pool({ service: { toEntity: product }, type: "Product" })
        pool.call("set", { id: 7, title: "Laptop" })
        pool.call("set", { id: 8, title: "Mouse" })
        mounted = await driver.mount.pooled({ pool: pool.raw, ids: [7, 7, 8] })
        const before = mounted.renders()

        mounted.edit(0, (item) => (item.title = "Laptop Pro"))
        await mounted.settle()

        expect(mounted.text()).toBe("Laptop ProLaptop ProMouse")
        const after = mounted.renders()
        expect(after[1]).toBeGreaterThan(before[1])
        expect(after[2]).toBe(before[2])
    })

    test("a form's edits keep the entity's class, before a save and after it", async () => {
        const service = {
            toEntity: product,
            save: async (item) => ({ saved: { id: item.id, title: item.title }, isNew: false }), // the server answers plain JSON
        }
        mounted = await driver.mount.form({ service, item: product({ id: 7, title: "Laptop" }) })

        mounted.edit((item) => (item.title = "Laptop Pro"))
        const edited = mounted.view.read("item")
        expect(edited instanceof Product).toBe(true)
        expect([edited.$id, edited.$title]).toEqual([7, "Laptop Pro"])

        await mounted.view.call("handleSubmit")
        const saved = mounted.view.read("item")
        expect(saved instanceof Product).toBe(true)
        expect([saved.$id, saved.$title]).toEqual([7, "Laptop Pro"])
    })

    test("two appends to an owned collection in the same tick keep both rows", async () => {
        mounted = await driver.mount.ownedCollection({ rows: [] })

        mounted.view.call("handleSave", { saved: product({ title: "first" }), isNew: true })
        mounted.view.call("handleSave", { saved: product({ title: "second" }), isNew: true })
        await mounted.settle()

        expect(mounted.collection().map((x) => x.$title)).toEqual(["first", "second"])
        expect(mounted.text()).toBe("first,second")
    })
})
