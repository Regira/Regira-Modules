import { computed, reactive, ref } from "vue"
import { fillArgs, setDefaultErrorTranslator, type ErrorTranslator, type FeedbackError } from "../../../core/feedback/errors"
import { useLang } from "../../lang/useLang"

export {
    toFeedbackError,
    fieldMessages,
    fieldLabel,
    setErrorTranslator,
    type ErrorTranslator,
    type FeedbackError,
} from "../../../core/feedback/errors"

export enum FeedbackStatus {
    none = "",
    pending = "Pending",
    success = "Success",
    failed = "Failed",
}

export type FeedbackIn = {
    autoHideDelay?: number
}
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

export function useFeedback({ autoHideDelay = 1500 }: FeedbackIn = {}): FeedbackOut {
    const status = ref<FeedbackStatus>(FeedbackStatus.none)
    const message = ref<string>("")
    const error = ref<FeedbackError | undefined>(undefined)
    const isPending = computed(() => status.value === FeedbackStatus.pending)

    // only a success hides itself; every other state change cancels a hide still pending, or a failure or
    // a new pending shown within autoHideDelay of a success would be wiped by that success's timer
    let timeout: any

    function fadeOut() {
        if (autoHideDelay > 0) {
            clearTimeout(timeout)
            timeout = setTimeout(reset, autoHideDelay)
        }
    }

    function reset() {
        clearTimeout(timeout)
        status.value = FeedbackStatus.none
        message.value = ""
        error.value = undefined
    }
    function pending(msg: string) {
        clearTimeout(timeout)
        status.value = FeedbackStatus.pending
        message.value = msg
        error.value = undefined
    }
    function success(msg: string) {
        status.value = FeedbackStatus.success
        message.value = msg
        error.value = undefined
        autoHideDelay && fadeOut()
    }
    function fail(msg: string, errors: FeedbackError) {
        clearTimeout(timeout)
        status.value = FeedbackStatus.failed
        message.value = msg
        if (typeof errors === "string") {
            message.value = `${message.value}: ${errors.split("\n")[0]}`
        } else {
            // a caller who passes the exception itself instead of the field map gets its text rather than a
            // blank panel — tested on the instance, so a form field that happens to be named `message` stays a field
            error.value = (errors as unknown) instanceof Error ? (errors as unknown as Error).message : errors
        }
    }

    // reactive() unwraps the refs, so consumers never write `.value` — the internals keep using them
    return reactive({
        status,
        message,
        error,
        isPending,

        pending,
        success,
        fail,
        reset,
    }) as FeedbackOut
}

export default useFeedback
