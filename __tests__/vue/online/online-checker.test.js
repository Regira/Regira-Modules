import { test, expect, vi, beforeEach, afterEach } from "vitest"
import { createApp, defineComponent, h } from "vue"

// One ref for the whole app: the plugin's, a component's and a service's outside setup are the same, it follows the
// browser's online and offline events, and an app may set it itself. Each test imports the module afresh.
let online
beforeEach(async () => {
    vi.resetModules()
    online = await import("../../../src/vue/online")
})
afterEach(() => {
    vi.restoreAllMocks()
})

test("importing the module wires nothing", async () => {
    vi.resetModules()
    const listen = vi.spyOn(window, "addEventListener")

    const module = await import("../../../src/vue/online")

    expect(listen).not.toHaveBeenCalled()
    module.useOnlineChecker()
    expect(listen.mock.calls.map(([name]) => name)).toEqual(["offline", "online"])
})

test("outside setup every call returns the same ref, which follows the browser", () => {
    const { isOnline } = online.useOnlineChecker()
    expect(online.useOnlineChecker().isOnline).toBe(isOnline)

    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false)
    window.dispatchEvent(new Event("offline"))

    expect(isOnline.value).toBe(false)
})

test("the plugin provides that same ref, and an app may set it", () => {
    let inSetup
    const app = createApp(
        defineComponent({
            setup() {
                inSetup = online.useOnlineChecker().isOnline
                return () => h("div")
            },
        })
    )
    app.use(online.plugin)
    app.mount(document.createElement("div"))

    const outside = online.useOnlineChecker().isOnline
    expect(inSetup).toBe(outside)
    expect(app.config.globalProperties.$isOnline).toBe(outside)

    outside.value = false // e.g. a request that got no answer
    expect(inSetup.value).toBe(false)
    app.unmount()
})
