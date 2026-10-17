import { hasInjectionContext, inject, type App } from "vue"
import { useFeedback, type FeedbackIn, type FeedbackOut } from "./feedback"

// the plugin provides it and useAppFeedback consumes it — not public surface, so consumers cannot
// inject() around the "was the plugin installed?" guard below
const feedbackKey = "feedback"

export default {
    install: (app: App<Element>, options?: FeedbackIn) => {
        const feedback = useFeedback(options)
        app.config.globalProperties.$feedback = feedback
        app.provide(feedbackKey, feedback)
    },
}

/**
 * The app-wide feedback panel installed by this plugin — the one the shell renders, as opposed to the local
 * instance `useFeedback()` mints per form. Call it during setup and keep the result: it resolves through
 * `inject()`, so a call in an event handler or after an `await` throws. Report through the result from a handler
 * that owns no panel of its own (`const feedback = useAppFeedback()` … `feedback.success("Added to cart")`).
 * Throws when the plugin was never installed, rather than silently dropping the message.
 */
export function useAppFeedback(): FeedbackOut {
    // outside setup inject() finds nothing, which would read as a missing plugin
    if (!hasInjectionContext()) throw new Error("useAppFeedback() must be called during setup — keep the result and report through it later.")
    const feedback = inject<FeedbackOut>(feedbackKey)
    if (!feedback) throw new Error("useAppFeedback() requires the feedback plugin — app.use(feedbackPlugin).")
    return feedback
}
