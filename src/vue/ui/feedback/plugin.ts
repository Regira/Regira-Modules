import { inject, type App } from "vue"
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
 * instance `useFeedback()` mints per form. Use it to report from a handler that owns no panel of its own
 * (`useAppFeedback().success("Added to cart")`). Throws when the plugin was never installed, rather than
 * silently dropping the message.
 */
export function useAppFeedback(): FeedbackOut {
    const feedback = inject<FeedbackOut>(feedbackKey)
    if (!feedback) throw new Error("useAppFeedback() requires the feedback plugin — app.use(feedbackPlugin).")
    return feedback
}
