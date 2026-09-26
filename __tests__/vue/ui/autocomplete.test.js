import { describe, test, expect, beforeEach } from "vitest"
import { createApp, defineComponent, h, nextTick } from "vue"
import { useAutocomplete } from "../../../src/vue/ui/autocomplete/autocomplete"
import Autocomplete from "../../../src/vue/ui/autocomplete/Autocomplete.vue"

// jsdom has no layout engine: getBoundingClientRect is stubbed with the numbers measured live in the browser
// (control 232px, input 151px, row height 38px). The panel is `position: fixed`, so every expected offset
// below is in viewport coordinates.
const rect = (left, width, top = 0) => ({ width, height: 38, top, left, right: left + width, bottom: top + 38, x: left, y: top, toJSON: () => ({}) })
const box = ({ top, left, width, height }) => ({ top, left, width, height, right: left + width, bottom: top + height })

function setViewportWidth(width) {
    Object.defineProperty(window, "innerWidth", { value: width, configurable: true, writable: true })
}
function setViewportHeight(height) {
    Object.defineProperty(window, "innerHeight", { value: height, configurable: true, writable: true })
}
// `controlLeft`/`controlTop` are where the control sits IN THE VIEWPORT; the input sits `inputOffsetLeft`/
// `inputOffsetTop` into it (e.g. past a prepend button). `clip` wraps the control in a scroll container with
// that viewport box — a scrollable modal body. `fixed` puts a `position: fixed` layer between the two — a modal
// rendered in place — and `fixed.clip` makes that layer a scroll container of its own.
function stubControl({
    wrapInInputGroup = true,
    controlWidth = 232,
    inputWidth = 151,
    inputOffsetLeft = 81,
    controlLeft = 0,
    controlTop = 0,
    inputOffsetTop = 0,
    clip,
    fixed,
} = {}) {
    const input = document.createElement("input")
    input.getBoundingClientRect = () => rect(controlLeft + inputOffsetLeft, inputWidth, controlTop + inputOffsetTop)

    const parent = document.createElement("div")
    if (wrapInInputGroup) {
        parent.className = "input-selector input-group text-nowrap"
    } // else: a plain wrapper, not the control
    parent.appendChild(input)
    parent.getBoundingClientRect = () => rect(controlLeft, controlWidth, controlTop)
    let outer = parent
    if (fixed) {
        const layer = document.createElement("div")
        layer.style.position = "fixed"
        if (fixed.clip) {
            layer.style.overflowY = "auto"
            layer.getBoundingClientRect = () => box(fixed.clip)
        }
        layer.appendChild(outer)
        outer = layer
    }
    if (clip) {
        const scroller = document.createElement("div")
        scroller.style.overflowY = "auto"
        scroller.getBoundingClientRect = () => box(clip)
        scroller.appendChild(outer)
        document.body.appendChild(scroller)
    } else {
        document.body.appendChild(outer)
    }
    return input
}

function mountComposable(props = { data: [] }) {
    const host = document.createElement("div")
    document.body.appendChild(host)
    let out
    const app = createApp(
        defineComponent({
            setup() {
                out = useAutocomplete(props, { emit: () => {} })
                return () => h("div")
            },
        })
    )
    app.mount(host)
    return { app, get: () => out }
}
// The panel's own box, which the vertical guard measures: `height` is what it renders at, `contentHeight`
// what its content wants — the two differ once the list scrolls inside its max-height.
function stubPanel({ height = 208, contentHeight = height } = {}) {
    const el = document.createElement("div")
    Object.defineProperty(el, "offsetHeight", { value: height, configurable: true })
    Object.defineProperty(el, "scrollHeight", { value: contentHeight, configurable: true })
    document.body.appendChild(el)
    return el
}
/** mount, attach a stubbed control (and panel), and hand back the resolved style */
async function styleFor({ panel, ...control } = {}) {
    const { get } = mountComposable()
    get().inputEl.value = stubControl(control)
    if (panel) {
        get().resultEl.value = stubPanel(panel)
        get().items.value = [] // results painting is what re-measures the panel
    }
    await nextTick()
    return { style: get().resultStyle.value, out: get() }
}

// jsdom's own defaults, set explicitly so the guards' numbers are pinned
beforeEach(() => {
    setViewportWidth(1024)
    setViewportHeight(768)
})

describe("autocomplete result panel sizing", () => {
    test("sizes to its content with the CONTROL as the floor, not the bare input", async () => {
        // regression: width was hard-set to the input's own box (151px), so every result wrapped onto two
        // lines inside a 232px control.
        const { style } = await styleFor()

        expect(style.position).toBe("fixed")
        expect(style.width).toBe("max-content")
        expect(style.minWidth).toBe("232px")
        expect(style.left).toBe("0px") // the whole control's left edge, not the input's offset within it
        expect(style.right).toBe("auto")
        expect(style.top).toBe("38px") // the control's bottom edge
    })

    test("clamps its own width so the panel cannot become a new source of page overflow", async () => {
        const { style } = await styleFor()

        // 1024 viewport − control at x=0 − the 8px gutter
        expect(style.maxWidth).toBe("min(90vw, 32rem, 1016px)")
    })

    test("falls back to the input's own box when the input sits in no .input-group", async () => {
        const { style } = await styleFor({ wrapInInputGroup: false })

        expect(style.minWidth).toBe("151px")
        expect(style.left).toBe("81px") // the input's own left edge in the viewport
    })

    test("visibility follows the open state", async () => {
        const { style, out } = await styleFor()

        expect(style.visibility).toBe("hidden")
        out.openResults()
        await nextTick()
        expect(out.resultStyle.value.visibility).toBe("visible")
    })
})

describe("autocomplete result panel right-edge guard", () => {
    test("caps the panel at the room left beside a control near the right edge", async () => {
        // 360px phone, a 232px control starting at x=120 — max-content would otherwise run off the screen
        setViewportWidth(360)
        const { style } = await styleFor({ controlLeft: 120 })

        expect(style.left).toBe("120px") // still left-aligned: the control's own width fits
        expect(style.right).toBe("auto")
        expect(style.maxWidth).toBe("min(90vw, 32rem, 232px)") // 360 − 120 − 8
        // the widest the panel can render still ends inside the viewport
        expect(120 + 232).toBeLessThanOrEqual(360)
    })

    test("flips to right-alignment when even the control's width cannot fit to the right", async () => {
        // a 140px control flush against the right gutter: left-aligned it would spill, so it opens leftwards
        setViewportWidth(360)
        const { style } = await styleFor({ controlWidth: 140, controlLeft: 215 })

        expect(style.left).toBe("auto")
        expect(style.right).toBe("5px") // on the control's right edge: 360 − 355
        expect(style.maxWidth).toBe("min(90vw, 32rem, 347px)") // 355 (control right) − 8
        expect(style.minWidth).toBe("140px") // the "never narrower than its control" floor is untouched
    })

    test("a flipped panel without an .input-group lands on the input's own right edge", async () => {
        setViewportWidth(360)
        const { style } = await styleFor({ wrapInInputGroup: false, controlWidth: 300, controlLeft: 125 })

        expect(style.left).toBe("auto")
        expect(style.right).toBe("3px") // 360 − (125 + input offset 81 + width 151)
    })

    test("places the CLOSED panel too, and fixed, so it never extends the page's scroll area", async () => {
        // the panel is visibility:hidden rather than display:none; fixed positioning keeps a closed one out of
        // the document's scrollable overflow, and the placement is ready the moment it opens
        setViewportWidth(360)
        const { style } = await styleFor({ controlWidth: 140, controlLeft: 215 })

        expect(style.visibility).toBe("hidden")
        expect(style.position).toBe("fixed")
        expect(style.left).toBe("auto")
        expect(style.maxWidth).toBe("min(90vw, 32rem, 347px)")
    })

    test("leaves the clamp off entirely when there is no window to measure", async () => {
        setViewportWidth(0) // stands in for a non-DOM render: nothing to guard against
        const { style } = await styleFor()

        expect(style.maxWidth).toBe("min(90vw, 32rem)")
        expect(style.left).toBe("0px")
    })
})

describe("autocomplete result panel bottom-edge guard", () => {
    test("keeps the results below the control when they fit there", async () => {
        const { style } = await styleFor({ panel: { height: 208 } })

        expect(style.top).toBe("38px")
        expect(style.bottom).toBe("auto")
        expect(style.maxHeight).toBe("min(var(--rg-dropdown-max-height, 13rem), 722px)") // 768 − 38 − 8
    })

    test("flips above the control when the results would fall off the bottom", async () => {
        // an autocomplete near the foot of a modal rendered its results off screen
        const { style } = await styleFor({ controlTop: 700, panel: { height: 208 } })

        expect(style.top).toBe("auto")
        expect(style.bottom).toBe("68px") // the panel's bottom edge on the control's top edge: 768 − 700
        expect(style.maxHeight).toBe("min(var(--rg-dropdown-max-height, 13rem), 692px)") // 700 − 8
    })

    test("a flipped panel without an .input-group sits on the input's own top edge", async () => {
        const { style } = await styleFor({ wrapInInputGroup: false, controlTop: 700, inputOffsetTop: 20, panel: { height: 208 } })

        expect(style.bottom).toBe("48px") // 768 − (700 + 20)
    })

    test("stays below and scrolls when below is cramped but still the roomier side", async () => {
        setViewportHeight(200)
        const { style } = await styleFor({ controlTop: 40, panel: { height: 208 } })

        expect(style.top).toBe("78px")
        expect(style.maxHeight).toBe("min(var(--rg-dropdown-max-height, 13rem), 114px)") // 200 − 78 − 8
    })

    test("a panel already capped below still discovers the roomier side above it", async () => {
        // it measures exactly the room it was granted, and only its scrolling content says it wants more
        const { style } = await styleFor({ controlTop: 700, panel: { height: 22, contentHeight: 300 } })

        expect(style.top).toBe("auto")
        expect(style.bottom).toBe("68px")
    })

    test("leaves a panel that genuinely fits that cramped room below", async () => {
        const { style } = await styleFor({ controlTop: 700, panel: { height: 22 } })

        expect(style.top).toBe("738px")
        expect(style.bottom).toBe("auto")
    })

    test("leaves the vertical guard off entirely when there is no window to measure", async () => {
        setViewportHeight(0) // stands in for a non-DOM render: nothing to guard against
        const { style } = await styleFor({ controlTop: 700, panel: { height: 208 } })

        expect(style.top).toBe("738px")
        expect(style.maxHeight).toBeUndefined()
    })
})

describe("autocomplete result panel inside a scroll container", () => {
    // the reported case: a selector at the foot of a scrollable modal body. A fixed panel is not clipped by the
    // body, so its placement is the viewport's — the body only decides whether the control is still shown.
    const modalBody = { top: 100, left: 0, width: 600, height: 300 }

    test("is placed against the viewport, not cut at the scroll container's edge", async () => {
        const { style } = await styleFor({ controlTop: 360, clip: modalBody, panel: { height: 208 } })

        expect(style.position).toBe("fixed")
        expect(style.top).toBe("398px") // below the control, running past the body's bottom edge at 400
        expect(style.maxHeight).toBe("min(var(--rg-dropdown-max-height, 13rem), 362px)") // 768 − 398 − 8
    })

    test("hides while its control is scrolled out of the scroll container", async () => {
        const { out } = await styleFor({ controlTop: 420, clip: modalBody })
        out.openResults()
        await nextTick()

        expect(out.resultStyle.value.visibility).toBe("hidden")
    })

    test("shows while any part of its control is still inside the scroll container", async () => {
        const { out } = await styleFor({ controlTop: 380, clip: modalBody })
        out.openResults()
        await nextTick()

        expect(out.resultStyle.value.visibility).toBe("visible")
    })

    test("follows its control while open, whatever moved it — no scroll event needed", async () => {
        const { get } = mountComposable()
        let top = 360
        const input = stubControl({ clip: modalBody })
        input.parentElement.getBoundingClientRect = () => rect(0, 232, top)
        get().inputEl.value = input
        get().openResults()
        await nextTick()
        expect(get().resultStyle.value.top).toBe("398px")

        top = 200
        // a message appeared above the field, a section expanded — the control moved without a scroll or resize
        await new Promise((resolve) => setTimeout(resolve, 50)) // a few animation frames
        expect(get().resultStyle.value.top).toBe("238px")
    })

    test("shows inside a fixed modal rendered in place, whatever scroll container the modal sits in", async () => {
        // a DefaultModal rendered inside a card or a scrollable list lower on the page: the modal is fixed, so
        // that container never clips it — the control is on screen although it lies outside the container's box
        const listBelow = { top: 500, left: 0, width: 600, height: 200 }
        const { out } = await styleFor({ controlTop: 200, clip: listBelow, fixed: {} })
        out.openResults()
        await nextTick()

        expect(out.resultStyle.value.visibility).toBe("visible")
    })

    test("still hides while its control is scrolled out of a fixed modal that scrolls its own content", async () => {
        // a Bootstrap `.modal` is both: fixed, and the scroll container for its dialog
        const listBelow = { top: 500, left: 0, width: 600, height: 200 }
        const { out } = await styleFor({ controlTop: 420, clip: listBelow, fixed: { clip: modalBody } })
        out.openResults()
        await nextTick()

        expect(out.resultStyle.value.visibility).toBe("hidden")
    })

    test("shows when the control itself is fixed, whatever scroll container it sits in", async () => {
        const { get } = mountComposable()
        const input = stubControl({ controlTop: 200, clip: { top: 500, left: 0, width: 600, height: 200 } })
        input.parentElement.style.position = "fixed" // a toolbar search pinned to the viewport
        get().inputEl.value = input
        get().openResults()
        await nextTick()

        expect(get().resultStyle.value.visibility).toBe("visible")
    })
})

describe("Autocomplete component", () => {
    test("renders its result panel on <body>, outside every ancestor that could clip it", async () => {
        const host = document.createElement("div")
        host.style.overflow = "hidden"
        document.body.appendChild(host)
        createApp({ render: () => h(Autocomplete, { data: ["alpha", "beta"] }) })
            .directive("clickOutside", {})
            .mount(host)
        await nextTick()

        expect(host.querySelector("input.rg-autocomplete")).not.toBeNull()
        expect(host.querySelector(".autocomplete-items")).toBeNull()
        expect(document.body.querySelector(":scope > .autocomplete-items")).not.toBeNull()
    })

    test("ties the input to its teleported results for assistive technology", async () => {
        const host = document.createElement("div")
        document.body.appendChild(host)
        const exposed = {}
        createApp({ render: () => h(Autocomplete, { data: ["alpha", "beta"], debounceTime: 0, ref: (r) => (exposed.ac = r) }) })
            .directive("clickOutside", {})
            .mount(host)
        await nextTick()
        const input = host.querySelector("input")
        const listbox = document.getElementById(input.getAttribute("aria-controls"))

        expect(input.getAttribute("role")).toBe("combobox")
        expect(input.getAttribute("aria-autocomplete")).toBe("list")
        expect(input.getAttribute("aria-expanded")).toBe("false")
        expect(listbox.getAttribute("role")).toBe("listbox")
        expect(listbox.closest(".autocomplete-items").parentElement).toBe(document.body)

        await exposed.ac.search("") // the default search matches on "starts with"; an empty term lists both
        await new Promise((resolve) => setTimeout(resolve, 10))
        const options = listbox.querySelectorAll('[role="option"]')
        expect(input.getAttribute("aria-expanded")).toBe("true")
        expect(options.length).toBe(2)
        expect(input.hasAttribute("aria-activedescendant")).toBe(false)

        input.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown" }))
        await nextTick()
        expect(input.getAttribute("aria-activedescendant")).toBe(options[0].id)
        expect(options[0].getAttribute("aria-selected")).toBe("true")
        expect(options[1].getAttribute("aria-selected")).toBe("false")
    })

    test("gives every instance its own listbox id, across apps too", async () => {
        // two instances in one app, and a second app on the same page (an embedded widget)
        const mountApp = (count) => {
            const host = document.createElement("div")
            document.body.appendChild(host)
            createApp({ render: () => Array.from({ length: count }, () => h(Autocomplete, { data: [] })) })
                .directive("clickOutside", {})
                .mount(host)
            return host
        }
        const hosts = [mountApp(2), mountApp(1)]
        await nextTick()
        const ids = hosts.flatMap((host) => [...host.querySelectorAll("input")].map((input) => input.getAttribute("aria-controls")))

        expect(ids).toHaveLength(3)
        expect(new Set(ids).size).toBe(3)
        ids.forEach((id) => expect(document.querySelectorAll(`#${id}`)).toHaveLength(1))
    })

    test("shares its id sequence with every skin built on useAutocomplete, an ejected copy included", async () => {
        // an app that ejected Autocomplete still renders the library's own through scaffolded slices
        const skin = mountComposable().get()
        const host = document.createElement("div")
        document.body.appendChild(host)
        createApp({ render: () => h(Autocomplete, { data: [] }) })
            .directive("clickOutside", {})
            .mount(host)
        await nextTick()

        expect(host.querySelector("input").getAttribute("aria-controls")).not.toBe(skin.listboxId)
        expect(skin.optionId(2)).toBe(`${skin.listboxId}-2`)
    })
})
