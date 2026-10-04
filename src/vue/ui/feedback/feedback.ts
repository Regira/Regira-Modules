import { computed, reactive, ref } from "vue"
import { formatText } from "../../lang/formatText"
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

// the entries an error can be shown from: a message, under a field key or none — an error of the whole entity. An entry
// in another shape is left out, not the list: its error is still in `errors`.
const readErrorDetails = (value: unknown): Array<ErrorDetail> =>
    Array.isArray(value)
        ? value.flatMap((d) =>
              d != null && typeof d === "object" && typeof d.message === "string" && (d.key == null || typeof d.key === "string")
                  ? [{ key: d.key ?? "", message: d.message, args: d.args != null && typeof d.args === "object" ? d.args : undefined }]
                  : []
          )
        : []

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
    const details = readErrorDetails(data?.errorDetails)
    const map = isFieldMap(data?.errors, true) ? data.errors : response?.status === 400 && isFieldMap(data, false) ? data : undefined
    if (details.length === 0 && !map) {
        return serverText(ex)
    }

    // one accumulator for both sources, so keys alike once lower-cased merge whichever source they come from. A Map, not
    // an object: on an object, a field named `constructor` or `toString` finds the inherited member
    const errors = new Map<string, Array<string>>()
    // a key the server sent one plain message under keeps that shape
    const asText = new Set<string>()
    const add = (detail: ErrorDetail, plain = false) => {
        const key = fieldKey(detail.key)
        const messages = [...(errors.get(key) ?? []), errorText(detail)]
        errors.set(key, messages)
        if (plain && messages.length === 1) {
            asText.add(key)
        } else {
            asText.delete(key)
        }
    }
    // errorDetails first, for its args; `errors` lists the same errors, perhaps in other words, and may list more fields
    // — a server merging model binding's errors with a rule refusal's — so a field errorDetails names is read from there
    // alone, and every other field from `errors`
    details.forEach((detail) => add(detail))
    const named = new Set(details.map((detail) => fieldKey(detail.key)))
    for (const [key, messages] of Object.entries(map ?? {})) {
        if (!named.has(fieldKey(key))) {
            for (const message of [messages].flat()) {
                add({ key, message }, typeof messages === "string")
            }
        }
    }
    return Object.fromEntries([...errors].map(([key, messages]) => [key, asText.has(key) ? messages[0]! : messages]))
}

/**
 * The messages of one field in a field-error map — `feedback.error`, or a client-side map — as an array: empty when the
 * field has none, or when `error` is text or unset. Only the map's own keys count, so a field named like a member every
 * object has (`constructor`, `toString`) never reads the inherited one; an empty message counts as none.
 */
export function fieldMessages(error: FeedbackError | null | undefined, name: string): Array<string> {
    if (error == null || typeof error !== "object") {
        return []
    }
    // read before the own-key test: Vue tracks the key while it is absent, so a field added later re-renders
    const messages = error[name]
    if (!Object.prototype.hasOwnProperty.call(error, name) || messages == null) {
        return []
    }
    return [messages].flat().filter((message) => message !== "")
}

/**
 * The heading a field's messages show under in the error summary: the field's key translated as its messages are
 * ({@link setErrorTranslator}, else the `useLang` messages), so the label an app gives a field heads its errors too;
 * else the key in words — `dueDate` reads "Due date", and a foreign key `categoryId` "Category". The key `""`, for the
 * errors of no one field, has no heading.
 */
export function fieldLabel(name: string): string {
    if (name === "") {
        return ""
    }
    try {
        const translated = errorTranslator(name, {})
        if (translated) {
            return translated
        }
    } catch (error) {
        console.error("Translating a field name failed", { name, error })
    }
    // a path (`lines[0].unitPrice`) or anything else that is not one identifier shows as sent
    if (!/^[A-Za-z][A-Za-z0-9]*$/.test(name)) {
        return name
    }
    const words = name
        .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
        .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
        .toLowerCase()
        .replace(/(.) id$/, "$1")
    return words.charAt(0).toUpperCase() + words.slice(1)
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
    (text: string): string =>
        // a message without the active language reaches here as undefined, for `translate` to try the fallback
        text == null ? text : formatText(text, args as Record<string, string>, { ignoreCase: true })

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
