import { describe, test, expect } from "vitest"
import { setActivePinia, createPinia } from "pinia"
import { EntityServiceBase } from "../../../src/vue/entities/abstractions"
import { PoolService } from "../../../src/vue/entities/pooling/PoolService"
import { PoolCache } from "../../../src/vue/entities/pooling/PoolCache"

class Model {
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
class TestService extends EntityServiceBase {
    toEntity(item) {
        return Object.assign(new Model(), item)
    }
}
function makeService() {
    const calls = []
    const stored = { id: 7, statusId: 1, title: "Laptop" }
    const axios = {
        patch: async (url, body, config) => {
            calls.push({ url, body, contentType: config?.headers?.["Content-Type"] })
            return { data: { item: { ...stored, ...body }, isNew: false } }
        },
    }
    return { service: new TestService(axios, { key: "Asset", api: "/api/assets" }), calls }
}

describe("EntityServiceBase.patch", () => {
    test("sends only the changes as a merge patch to /{id} and answers the saved row", async () => {
        const { service, calls } = makeService()

        const saved = await service.patch(7, { statusId: 3 })

        expect(calls).toEqual([{ url: "/api/assets/7", body: { statusId: 3 }, contentType: "application/merge-patch+json" }])
        expect(saved).toBeInstanceOf(Model)
        expect([saved.statusId, saved.$title]).toEqual([3, "Laptop"])
    })

    test("refuses a row without an id instead of patching /0", async () => {
        const { service, calls } = makeService()

        await expect(service.patch(0, { statusId: 3 })).rejects.toThrow(/no id/)
        expect(calls).toEqual([])
    })

    test("the pooled service writes the saved row into the pool", async () => {
        setActivePinia(createPinia())
        const { service } = makeService()
        const cache = new PoolCache()
        const pool = new PoolService(service, cache, "Asset")
        const shown = pool.get(Object.assign(new Model(), { id: 7, statusId: 1, title: "Laptop" }))

        await pool.patch(7, { statusId: 3 })

        expect(shown.value.statusId).toBe(3)
    })
})
