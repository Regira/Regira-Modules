import type { App } from "vue"
import { useFeedback, type FeedbackIn } from "./feedback"

export default {
    install: (app: App<Element>, options?: FeedbackIn) => {
        const feedback = useFeedback(options)
        app.config.globalProperties.$feedback = feedback
        app.provide("feedback", feedback)
    },
}
