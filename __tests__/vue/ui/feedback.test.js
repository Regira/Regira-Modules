import { describe, test, expect } from "vitest"
import { FeedbackStatus, useFeedback } from "../../../src/vue/ui/feedback"

describe("useFeedback busy flag", () => {
    test("isPending tracks the pending status, so a view never re-derives it", () => {
        const feedback = useFeedback({ autoHideDelay: 0 })

        expect(feedback.isPending.value).toBe(false)

        feedback.pending("Saving…")
        expect(feedback.status.value).toBe(FeedbackStatus.pending)
        expect(feedback.isPending.value).toBe(true)

        feedback.success("Saved")
        expect(feedback.isPending.value).toBe(false)

        feedback.pending("Saving…")
        feedback.fail("Save failed", "boom")
        expect(feedback.isPending.value).toBe(false)

        feedback.pending("Saving…")
        feedback.reset()
        expect(feedback.isPending.value).toBe(false)
    })
})
