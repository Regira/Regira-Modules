import { describe, test, expect, beforeEach } from "vitest"
import { createApp, defineComponent, h, nextTick } from "vue"
import { useAutocomplete } from "../../../src/vue/ui/autocomplete/autocomplete"

// jsdom has no layout engine: offsetParent/offsetWidth/getBoundingClientRect are stubbed with the numbers
// measured live in the browser (control 232px, input 151px, row height 38px).
const rect = (left, width) => ({ width, height: 38, top: 0, left, right: left + width, bottom: 38, x: left, y: 0, toJSON: () => ({}) })

function setViewportWidth(width) {
    Object.defineProperty(window, "innerWidth", { value: width, configurable: true, writable: true })
}
// `controlLeft` is where the control sits IN THE VIEWPORT — what the right-edge guard measures against.
function stubControl({ wrapInInputGroup = true, controlWidth = 232, inputWidth = 151, inputOffsetLeft = 81, controlLeft = 0 } = {}) {
    const input = document.createElement("input")
    Object.defineProperty(input, "offsetWidth", { value: inputWidth, configurable: true })
    Object.defineProperty(input, "offsetLeft", { value: inputOffsetLeft, configurable: true }) // e.g. past a prepend button
    input.getBoundingClientRect = () => rect(controlLeft + inputOffsetLeft, inputWidth)

    let parent
    if (wrapInInputGroup) {
        parent = document.createElement("div")
        parent.className = "input-selector input-group text-nowrap"
    } else {
        parent = document.createElement("div") // a plain positioned ancestor, not the control
    }
    parent.appendChild(input)
    Object.defineProperty(parent, "offsetWidth", { value: controlWidth, configurable: true })
    parent.getBoundingClientRect = () => rect(controlLeft, controlWidth)
    document.body.appendChild(parent)
    Object.defineProperty(input, "offsetParent", { value: parent, configurable: true })
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
/** mount, attach a stubbed control, and hand back the resolved style */
async function styleFor(options) {
    const { get } = mountComposable()
    get().inputEl.value = stubControl(options)
    await nextTick()
    return { style: get().resultStyle.value, out: get() }
}

beforeEach(() => setViewportWidth(1024)) // jsdom's own default, set explicitly so the guard's numbers are pinned

describe("autocomplete result panel sizing", () => {
    test("sizes to its content with the CONTROL as the floor, not the bare input", async () => {
        // regression: width was hard-set to the input's own box (151px), so every result wrapped onto two
        // lines inside a 232px control.
        const { style } = await styleFor()

        expect(style.width).toBe("max-content")
        expect(style.minWidth).toBe("232px")
        expect(style.left).toBe("0px") // the whole control's left edge, not the input's offset within it
        expect(style.right).toBe("auto")
        expect(style.top).toBe("38px")
    })

    test("clamps its own width so the panel cannot become a new source of page overflow", async () => {
        const { style } = await styleFor()

        // 1024 viewport − control at x=0 − the 8px gutter
        expect(style.maxWidth).toBe("min(90vw, 32rem, 1016px)")
    })

    test("falls back to the input's own box when the offsetParent is not the control", async () => {
        const { style } = await styleFor({ wrapInInputGroup: false })

        expect(style.minWidth).toBe("151px")
        expect(style.left).toBe("81px") // the input's own offset within that ancestor, as before
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

        expect(style.left).toBe("0px") // still left-aligned: the control's own width fits
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
        expect(style.right).toBe("0px") // the control IS the offsetParent — inset zero from its right edge
        expect(style.maxWidth).toBe("min(90vw, 32rem, 347px)") // 355 (control right) − 8
        expect(style.minWidth).toBe("140px") // the "never narrower than its control" floor is untouched
    })

    test("a flipped panel insets from the offsetParent's right edge to the input's own", async () => {
        setViewportWidth(360)
        const { style } = await styleFor({ wrapInInputGroup: false, controlWidth: 300, controlLeft: 128 })

        expect(style.left).toBe("auto")
        expect(style.right).toBe("68px") // parent 300 − (input offsetLeft 81 + width 151)
    })

    test("guards the CLOSED panel too — visibility:hidden still extends the page's scroll area", async () => {
        // the panel is visibility:hidden rather than display:none, so a closed one still contributes layout;
        // the clamp/flip must therefore not be gated on isOpen
        setViewportWidth(360)
        const { style } = await styleFor({ controlWidth: 140, controlLeft: 215 })

        expect(style.visibility).toBe("hidden")
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
