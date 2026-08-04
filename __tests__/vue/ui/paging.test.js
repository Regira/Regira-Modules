import { describe, test, expect, vi, beforeAll, afterAll } from "vitest"
import { ref } from "vue"

// usePaging only needs a router to build the page hrefs — stub it so the composable can run standalone
vi.mock("vue-router", () => ({
    useRouter: () => ({
        currentRoute: { value: { name: "list", path: "/list", hash: "", query: {} } },
        resolve: (route) => ({ fullPath: `/list?page=${route.query.page}` }),
    }),
}))

import usePaging from "../../../src/vue/ui/paging/paging"
import { useScreen } from "../../../src/vue/ui/screen"
import { getWindowSize } from "../../../src/vue/ui/screen/screen"

function setViewportWidth(width) {
    Object.defineProperty(window, "innerWidth", { value: width, configurable: true, writable: true })
}
async function resizeTo(width) {
    setViewportWidth(width)
    window.dispatchEvent(new Event("resize"))
    await vi.advanceTimersByTimeAsync(300) // the shared screen listener is debounced (250ms)
}
function paging({ count = 200, page = 1, pageSize = 10, maxPages = 9 } = {}) {
    return usePaging({ pagingInfo: ref({ page, pageSize }), count: ref(count), maxPages, emit: () => {} })
}

beforeAll(() => {
    vi.useFakeTimers()
    setViewportWidth(768) // tablet — the width the list "loads at"
})
afterAll(() => vi.useRealTimers())

describe("usePaging button budget", () => {
    test("renders the full budget on a wide viewport", () => {
        const { pages, visibleMaxPages } = paging()

        expect(visibleMaxPages.value).toBe(9)
        expect(pages.value).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9])
    })

    test("halves the budget below the sm breakpoint AFTER setup — a rotate/split-screen must not overflow", async () => {
        // regression: maxPages was reduced once, non-reactively, at composable setup. A list opened at 768px
        // and resized to 320px kept all 11 buttons and pushed the page ~62px into horizontal overflow.
        const { pages, visibleMaxPages } = paging()
        expect(pages.value.length).toBe(9)

        await resizeTo(320)

        expect(visibleMaxPages.value).toBe(5)
        expect(pages.value).toEqual([1, 2, 3, 4, 5])
    })

    test("widening again restores the full budget", async () => {
        const { pages } = paging()
        await resizeTo(320)
        expect(pages.value.length).toBe(5)

        await resizeTo(1200)

        expect(pages.value.length).toBe(9)
    })

    test("a new composable created while narrow starts halved", async () => {
        await resizeTo(320)

        expect(paging().visibleMaxPages.value).toBe(5)

        await resizeTo(1200)
    })

    test("the window never shows more pages than exist", () => {
        expect(paging({ count: 25 }).pages.value).toEqual([1, 2, 3])
        expect(paging({ count: 0 }).pages.value).toEqual([])
    })
})

describe("useScreen", () => {
    test("is one shared instance — a per-call ref would only update for whoever owns the listener", () => {
        expect(useScreen()).toBe(useScreen())
    })

    test("tracks the viewport without an app installing the plugin", async () => {
        const { screen } = useScreen()

        await resizeTo(320)
        expect(screen.isSmall).toBe(false)
        expect(screen.layout).toBe("xs")

        await resizeTo(1200)
        expect(screen.isSmall).toBe(true)
        expect(screen.layout).toBe("xl")
    })

    test("reports a deterministic size where there is no window instead of throwing", () => {
        // the resize subscription is window-guarded; the size it starts at has to be too, or the very first
        // useScreen() call outside a DOM (SSR, a Node script importing the UI barrel) dies on window.innerWidth
        vi.stubGlobal("window", undefined)
        try {
            expect(getWindowSize()).toEqual([0, 0]) // the smallest breakpoint — the CSS's mobile-first default
        } finally {
            vi.unstubAllGlobals()
        }
    })
})
