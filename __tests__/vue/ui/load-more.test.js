import { describe, test, expect, vi, beforeEach, afterEach } from "vitest"
import { createApp, h, nextTick, reactive } from "vue"

import LoadMore from "../../../src/vue/ui/paging/LoadMore.vue"

// jsdom has no IntersectionObserver: this one records what is observed and lets a test report an intersection
let observers
class FakeObserver {
    constructor(callback, options) {
        this.callback = callback
        this.options = options
        this.targets = new Set()
        observers.push(this)
    }
    observe(el) {
        this.targets.add(el)
    }
    unobserve(el) {
        this.targets.delete(el)
    }
    disconnect() {
        this.targets.clear()
        this.disconnected = true
    }
    intersect(isIntersecting = true) {
        this.callback([...this.targets].map((target) => ({ target, isIntersecting })))
    }
}

function mount(props, slots) {
    const host = document.createElement("div")
    document.body.appendChild(host)
    const app = createApp({ render: () => h(LoadMore, props, slots) })
    app.mount(host)
    return { host, app }
}

describe("LoadMore", () => {
    beforeEach(() => {
        observers = []
        globalThis.IntersectionObserver = FakeObserver
    })
    afterEach(() => {
        delete globalThis.IntersectionObserver
        document.body.innerHTML = ""
    })

    test("renders nothing without more rows", () => {
        const { host } = mount({ hasMore: false, load: vi.fn() })

        expect(host.querySelector(".rg-load-more")).toBeNull()
    })

    test("the sentinel scrolling into view loads the next page", async () => {
        const load = vi.fn()
        mount({ hasMore: true, load })
        await nextTick()

        observers[0].intersect()

        expect(load).toHaveBeenCalledTimes(1)
        expect(observers[0].options.rootMargin).toBe("200px")
    })

    test("a sentinel that leaves the view loads nothing", async () => {
        const load = vi.fn()
        mount({ hasMore: true, load })
        await nextTick()

        observers[0].intersect(false)

        expect(load).not.toHaveBeenCalled()
    })

    test("does not load again while a page is loading", async () => {
        let settle
        const load = vi.fn(() => new Promise((resolve) => (settle = resolve)))
        const { host } = mount({ hasMore: true, load })
        await nextTick()

        observers[0].intersect()
        observers[0].intersect()
        host.querySelector("button").click()

        expect(load).toHaveBeenCalledTimes(1)
        settle()
    })

    test("the button loads the next page and shows the label", async () => {
        const load = vi.fn()
        const { host } = mount({ hasMore: true, load, label: "Meer tonen" })

        expect(host.querySelector("button").textContent.trim()).toBe("Meer tonen")
        host.querySelector("button").click()

        expect(load).toHaveBeenCalledTimes(1)
    })

    test("a sentinel that appears once there are more rows is observed", async () => {
        const props = reactive({ hasMore: false, load: vi.fn() })
        mount(props)
        await nextTick()
        expect(observers[0].targets.size).toBe(0)

        props.hasMore = true
        await nextTick()

        expect(observers[0].targets.size).toBe(1)
    })

    // observing reports the position afresh, so a page shorter than the screen is followed by the next one
    test("a page that moved the sentinel observes it again; a load that added nothing does not", async () => {
        let top = 100
        const offsetTop = vi.spyOn(HTMLElement.prototype, "offsetTop", "get").mockImplementation(() => top)
        try {
            const load = vi.fn(async () => (top += 300))
            mount({ hasMore: true, load })
            await nextTick()
            const observe = vi.spyOn(observers[0], "observe")

            observers[0].intersect()
            await vi.waitFor(() => expect(observe).toHaveBeenCalledTimes(1))

            load.mockImplementation(async () => {}) // a failed fetch: nothing added, the sentinel stays put
            observers[0].intersect()
            await new Promise((resolve) => setTimeout(resolve))
            expect(observe).toHaveBeenCalledTimes(1)
        } finally {
            offsetTop.mockRestore()
        }
    })

    test("unmounting disconnects the observer", async () => {
        const { app } = mount({ hasMore: true, load: vi.fn() })
        await nextTick()

        app.unmount()

        expect(observers[0].disconnected).toBe(true)
    })

    test("without IntersectionObserver the button alone still loads", async () => {
        delete globalThis.IntersectionObserver
        const load = vi.fn()
        const { host } = mount({ hasMore: true, load })

        host.querySelector("button").click()

        expect(load).toHaveBeenCalledTimes(1)
    })
})
