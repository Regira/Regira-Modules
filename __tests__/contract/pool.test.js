import { test, expect } from "vitest"
import { EntityServiceBase } from "../../src/core/entities/abstractions"
import { runOn } from "./drivers"

// One box per entity, shared by every view that shows it: an edit in one view is the other's edit too.

class Product {
    constructor() {
        this.id = 0
        this.statusId = 1
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

/** an entity service over rows held in memory */
function memoryService(rows = []) {
    return {
        rows,
        toEntity: (item) => product(item),
        details: async (id) => rows.find((x) => x.id === id),
        list: async () => rows.slice(),
        search: async () => ({ items: rows.slice(), count: rows.length }),
        save: async (item) => ({ saved: { ...item, id: item.id || rows.length + 1 }, isNew: !item.id }),
        remove: async () => {},
    }
}

runOn(["core", "vue"], "pool", (driver) => {
    const pooled = (service = memoryService(), persistent) => driver.pool({ service, type: "Product", persistent })

    test("every view of an entity reads one box", () => {
        const pool = pooled()

        const first = pool.call("get", product({ id: 7, title: "Laptop" }))
        const second = pool.call("get", { id: 7, title: "Laptop (stale copy)" })

        expect(second).toBe(first)
        expect(first.value.$title).toBe("Laptop") // read-through: the cached instance wins over the input
    })

    test("fromPool hands back the pooled instance, its class intact", () => {
        const pool = pooled()
        pool.call("set", { id: 7, title: "Laptop" })

        const [item] = pool.call("fromPool", [{ id: 7 }])

        expect(item instanceof Product).toBe(true)
        expect([item.$id, item.$title]).toEqual([7, "Laptop"])
    })

    test("fromPool leaves a new entity out of the pool", () => {
        const pool = pooled()

        const item = pool.call("fromPool", { id: 0, title: "Draft" })

        expect(item.$title).toBe("Draft")
        expect(pool.call("fromCache")).toEqual([])
    })

    test("an edit through one view is the other view's edit", () => {
        const pool = pooled()
        const inList = pool.call("fromPool", [{ id: 7, title: "Laptop" }])[0]
        const inForm = pool.call("fromPool", { id: 7 })

        inForm.title = "Laptop Pro"

        expect(inList.$title).toBe("Laptop Pro")
    })

    test("a fetch refreshes the pooled box", async () => {
        const service = memoryService([{ id: 7, title: "Laptop" }])
        const pool = pooled(service)
        const shown = pool.call("get", product({ id: 7, title: "Laptop" }))

        service.rows[0] = { id: 7, title: "Laptop Pro" }
        await driver.settle(pool.call("list"))

        expect(shown.value.$title).toBe("Laptop Pro")
    })

    test("a save writes the saved row into the pool", async () => {
        const pool = pooled()
        const shown = pool.call("get", product({ id: 7, title: "Laptop" }))

        await driver.settle(pool.call("save", product({ id: 7, title: "Laptop Pro" })))

        expect(shown.value.$title).toBe("Laptop Pro")
        expect(pool.call("fromCache", 7)).toBe(shown)
    })

    test("a removed entity leaves the pool", async () => {
        const pool = pooled()
        pool.call("set", { id: 7, title: "Laptop" })

        await driver.settle(pool.call("remove", product({ id: 7 })))

        expect(pool.call("fromCache", 7)).toBeUndefined()
    })

    test("the pooled service's patch writes the saved row into the pool", async () => {
        const stored = { id: 7, statusId: 1, title: "Laptop" }
        const axios = { patch: async (url, body) => ({ data: { item: { ...stored, ...body }, isNew: false } }) }
        class AssetService extends EntityServiceBase {
            toEntity(item) {
                return product(item)
            }
        }
        const pool = pooled(new AssetService(axios, { key: "Asset", api: "/api/assets" }))
        const shown = pool.call("get", product(stored))

        await driver.settle(pool.call("patch", 7, { statusId: 3 }))

        expect(shown.value.statusId).toBe(3)
    })

    test("a persistent type survives the cache's cleanup", () => {
        const cache = driver.poolCache({ expires: 1 })
        const pool = driver.pool({ service: memoryService(), type: "Product", cache, persistent: true })
        pool.call("set", { id: 7, title: "Laptop" })

        cache.getEntityMap("Product").get(7).timestamp = 0 // expired long ago
        cache.cleanup()

        expect(pool.call("fromCache", 7)?.value.$title).toBe("Laptop")
    })

    test("an expired row of another type is dropped", () => {
        const cache = driver.poolCache({ expires: 1 })
        const pool = driver.pool({ service: memoryService(), type: "Product", cache })
        pool.call("set", { id: 7, title: "Laptop" })

        cache.getEntityMap("Product").get(7).timestamp = 0
        cache.cleanup()

        expect(pool.call("fromCache", 7)).toBeUndefined()
    })
})
