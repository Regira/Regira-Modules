import { computed, reactive } from "vue"
import { fillArgs, setDefaultErrorTranslator, type ErrorTranslator, type FeedbackError } from "../../../core/feedback/errors"
import { createFeedback, FeedbackStatus, type FeedbackIn } from "../../../core/feedback/feedback"
import { useLang } from "../../lang/useLang"
import { vueBox } from "../../box"

export {
    toFeedbackError,
    fieldMessages,
    fieldLabel,
    setErrorTranslator,
    type ErrorTranslator,
    type FeedbackError,
} from "../../../core/feedback/errors"

export { FeedbackStatus, type FeedbackIn } from "../../../core/feedback/feedback"

/**
 * A reactive object, not a bag of refs: read the fields directly (`feedback.isPending`), in script and
 * template alike, and bind them without `.value` — `:disabled="feedback.isPending"`.
 */
export interface FeedbackOut {
    status: FeedbackStatus
    message: string
    error: FeedbackError | undefined
    /** busy flag — `status === FeedbackStatus.pending`, so a view can disable its buttons without re-deriving it */
    readonly isPending: boolean

    pending(msg: string): void
    success(msg: string): void
    /** `errors` is a FIELD-ERROR MAP or a string, never an `Error` — see {@link FeedbackError}. */
    fail(msg: string, errors?: FeedbackError): void
    reset(): void
}
type FeedbackStatusOrError = { status: FeedbackStatus; error?: FeedbackError }
export interface FeedbackEmits {
    (e: "close", arg: FeedbackStatusOrError): void
}
export type FeedbackProps = {
    feedback: FeedbackOut
    hideCloseButton?: boolean
    enableErrorPopup?: boolean
    /**
     * Leaves the named fields out of the error summary, for a form that shows each field's messages at its input
     * ({@link fieldMessages}). A text error and the messages under the key `""`, which belong to no one field, still show.
     */
    hideFieldErrors?: boolean
}
export const feedbackDefaults = {
    hideCloseButton: false,
    enableErrorPopup: false,
    hideFieldErrors: false,
}
export type FeedbackSlots = {
    "close-button"?(): any
    pending?(): any
    success?(): any
    error?(): any
}

// the default: the useLang messages, in the active language and else the fallback one
const translateWithLang: ErrorTranslator = (message, args) => {
    const { messages, translate } = useLang()
    return messages.value[message] == null ? undefined : translate(message, fillArgs(args))
}
setDefaultErrorTranslator(translateWithLang)

export function useFeedback(input: FeedbackIn = {}): FeedbackOut {
    const feedback = createFeedback({ ...input, box: vueBox })
    // reactive() unwraps the boxes, which are refs, so consumers never write `.value` — the core keeps using them
    return reactive({ ...feedback, isPending: computed(feedback.isPending) }) as unknown as FeedbackOut
}

export default useFeedback
