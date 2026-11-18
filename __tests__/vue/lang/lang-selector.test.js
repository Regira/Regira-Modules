import { test, expect, afterEach } from "vitest"
import { createApp, h, nextTick } from "vue"
import LangSelector from "../../../src/vue/lang/LangSelector.vue"
import { useLang } from "../../../src/vue/lang/useLang"

// Each language is a real button: a keyboard reaches it with Tab and picks it with Enter or Space, and a screen reader
// hears which one is on.
let app
afterEach(() => {
    app?.unmount()
    document.body.innerHTML = ""
})

function mount(props) {
    const host = document.createElement("div")
    document.body.appendChild(host)
    app = createApp({ render: () => h(LangSelector, props) })
    app.mount(host)
    return host
}

test("offers each language as a button, the current one pressed", () => {
    useLang().setLangCode("en")
    const host = mount({ langs: ["en", "nl"] })

    const buttons = [...host.querySelectorAll(".rg-lang-selector li > button")]
    expect(buttons.map((b) => [b.type, b.textContent.trim(), b.getAttribute("aria-pressed")])).toEqual([
        ["button", "EN", "true"],
        ["button", "NL", "false"],
    ])
    // in the tab order, as a button is
    expect(buttons.every((b) => b.tabIndex === 0)).toBe(true)
})

test("a button switches the language and emits select", async () => {
    useLang().setLangCode("en")
    const selected = []
    const host = mount({ langs: ["en", "nl"], onSelect: (code) => selected.push(code) })

    host.querySelectorAll("button")[1].click()
    await nextTick()

    expect(useLang().langCode.value).toBe("nl")
    expect(selected).toEqual(["nl"])
    expect(host.querySelectorAll("button")[1].getAttribute("aria-pressed")).toBe("true")
})
