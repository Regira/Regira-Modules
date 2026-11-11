import { describe, test, expect, vi, beforeAll, afterEach } from "vitest"
import { createElement as h, StrictMode, act, useEffect, useState, useSyncExternalStore } from "react"
import { createRoot } from "react-dom/client"
import { createSearchView } from "../../src/core/entities/overview/search-view"
import { createPoolHandler } from "../../src/core/entities/pooling/pool"
import { PoolCache } from "../../src/core/entities/pooling/PoolCache"

// Phase 1, step 10 of proposals/react-alternative.md: a throwaway React layer over the same core, to settle whether a
// box that notifies is enough before more modules move. Phase 2 replaces these hooks with the real ones.

// ---- the throwaway layer --------------------------------------------------------------------------------------

const STORE = Symbol("store")

/** every store made, so a test can see who still listens */
const stores = []
/** a version and its listeners; every box it makes bumps the version on assignment */
function createStore() {
    let version = 0
    const listeners = new Set()
    const store = {
        subscribe: (listener) => (listeners.add(listener), () => listeners.delete(listener)),
        listening: () => listeners.size,
        getSnapshot: () => version,
        box(initial) {
            let current = initial
            return {
                [STORE]: store,
                get value() {
                    return current
                },
                set value(next) {
                    current = next
                    version++
                    listeners.forEach((listener) => listener())
                },
            }
        },
    }
    stores.push(store)
    return store
}
/** the pool's box factory: one store per entity, so an edit re-renders the views of that entity only */
const pooledBox = (initial) => createStore().box(initial)
const useStore = (store) => useSyncExternalStore(store.subscribe, store.getSnapshot)

/** a search view whose boxes share one store, created once per component and searched on mount */
function useSearchView(input) {
    const [{ store, view }] = useState(() => {
        const store = createStore()
        return { store, view: createSearchView({ ...input, box: store.box }) }
    })
    useStore(store)
    useEffect(() => {
        view.searchHandler(true)
    }, [view])
    return view
}

/** one pooled entity, and the way to edit it: in place, then re-assigned so every view of it hears */
function usePooledEntity(pool, item) {
    const box = pool.get(item)
    useStore(box[STORE])
    return [box.value, (change) => (change(box.value), (box.value = box.value))]
}

// ---- the scenarios --------------------------------------------------------------------------------------------

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

let container, root
beforeAll(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true
})
async function render(element) {
    container = document.createElement("div")
    root = createRoot(container)
    await act(async () => root.render(h(StrictMode, null, element)))
}
afterEach(async () => {
    await act(async () => root?.unmount())
    root = undefined
    vi.restoreAllMocks()
})

describe("React spike: a notifying box over the core [react]", () => {
    test("StrictMode's double mount fetches twice, and the newest search wins", async () => {
        const calls = []
        const service = { search: () => new Promise((resolve) => calls.push(resolve)) }
        function List() {
            const view = useSearchView({ service, searchObject: {} })
            return h(
                "ul",
                null,
                (view.items.value ?? []).map((x) => h("li", { key: x.$id }, x.$title))
            )
        }
        await render(h(List))

        expect(calls).toHaveLength(2) // mount, unmount, mount: one controller, two searches
        await act(async () => {
            calls[1]({ items: [{ $id: 1, $title: "fresh" }], count: 1 })
            calls[0]({ items: [{ $id: 9, $title: "stale" }], count: 1 }) // the first mount's search lands last
        })

        expect(container.textContent).toBe("fresh")
    })

    test("the spinner and the feedback a controller writes re-render the component", async () => {
        const calls = []
        const service = { search: () => new Promise((_, reject) => calls.push(reject)) }
        vi.spyOn(console, "error").mockImplementation(() => {})
        function List() {
            const view = useSearchView({ service, searchObject: {} })
            return h("p", null, view.isLoading.value ? "loading" : view.feedback.message.value)
        }
        await render(h(List))
        expect(container.textContent).toBe("loading")

        await act(async () => calls.forEach((reject) => reject(new Error("Network Error"))))

        expect(container.textContent).toBe("fetching data failed: Network Error")
    })

    test("two components share one pooled entity: an edit in one shows in the other, and only there", async () => {
        const pool = createPoolHandler({
            service: { toEntity: product },
            type: "Product",
            cache: new PoolCache({ box: pooledBox, interval: 0 }),
        })
        pool.set({ id: 7, title: "Laptop" })
        pool.set({ id: 8, title: "Mouse" })
        const renders = { 7: 0, 8: 0 }
        let edit, edited
        function Card({ id }) {
            const [item] = usePooledEntity(pool, product({ id }))
            renders[id]++
            return h("span", null, item.$title)
        }
        function Form() {
            const [item, update] = usePooledEntity(pool, product({ id: 7 }))
            edit = update
            edited = item
            return h("input", { value: item.title, readOnly: true })
        }
        await render(h("div", null, h(Card, { id: 7 }), h(Card, { id: 8 }), h(Form)))
        const before = { ...renders }

        await act(async () => edit((x) => (x.title = "Laptop Pro")))

        expect(container.textContent).toBe("Laptop ProMouse")
        expect(renders[7]).toBeGreaterThan(before[7])
        expect(renders[8]).toBe(before[8]) // another entity's view does not re-render
        // the class survives the edit: the form edited the pooled instance itself
        expect(edited instanceof Product).toBe(true)
        expect([edited.$id, edited.$title]).toEqual([7, "Laptop Pro"])
        expect(pool.fromPool({ id: 7 })).toBe(edited)
    })

    test("unmounting ends every subscription, so a search that settles later re-renders nothing", async () => {
        const calls = []
        const service = { search: () => new Promise((resolve) => calls.push(resolve)) }
        const errors = vi.spyOn(console, "error").mockImplementation(() => {})
        function List() {
            const view = useSearchView({ service, searchObject: {} })
            return h("p", null, String(view.items.value?.length ?? "-"))
        }
        await render(h(List))
        expect(calls.length).toBeGreaterThan(0) // a search is in flight when the component goes
        await act(async () => root.unmount())
        root = undefined

        await act(async () => calls.forEach((resolve) => resolve({ items: [{ $id: 1 }], count: 1 })))

        expect(stores.map((store) => store.listening())).toEqual(stores.map(() => 0))
        expect(errors).not.toHaveBeenCalled()
    })
})
