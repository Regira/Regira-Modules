import { formatText } from "../lang/formatText"

/**
 * What went wrong: a field-error map keyed by field name, or a plain string. The API sends each field's
 * messages as an array (`{ title: ["Required"] }`); a client-side map may use single strings. NOT an `Error` —
 * log the exception yourself and pass {@link toFeedbackError}`(ex)`.
 */
export type FeedbackError = string | Record<string, string | Array<string>>

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

// each segment of a key's path starts lower-case whatever the server's naming policy, so it matches the model
const fieldKey = (key: string) => key.replace(/(^|\.)([A-Z])/g, (_, dot: string, letter: string) => dot + letter.toLowerCase())

/**
 * What a failed request tells the user, in the shape `fail()` takes: its field errors, or else the server's own text
 * (`detail` of a ProblemDetails, a `message`, or a plain-text 400 body) — `undefined` when the response carries
 * neither.
 *
 * Reads the ProblemDetails an Entities API answers a 400 with (`{ title, status, errors }`), and a bare field map
 * (`{ CategoryId: ["…"] }`) too. Every message is paired with the app's translations — in a Vue app the `useLang`
 * messages, unless {@link setErrorTranslator} says otherwise: a message that is a key there shows its translation, the error's
 * `args` in `errorDetails` filled into its placeholders; any other message shows as the server sent it. Each segment
 * of a key's path starts lower-case whatever the server's naming policy, so it matches the model's field names
 * (`CategoryId` → `categoryId`, `Lines[0].Quantity` → `lines[0].quantity`); an error that belongs to no field has the
 * key `""`.
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
 * ({@link setErrorTranslator}, else in a Vue app the `useLang` messages), so the label an app gives a field heads its errors too;
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

// The framework layer registers the default when it loads: the Vue layer's reads the `useLang` messages. An app's own
// translator, set with setErrorTranslator, wins over it whichever of the two is set first. With neither, a message
// shows as the server sent it.
let defaultTranslator: ErrorTranslator | undefined
let customTranslator: ErrorTranslator | undefined
const errorTranslator: ErrorTranslator = (message, args) => (customTranslator ?? defaultTranslator)?.(message, args)

/** Registers the translator {@link setErrorTranslator}`(undefined)` restores — called by a framework layer, once. */
export function setDefaultErrorTranslator(translator: ErrorTranslator | undefined): void {
    defaultTranslator = translator
}

/**
 * Sets how {@link toFeedbackError} translates validation messages, for an app whose translations live elsewhere than
 * `useLang` — with vue-i18n, `setErrorTranslator((key, args) => (te(key) ? t(key, args) : undefined))`. Call it once at
 * startup; every entity form uses it from then on. `undefined` restores the default — in a Vue app, the `useLang`
 * messages; with no framework layer, none.
 */
export function setErrorTranslator(translator: ErrorTranslator | undefined): void {
    customTranslator = translator
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
export const fillArgs =
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
