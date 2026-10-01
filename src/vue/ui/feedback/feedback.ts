import { computed, reactive, ref } from "vue"
import { useLang } from "../../lang/useLang"

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

/** An entry of the `errorDetails` an Entities API lists its refusals in: one error, with the args a translation fills in. */
type ErrorDetail = { key: string; message: string; args?: Record<string, unknown> }

const isErrorDetails = (value: unknown): value is Array<ErrorDetail> =>
    Array.isArray(value) &&
    value.length > 0 &&
    value.every((d) => d != null && typeof d === "object" && typeof d.key === "string" && typeof d.message === "string")

// keys start lower-case whatever the server's naming policy, so they match the model's field names
const fieldKey = (key: string) => key.charAt(0).toLowerCase() + key.slice(1)

/**
 * What a failed request tells the user, in the shape `fail()` takes: its field errors, or else the server's own text
 * (`detail` of a ProblemDetails, a `message`, or a plain-text 400 body) — `undefined` when the response carries
 * neither.
 *
 * Reads the ProblemDetails an Entities API answers a 400 with (`{ title, status, errors }`), and a bare field map
 * (`{ CategoryId: ["…"] }`) too. Every message is paired with the app's translations — the {@link useLang} messages
 * unless {@link setErrorTranslator} says otherwise: a message that is a key there shows its translation, the error's
 * `args` in `errorDetails` filled into its placeholders; any other message shows as the server sent it. Keys start
 * lower-case whatever the server's naming policy, so they match the model's field names (`CategoryId` →
 * `categoryId`); an error that belongs to no field has the key `""`.
 */
export function toFeedbackError(ex: unknown): FeedbackError | undefined {
    const response = (ex as { response?: { status?: number; data?: unknown } } | undefined)?.response
    const data = response?.data as { errors?: unknown; errorDetails?: unknown; detail?: unknown; message?: unknown } | undefined
    // errorDetails holds what errors does, plus the args
    if (isErrorDetails(data?.errorDetails)) {
        // a Map, not an object: on an object, a field named `constructor` or `toString` finds the inherited member
        const errors = new Map<string, Array<string>>()
        for (const detail of data.errorDetails) {
            const key = fieldKey(detail.key)
            errors.set(key, [...(errors.get(key) ?? []), errorText(detail)])
        }
        return Object.fromEntries(errors)
    }
    const map = isFieldMap(data?.errors, true) ? data.errors : response?.status === 400 && isFieldMap(data, false) ? data : undefined
    if (map) {
        return Object.fromEntries(
            Object.entries(map).map(([key, messages]) => [
                fieldKey(key),
                typeof messages === "string" ? errorText({ key, message: messages }) : messages.map((message) => errorText({ key, message })),
            ])
        )
    }
    return serverText(ex)
}

/**
 * Translates one validation message of a failed request — a key, or a text the server sent to be shown as is: its
 * translation with `args` filled in, or `undefined` when the app has none, so the message shows as sent.
 */
export type ErrorTranslator = (message: string, args: Record<string, unknown>) => string | undefined

// the default: the useLang messages, in the active language and else the fallback one
const translateWithLang: ErrorTranslator = (message, args) => {
    const { messages, translate } = useLang()
    return messages.value[message] == null ? undefined : translate(message, fillArgs(args))
}
let errorTranslator: ErrorTranslator = translateWithLang

/**
 * Sets how {@link toFeedbackError} translates validation messages, for an app whose translations live elsewhere than
 * `useLang` — with vue-i18n, `setErrorTranslator((key, args) => (te(key) ? t(key, args) : undefined))`. Call it once at
 * startup; every entity form uses it from then on. `undefined` restores the default, the `useLang` messages.
 */
export function setErrorTranslator(translator: ErrorTranslator | undefined): void {
    errorTranslator = translator ?? translateWithLang
}

function errorText({ message, args }: ErrorDetail): string {
    try {
        return errorTranslator(message, args ?? {}) || message
    } catch (error) {
        // a failing translator must not cost the user the error itself
        console.error("Translating a validation message failed", { message, error })
        return message
    }
}

// fills `{name}` from the args regardless of case: a server whose serializer camelCases dictionary keys sends
// `maxLength` for a rule's `{MaxLength}`. A placeholder without an arg stays, as `formatText` leaves it.
const fillArgs =
    (args: Record<string, unknown> = {}) =>
    (text: string): string => {
        // a message without the active language reaches here as undefined, for `translate` to try the fallback
        if (text == null) {
            return text
        }
        const values = new Map(Object.entries(args).map(([name, value]) => [name.toLowerCase(), value]))
        return text.replace(/\{([^{}]+)\}/g, (placeholder, name: string) =>
            values.has(name.toLowerCase()) ? String(values.get(name.toLowerCase()) ?? "") : placeholder
        )
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
