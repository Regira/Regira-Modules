import { describe, test, expect } from "vitest"
import { isReactive, reactive, watchEffect } from "vue"
import { FeedbackStatus, fieldMessages, useFeedback } from "../../../src/vue/ui/feedback"

describe("useFeedback shape", () => {
    test("returns a reactive object, so a view binds the fields without .value", () => {
        // `:disabled="feedback.isPending"` has to both type-check and work — a bag of raw refs fails vue-tsc,
        // and a caller who forgets .value binds a permanently-truthy ref object instead.
        const feedback = useFeedback({ autoHideDelay: 0 })

        expect(isReactive(feedback)).toBe(true)
        expect(feedback.status).toBe(FeedbackStatus.none)
        expect(feedback.isPending).toBe(false)
        expect(feedback.isPending?.value).toBeUndefined()
    })

    test("field reads stay reactive", () => {
        const feedback = useFeedback({ autoHideDelay: 0 })
        const seen = []
        watchEffect(() => seen.push(feedback.status), { flush: "sync" })

        feedback.pending("Saving…")
        feedback.success("Saved")

        expect(seen).toContain(FeedbackStatus.pending)
        expect(seen).toContain(FeedbackStatus.success)
    })
})

describe("useFeedback busy flag", () => {
    test("isPending tracks the pending status, so a view never re-derives it", () => {
        const feedback = useFeedback({ autoHideDelay: 0 })

        expect(feedback.isPending).toBe(false)

        feedback.pending("Saving…")
        expect(feedback.status).toBe(FeedbackStatus.pending)
        expect(feedback.isPending).toBe(true)

        feedback.success("Saved")
        expect(feedback.isPending).toBe(false)

        feedback.pending("Saving…")
        feedback.fail("Save failed", "boom")
        expect(feedback.isPending).toBe(false)

        feedback.pending("Saving…")
        feedback.reset()
        expect(feedback.isPending).toBe(false)
    })
})

describe("useFeedback fail", () => {
    test("an exception passed instead of a field map shows its text", () => {
        const feedback = useFeedback({ autoHideDelay: 0 })

        feedback.fail("Save failed", new Error("Network Error"))

        expect(feedback.error).toBe("Network Error")
    })

    test("a field map with a field named message stays a field map", () => {
        const feedback = useFeedback({ autoHideDelay: 0 })

        feedback.fail("Save failed", { message: ["Required"] })

        expect(feedback.error).toEqual({ message: ["Required"] })
    })
})

describe("fieldMessages", () => {
    test("returns every message of a field, a single string as one", () => {
        expect(fieldMessages({ title: ["Required", "Too short"] }, "title")).toEqual(["Required", "Too short"])
        expect(fieldMessages({ price: "Cannot be negative" }, "price")).toEqual(["Cannot be negative"])
    })

    test("returns none for a missing field, an empty message, text, or no error", () => {
        expect(fieldMessages({ title: ["Required"] }, "price")).toEqual([])
        expect(fieldMessages({ title: "" }, "title")).toEqual([])
        expect(fieldMessages({ title: ["", "Required"] }, "title")).toEqual(["Required"])
        expect(fieldMessages("Server error", "title")).toEqual([])
        expect(fieldMessages(undefined, "title")).toEqual([])
        expect(fieldMessages(null, "title")).toEqual([])
    })

    test("reads own keys only, so a field named like an object member finds no inherited one", () => {
        expect(fieldMessages({ title: ["Required"] }, "constructor")).toEqual([])
        expect(fieldMessages({ title: ["Required"] }, "toString")).toEqual([])
        expect(fieldMessages({ constructor: ["Required"] }, "constructor")).toEqual(["Required"])
    })

    test("re-runs when the field is added to a reactive map later", () => {
        const errors = reactive({})
        const seen = []
        watchEffect(() => seen.push(fieldMessages(errors, "title")), { flush: "sync" })

        errors.title = "Required"

        expect(seen).toEqual([[], ["Required"]])
    })

    test("reads the field map useFeedback's fail stores", () => {
        const feedback = useFeedback({ autoHideDelay: 0 })
        feedback.fail("Saving failed", { title: ["Required"] })

        expect(fieldMessages(feedback.error, "title")).toEqual(["Required"])
    })
})
