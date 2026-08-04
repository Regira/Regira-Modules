export { default as Feedback } from "./Feedback.vue"
export { default as Pending } from "./Pending.vue"
export { default as Success } from "./Success.vue"
export { default as ErrorSummary } from "./ErrorSummary.vue"
export { default as plugin } from "./plugin"
export {
    useFeedback,
    useFeedback as default,
    FeedbackStatus,
    feedbackDefaults,
    type FeedbackError,
    type FeedbackIn,
    type FeedbackOut,
    type FeedbackEmits,
    type FeedbackProps,
    type FeedbackSlots,
} from "./feedback"

declare module "@vue/runtime-core" {
    interface ComponentCustomProperties {
        $feedback: import("./feedback").FeedbackOut
    }
}
