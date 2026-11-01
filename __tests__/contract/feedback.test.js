import { test, expect, vi, afterEach } from "vitest"
import { FeedbackStatus } from "../../src/core/feedback/feedback"
import { fieldMessages } from "../../src/core/feedback/errors"
import { runOn } from "./drivers"

afterEach(() => vi.useRealTimers())

runOn(["core", "vue"], "feedback", (driver) => {
    test("isPending tracks the pending status, so a view never re-derives it", () => {
        const feedback = driver.feedback({ autoHideDelay: 0 })

        expect(feedback.read("isPending")).toBe(false)

        feedback.call("pending", "Saving…")
        expect(feedback.read("status")).toBe(FeedbackStatus.pending)
        expect(feedback.read("isPending")).toBe(true)

        feedback.call("success", "Saved")
        expect(feedback.read("isPending")).toBe(false)

        feedback.call("pending", "Saving…")
        feedback.call("fail", "Save failed", "boom")
        expect(feedback.read("isPending")).toBe(false)

        feedback.call("pending", "Saving…")
        feedback.call("reset")
        expect(feedback.read("isPending")).toBe(false)
    })

    test("a text error is added to the message", () => {
        const feedback = driver.feedback({ autoHideDelay: 0 })

        feedback.call("fail", "Save failed", "Server error\nat line 3")

        expect(feedback.read("message")).toBe("Save failed: Server error")
        expect(feedback.read("error")).toBeUndefined()
    })

    test("an exception passed instead of a field map shows its text", () => {
        const feedback = driver.feedback({ autoHideDelay: 0 })

        feedback.call("fail", "Save failed", new Error("Network Error"))

        expect(feedback.read("error")).toBe("Network Error")
    })

    test("a field map with a field named message stays a field map", () => {
        const feedback = driver.feedback({ autoHideDelay: 0 })

        feedback.call("fail", "Save failed", { message: ["Required"] })

        expect(feedback.read("error")).toEqual({ message: ["Required"] })
    })

    test("fieldMessages reads the field map fail stores", () => {
        const feedback = driver.feedback({ autoHideDelay: 0 })
        feedback.call("fail", "Saving failed", { title: ["Required"] })

        expect(fieldMessages(feedback.read("error"), "title")).toEqual(["Required"])
    })

    test("a success hides itself after autoHideDelay", () => {
        vi.useFakeTimers()
        const feedback = driver.feedback({ autoHideDelay: 1500 })

        feedback.call("success", "Saved")
        vi.advanceTimersByTime(1500)

        expect(feedback.read("status")).toBe(FeedbackStatus.none)
    })

    test("a failure shown within autoHideDelay of a success stays", () => {
        // the success's timer used to fire anyway and reset() the failure a moment after it appeared
        vi.useFakeTimers()
        const feedback = driver.feedback({ autoHideDelay: 1500 })

        feedback.call("success", "Saved")
        vi.advanceTimersByTime(500)
        feedback.call("fail", "Saving failed", { title: ["Required"] })
        vi.advanceTimersByTime(5000)

        expect(feedback.read("status")).toBe(FeedbackStatus.failed)
        expect(feedback.read("error")).toEqual({ title: ["Required"] })
    })

    test("a pending shown within autoHideDelay of a success stays", () => {
        vi.useFakeTimers()
        const feedback = driver.feedback({ autoHideDelay: 1500 })

        feedback.call("success", "Saved")
        feedback.call("pending", "Saving…")
        vi.advanceTimersByTime(5000)

        expect(feedback.read("isPending")).toBe(true)
    })

    test("without autoHideDelay a success stays", () => {
        vi.useFakeTimers()
        const feedback = driver.feedback({ autoHideDelay: 0 })

        feedback.call("success", "Saved")
        vi.advanceTimersByTime(60_000)

        expect(feedback.read("status")).toBe(FeedbackStatus.success)
    })
})
