import { computed, reactive, ref } from "vue"

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
 * What went wrong: a field-error map keyed by field name, or a plain string. The API sends each field's
 * messages as an array (`{ title: ["Required"] }`); a client-side map may use single strings. NOT an `Error` —
 * log the exception yourself and pass {@link toFeedbackError}`(ex)`.
 */
export type FeedbackError = string | Record<string, string | Array<string>>
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

const isMessages = (v: unknown): v is Array<string> => Array.isArray(v) && v.every((x) => typeof x === "string")
// a map under an explicit `errors` key may hold single messages; an unwrapped body counts only in the shape an
// Entities API sends — every field an array — so a plain `{ message }` body is not taken for a field
const isFieldMap = (value: unknown, allowSingle: boolean): value is Record<string, string | Array<string>> =>
    value != null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.keys(value).length > 0 &&
    Object.values(value).every((v) => isMessages(v) || (allowSingle && typeof v === "string"))

/**
 * What a failed request tells the user, in the shape `fail()` takes: its field errors, or else the server's own text
 * (`detail` of a ProblemDetails, a `message`, or a plain-text 400 body) — `undefined` when the response carries
 * neither.
 *
 * Reads both 400 bodies an Entities API sends: the ProblemDetails of model binding (`{ title, status, errors }`)
 * and the flat map an `EntityInputException` produces (`{ CategoryId: ["…"] }`, no `errors` wrapper). Keys start
 * lower-case whatever the server's naming policy, so they match the model's field names (`CategoryId` →
 * `categoryId`); an error that belongs to no field has the key `""`.
 */
export function toFeedbackError(ex: unknown): FeedbackError | undefined {
    const response = (ex as { response?: { status?: number; data?: unknown } } | undefined)?.response
    const data = response?.data as { errors?: unknown; detail?: unknown; message?: unknown } | undefined
    const map = isFieldMap(data?.errors, true) ? data.errors : response?.status === 400 && isFieldMap(data, false) ? data : undefined
    if (map) {
        return Object.fromEntries(Object.entries(map).map(([key, messages]) => [key.charAt(0).toLowerCase() + key.slice(1), messages]))
    }
    return serverText(ex)
}

// the server's own text for a failed request (`detail`, `message`, or a plain-text 400 body), if it sent any
function serverText(ex: unknown): string | undefined {
    const response = (ex as { response?: { status?: number; data?: unknown } } | undefined)?.response
    const data = response?.data as { detail?: unknown; message?: unknown } | string | undefined
    if (typeof data === "string") {
        return response?.status === 400 && data ? data : undefined
    }
    return [data?.detail, data?.message].find((text): text is string => typeof text === "string" && text !== "")
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
