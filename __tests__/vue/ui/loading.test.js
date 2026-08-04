import { describe, test, expect } from "vitest"
import { createApp, h } from "vue"
import Loading from "../../../src/vue/ui/loading/Loading.vue"

function mount(provides = {}) {
    const host = document.createElement("div")
    document.body.appendChild(host)
    const app = createApp({ render: () => h(Loading) })
    for (const [key, value] of Object.entries(provides)) {
        app.provide(key, value)
    }
    app.mount(host)
    return { app, host }
}

describe("Loading", () => {
    test("renders the provided image when the app brands the indicator", () => {
        const { host } = mount({ loadingImg: "/img/spinner.gif" })

        const img = host.querySelector("img.rg-loading")
        expect(img).not.toBeNull()
        expect(img.getAttribute("src")).toBe("/img/spinner.gif")
        expect(host.querySelector(".spinner-border")).toBeNull()
    })

    test("falls back to a visible indicator when no image is provided", () => {
        // binding src to an absent inject renders an <img> with no source — invisible, and indistinguishable
        // from a hung app. The unbranded default has to stay visible.
        const { host } = mount()

        expect(host.querySelector("img")).toBeNull()
        const status = host.querySelector('[role="status"]')
        expect(status).not.toBeNull()
        expect(status.querySelector(".spinner-border")).not.toBeNull()
    })

    test("the fallback carries accessible status text", () => {
        const { host } = mount()

        expect(host.querySelector(".visually-hidden").textContent.trim()).toBe("Loading…")
    })

    test("the status text is overridable for localisation", () => {
        const { host } = mount({ loadingLabel: "Laden…" })

        expect(host.querySelector(".visually-hidden").textContent.trim()).toBe("Laden…")
    })
})
