import { test, expect } from "vitest"
import { watchEffect } from "vue"
import { useLang } from "../../../src/vue/lang/useLang"

// What the lang scenarios cannot see: that a view re-renders when the language or the messages change.

test("a language switch and new messages re-run what translated", () => {
    const { translate, setLangCode, replaceMessages, loadMessages } = useLang()
    replaceMessages({ save: { en: "Save", nl: "Bewaren" } })
    setLangCode("en")
    const seen = []
    watchEffect(() => seen.push(translate("save")), { flush: "sync" })

    setLangCode("nl")
    loadMessages({ save: { en: "Save", nl: "Opslaan" } })

    expect(seen).toEqual(["Save", "Bewaren", "Opslaan"])
})

test("every useLang() reads the one app-wide state", () => {
    useLang().setLangCode("nl")

    expect(useLang().langCode.value).toBe("nl")
    expect(useLang().messages).toBe(useLang().messages)
})
