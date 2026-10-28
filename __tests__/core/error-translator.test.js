import { describe, test, expect, vi, beforeEach } from "vitest"

// The error mapping lives in the core, where no `useLang` exists: a framework layer registers the default translator
// when it loads, and an app's own translator wins over it in whichever order the two are set.

const refusal = (key) => ({ response: { status: 400, data: { errorDetails: [{ key: "title", message: key }] } } })

beforeEach(() => vi.resetModules())

describe("the core's error translator", () => {
    test("with no framework layer, a message shows as the server sent it", async () => {
        const { toFeedbackError, fieldLabel } = await import("../../src/core/feedback/errors")
        expect(toFeedbackError(refusal("Required"))).toEqual({ title: ["Required"] })
        expect(fieldLabel("dueDate")).toBe("Due date")
    })

    test("the Vue layer's default reads the useLang messages", async () => {
        const { useLang } = await import("../../src/vue/lang/useLang")
        const { toFeedbackError } = await import("../../src/vue/ui/feedback/feedback")
        const lang = useLang()
        lang.setLangCode("en")
        lang.replaceMessages({ Required: { en: "Fill this in" } })
        expect(toFeedbackError(refusal("Required"))).toEqual({ title: ["Fill this in"] })
    })

    test("an app's translator set before the Vue layer loads still wins", async () => {
        const core = await import("../../src/core/feedback/errors")
        core.setErrorTranslator((key) => `app:${key}`)
        const { useLang } = await import("../../src/vue/lang/useLang")
        await import("../../src/vue/ui/feedback/feedback")
        useLang().replaceMessages({ Required: "Fill this in" })
        expect(core.toFeedbackError(refusal("Required"))).toEqual({ title: ["app:Required"] })

        core.setErrorTranslator(undefined)
        expect(core.toFeedbackError(refusal("Required"))).toEqual({ title: ["Fill this in"] })
    })
})
