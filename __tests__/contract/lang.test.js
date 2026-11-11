import { test, expect, vi, afterEach } from "vitest"
import { runOn } from "./drivers"

// The active language and its messages: one app-wide state, which $t, useLang and the error mapping all read.

afterEach(() => vi.restoreAllMocks())

const messages = {
    save: { en: "Save", nl: "Bewaren" },
    greeting: { en: "Hello {name}", nl: "Hallo {name}" },
    onlyEnglish: { en: "Only in English" },
    plain: "Same in every language",
}

runOn(["core", "vue"], "lang", (driver) => {
    test("translates in the active language", () => {
        const lang = driver.lang()
        lang.call("replaceMessages", messages)
        lang.call("setLangCode", "nl")

        expect(lang.call("translate", "save")).toBe("Bewaren")
        expect(lang.call("translate", "plain")).toBe("Same in every language")
    })

    test("falls back to the fallback language for a message the active one lacks", () => {
        const lang = driver.lang()
        lang.call("replaceMessages", messages)
        lang.write("fallbackLangCode", "en")
        lang.call("setLangCode", "nl")

        expect(lang.call("translate", "onlyEnglish")).toBe("Only in English")
        expect(lang.call("translateMessage", { en: "Bye" })).toBe("Bye")
    })

    test("a regional code finds its language's messages", () => {
        const lang = driver.lang()
        lang.call("replaceMessages", messages)
        lang.call("setLangCode", "nl-BE")

        expect(lang.call("translate", "save")).toBe("Bewaren")
    })

    test("fills the message's arguments", () => {
        const lang = driver.lang()
        lang.call("replaceMessages", messages)
        lang.call("setLangCode", "en")

        expect(lang.call("translate", "greeting", { name: "Ann" })).toBe("Hello Ann")
        expect(lang.call("translateMessage", { en: "Bye {name}" }, { name: "Ann" })).toBe("Bye Ann")
    })

    test("a key without a message comes back as the key", () => {
        vi.spyOn(console, "warn").mockImplementation(() => {})
        const lang = driver.lang()
        lang.call("replaceMessages", messages)
        lang.call("setLangCode", "en")

        expect(lang.call("translate", "missing")).toBe("missing")
    })

    test("an empty language code leaves the language as it is", () => {
        const lang = driver.lang()
        lang.call("setLangCode", "nl")

        lang.call("setLangCode", "")

        expect(lang.read("langCode")).toBe("nl")
    })

    test("loadMessages adds to the messages, replaceMessages replaces them", () => {
        const lang = driver.lang()
        lang.call("replaceMessages", { save: { en: "Save" } })

        lang.call("loadMessages", { cancel: { en: "Cancel" } })
        expect(Object.keys(lang.read("messages")).sort()).toEqual(["cancel", "save"])

        lang.call("replaceMessages", { close: { en: "Close" } })
        expect(Object.keys(lang.read("messages"))).toEqual(["close"])
    })

    test("a language switch changes what translate answers", () => {
        const lang = driver.lang()
        lang.call("replaceMessages", messages)
        lang.call("setLangCode", "en")
        expect(lang.call("translate", "save")).toBe("Save")

        lang.call("setLangCode", "nl")

        expect(lang.call("translate", "save")).toBe("Bewaren")
    })
})
