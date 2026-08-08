import { describe, test, expect } from "vitest"
import { isReactive, watchEffect } from "vue"
import { FeedbackStatus, useFeedback } from "../../../src/vue/ui/feedback"

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
