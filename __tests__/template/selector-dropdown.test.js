import { describe, test, expect, vi, afterEach } from "vitest"
import { createApp, defineComponent, h, nextTick } from "vue"

// The generated slice SelectorDropdown, mounted against a stubbed slice: its store lists rows, and onAuthenticated
// hands the test the reload a sign-in triggers.
const { list, signIns } = vi.hoisted(() => ({ list: vi.fn(), signIns: [] }))
vi.mock("../../_template/entity-slice/data/store", () => ({ default: () => ({ fromPool: (x) => x, list }) }))
vi.mock("../../_template/entity-slice/data/Entity", () => ({ default: class {} }))
vi.mock("@regira/modules/vue/auth", () => ({ onAuthenticated: (callback) => signIns.push(callback) }))

const { default: SelectorDropdown } = await import("../../_template/entity-slice/selecting/SelectorDropdown.vue")

const flush = async () => {
    for (let i = 0; i < 5; i++) await nextTick()
}

function mount() {
    const el = document.createElement("div")
    createApp(defineComponent({ setup: () => () => h(SelectorDropdown) })).mount(el)
    return el
}
const options = (el) => [...el.querySelectorAll("option")].map((o) => o.textContent.trim()).filter(Boolean)

describe("generated SelectorDropdown", () => {
    afterEach(() => {
        list.mockReset()
        signIns.length = 0
        vi.restoreAllMocks()
    })

    test("another account whose load is refused is not offered the previous account's rows", async () => {
        list.mockResolvedValueOnce([{ id: 1, $title: "Row of account A" }])
        const el = mount()
        await flush()
        expect(options(el)).toEqual(["Row of account A"])

        // account B signs in behind the login modal, and may not list this entity
        vi.spyOn(console, "error").mockImplementation(() => {})
        list.mockRejectedValueOnce({ response: { status: 403 } })
        signIns.forEach((reload) => reload())
        await flush()

        expect(options(el)).toEqual([])
    })
})
