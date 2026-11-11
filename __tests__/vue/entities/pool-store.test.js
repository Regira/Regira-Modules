import { test, expect, beforeEach } from "vitest"
import { defineStore, setActivePinia, createPinia } from "pinia"
import { createStore, PoolCache } from "../../../src/vue/entities/pooling"

// The scaffold returns the pool handler from a Pinia setup store, so pinia hands out its `service` and `cache`
// as reactive proxies: every pooled call runs with `this` being a proxy, not the instance the core constructed.

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

function memoryService(rows) {
    return {
        toEntity: (item) => product(item),
        details: async (id) => rows.find((x) => x.id === id),
        list: async () => rows.slice(),
        search: async () => ({ items: rows.slice(), count: rows.length }),
        save: async (item) => ({ saved: item, isNew: false }),
        remove: async () => {},
    }
}

beforeEach(() => setActivePinia(createPinia()))

test("a pooled store in a pinia setup store reads through the pool", async () => {
    const rows = [product({ id: 1, title: "Laptop" }), product({ id: 2, title: "Mouse" })]
    const useStore = defineStore("Product", () => createStore(memoryService(rows), "Product"))
    const store = useStore()

    const listed = await store.service.list()
    const found = await store.service.search()

    expect(listed.map((x) => x.$title)).toEqual(["Laptop", "Mouse"])
    expect(found.items.map((x) => x.$title)).toEqual(["Laptop", "Mouse"])
    expect(store.fromCache(1)?.value.$title).toBe("Laptop")
})

test("a pool cache reached through a proxy still makes its boxes", () => {
    const cache = new PoolCache({ interval: 0 })
    const proxied = new Proxy(cache, {})

    const box = proxied.set(product({ id: 7, title: "Laptop" }))

    expect(box.value.$title).toBe("Laptop")
    expect(cache.get("Product", 7)).toBe(box)
})
