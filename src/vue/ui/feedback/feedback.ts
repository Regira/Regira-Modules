import { computed, ref, type ComputedRef, type Ref } from "vue"

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
 * What went wrong, as the API reports it: a field-error map (`{ title: "Required" }` — the 400 body an
 * `EntityInputException`'s `InputErrors` produces) or a plain string. NOT an `Error` — log the exception
 * yourself and pass `ex.response?.data?.errors`.
 */
export type FeedbackError = string | Record<string, string>
export interface FeedbackOut {
    status: Ref<FeedbackStatus>
    message: Ref<string>
    error: Ref<FeedbackError | undefined>
    /** busy flag — `status === FeedbackStatus.pending`, so a view can disable its buttons without re-deriving it */
    isPending: ComputedRef<boolean>

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
}
export const feedbackDefaults = {
    hideCloseButton: false,
    enableErrorPopup: false,
}
export type FeedbackSlots = {
    "close-button"?(): any
    pending?(): any
    success?(): any
    error?(): any
}

export function useFeedback({ autoHideDelay = 1500 }: FeedbackIn = {}): FeedbackOut {
    const status = ref<FeedbackStatus>(FeedbackStatus.none)
    const message = ref<string>("")
    const error = ref<FeedbackError | undefined>(undefined)
    const isPending = computed(() => status.value === FeedbackStatus.pending)

    let timeout: any

    function fadeOut() {
        if (autoHideDelay > 0) {
            clearTimeout(timeout)
            timeout = setTimeout(reset, autoHideDelay)
        }
    }

    function reset() {
        status.value = FeedbackStatus.none
        message.value = ""
        error.value = undefined
    }
    function pending(msg: string) {
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
        status.value = FeedbackStatus.failed
        message.value = msg
        if (typeof errors === "string") {
            message.value = `${message.value}: ${errors.split("\n")[0]}`
        } else {
            // `message` first: a caller who passes an exception object instead of the field map gets its text
            // rather than a blank panel.
            error.value = errors?.message || errors
        }
    }

    return {
        status,
        message,
        error,
        isPending,

        pending,
        success,
        fail,
        reset,
    }
}

export default useFeedback
