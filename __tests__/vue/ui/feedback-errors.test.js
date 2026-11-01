import { describe, test, expect, vi, afterEach } from "vitest"
import { toFeedbackError, setErrorTranslator, fieldMessages } from "../../../src/vue/ui/feedback"
import { useLang } from "../../../src/vue/lang/useLang"

// What a failed request tells the user: the field map an Entities API answers a rule breach (EntityInputException) and a
// model binding failure with, in a ProblemDetails' `errors` or bare, and the server's own text when no field is named.
// The form's use of it is a shared scenario (__tests__/contract/form.test.js).

describe("toFeedbackError", () => {
    test("reads the server's message from a body without field errors", () => {
        expect(toFeedbackError({ response: { status: 404, data: { message: "Not found" } } })).toBe("Not found")
    })

    test("does not take a 400 body of plain strings for field errors", () => {
        expect(toFeedbackError({ response: { status: 400, data: { message: "Bad input" } } })).toBe("Bad input")
    })

    test("ignores a ProblemDetails without errors", () => {
        expect(toFeedbackError({ response: { status: 400, data: { title: "Bad Request", status: 400 } } })).toBeUndefined()
    })

    test("keeps the empty key of an error that belongs to no field", () => {
        expect(toFeedbackError({ response: { status: 400, data: { "": ["Credits must be positive."] } } })).toEqual({
            "": ["Credits must be positive."],
        })
    })

    test("reads a plain-text 400 body as the server's message", () => {
        expect(toFeedbackError({ response: { status: 400, data: "Name taken" } })).toBe("Name taken")
    })

    test("ignores a plain-text body on another status, such as an error page", () => {
        expect(toFeedbackError({ response: { status: 500, data: "<html>…</html>" } })).toBeUndefined()
    })

    test("falls through an empty detail to the message", () => {
        expect(toFeedbackError({ response: { status: 409, data: { detail: "", message: "Still referenced" } } })).toBe("Still referenced")
    })

    test("answers undefined for a network failure", () => {
        expect(toFeedbackError(new Error("Network Error"))).toBeUndefined()
    })

    // ASP.NET names a nested field by its path: each segment starts lower-case, as the model's own field names do
    test("starts every segment of a nested key's path lower-case, from errorDetails as from errors", () => {
        const fromDetails = toFeedbackError({
            response: { status: 400, data: { errors: {}, errorDetails: [{ key: "Lines[0].Quantity", message: "Must be positive." }] } },
        })
        const fromErrors = toFeedbackError({ response: { status: 400, data: { errors: { "Lines[0].Quantity": ["Must be positive."] } } } })

        expect(fieldMessages(fromDetails, "lines[0].quantity")).toEqual(["Must be positive."])
        expect(fieldMessages(fromErrors, "lines[0].quantity")).toEqual(["Must be positive."])
    })
})

// What a validator adds is a text or a translation key: every message is paired with the app's translation messages,
// and `errorDetails` beside `errors` carries the args a translation fills in
describe("toFeedbackError pairs messages with translation keys", () => {
    const refusal = (errorDetails) => ({
        response: {
            status: 400,
            data: {
                title: "One or more validation errors occurred.",
                status: 400,
                errors: Object.fromEntries(errorDetails.map((d) => [d.key, [d.message]])),
                errorDetails,
            },
        },
    })
    const tooLarge = { key: "Total", message: "ValueTooLarge", args: { max: 10000 } }

    afterEach(() => {
        setLang("", {})
        setErrorTranslator(undefined)
        vi.restoreAllMocks()
    })

    test("shows the translation of a message that is a key, its placeholders filled from the args", () => {
        setLang("nl", { ValueTooLarge: { en: "At most {max}", nl: "Maximaal {max}" } })

        expect(toFeedbackError(refusal([tooLarge, { key: "Total", message: "Must be a whole number." }]))).toEqual({
            total: ["Maximaal 10000", "Must be a whole number."],
        })
    })

    test("shows a key the app has no translation of as the server sent it", () => {
        setLang("nl", { ValueTooSmall: { nl: "Minimaal {min}" } })

        expect(toFeedbackError(refusal([tooLarge]))).toEqual({ total: ["ValueTooLarge"] })
    })

    test("falls back to the fallback language, then to the message", () => {
        setLang("fr", { ValueTooLarge: { en: "At most {max}" } }, "en")
        expect(toFeedbackError(refusal([tooLarge]))).toEqual({ total: ["At most 10000"] })

        setLang("fr", { ValueTooLarge: { nl: "Maximaal {max}" } }, "en")
        expect(toFeedbackError(refusal([tooLarge]))).toEqual({ total: ["ValueTooLarge"] })
    })

    // a host whose serializer camelCases dictionary keys sends a FluentValidation rule's {MaxLength} as maxLength
    test("fills a placeholder whatever the case of its arg's name", () => {
        setLang("en", { TooLong: "At most {MaxLength} characters ({TotalLength} given), {Unknown}" })
        const detail = { key: "title", message: "TooLong", args: { maxLength: 20, totalLength: 23 } }

        expect(toFeedbackError(refusal([detail]))).toEqual({ title: ["At most 20 characters (23 given), {Unknown}"] })
    })

    test("translates the messages of a field map without errorDetails too", () => {
        setLang("nl", { Required: { nl: "Verplicht" } })

        expect(toFeedbackError({ response: { status: 400, data: { errors: { Title: ["Required"], Code: "Too short." } } } })).toEqual({
            title: ["Verplicht"],
            code: "Too short.",
        })
    })

    test("keeps a field named like a member every object has", () => {
        expect(
            toFeedbackError(
                refusal([
                    { key: "Constructor", message: "Required" },
                    { key: "ToString", message: "Too long" },
                    { key: "ToString", message: "Upper case only" },
                ])
            )
        ).toEqual({ constructor: ["Required"], toString: ["Too long", "Upper case only"] })
        expect(Object.hasOwn(toFeedbackError(refusal([{ key: "__proto__", message: "Required" }])), "__proto__")).toBe(true)
    })

    // a server merging model binding's errors with a rule refusal lists those in `errors` only
    test("keeps a message errors lists beyond errorDetails", () => {
        setLang("nl", { ValueTooLarge: { nl: "Maximaal {max}" } })
        const ex = refusal([tooLarge])
        ex.response.data.errors = { Title: ["Required"], Total: ["ValueTooLarge"] }

        expect(toFeedbackError(ex)).toEqual({ total: ["Maximaal 10000"], title: ["Required"] })
    })

    // a server may word a field's errors in `errors` and give their keys in errorDetails: the field shows them once
    test("shows a field errorDetails names from errorDetails alone", () => {
        setLang("en", { ValueTooLarge: { en: "At most {max}" } })
        const ex = refusal([{ key: "Name", message: "ValueTooLarge", args: { max: 50 } }])
        ex.response.data.errors = { Name: ["At most 50 characters"] }

        expect(toFeedbackError(ex)).toEqual({ name: ["At most 50"] })
    })

    // one entry in another shape — no message, a key that is no text — costs that entry, not the others' args
    test("reads every well-formed entry of errorDetails, a missing key as the whole entity's", () => {
        setLang("nl", { ValueTooLarge: { nl: "Maximaal {max}" } })
        const ex = refusal([tooLarge, { key: null, message: "Locked" }, { key: 7, message: "Too short" }])
        ex.response.data.errors = { Total: ["ValueTooLarge"] }

        expect(toFeedbackError(ex)).toEqual({ total: ["Maximaal 10000"], "": ["Locked"] })
    })

    test("merges the messages of keys alike once lower-cased, from errors as from errorDetails", () => {
        expect(toFeedbackError({ response: { status: 400, data: { errors: { Title: ["Required"], title: ["Too short"] } } } })).toEqual({
            title: ["Required", "Too short"],
        })
    })

    test("keeps the empty key of an error that belongs to no field", () => {
        expect(toFeedbackError(refusal([{ key: "", message: "A locked order cannot be deleted." }]))).toEqual({
            "": ["A locked order cannot be deleted."],
        })
    })

    // an app on another i18n library — vue-i18n's te/t, here a stand-in over one dictionary
    describe("with setErrorTranslator", () => {
        const dictionary = { ValueTooLarge: "Maximaal {max}" }
        const te = (key) => key in dictionary
        const t = (key, args) => dictionary[key].replace(/\{(\w+)\}/g, (_, name) => String(args[name]))

        test("translates through the app's own translator, which receives the args as sent", () => {
            const translator = vi.fn((key, args) => (te(key) ? t(key, args) : undefined))
            setErrorTranslator(translator)
            // the useLang messages are not consulted any more
            setLang("en", { "Must be a whole number.": "Whole numbers only" })

            expect(toFeedbackError(refusal([tooLarge, { key: "Total", message: "Must be a whole number." }]))).toEqual({
                total: ["Maximaal 10000", "Must be a whole number."],
            })
            expect(translator).toHaveBeenCalledWith("ValueTooLarge", { max: 10000 })
            expect(translator).toHaveBeenCalledWith("Must be a whole number.", {})
        })

        test("shows the message when the translator has none or fails", () => {
            const logged = vi.spyOn(console, "error").mockImplementation(() => {})
            setErrorTranslator((key) => {
                if (key === "Broken") throw new Error("no such message")
                return ""
            })

            expect(toFeedbackError(refusal([tooLarge, { key: "Total", message: "Broken" }]))).toEqual({ total: ["ValueTooLarge", "Broken"] })
            expect(logged).toHaveBeenCalledOnce()
        })

        test("undefined restores the useLang messages", () => {
            setErrorTranslator(() => "custom")
            setErrorTranslator(undefined)
            setLang("en", { ValueTooLarge: "At most {max}" })

            expect(toFeedbackError(refusal([tooLarge]))).toEqual({ total: ["At most 10000"] })
        })
    })

    function setLang(lang, messages, fallback = "") {
        const { replaceMessages, langCode, fallbackLangCode } = useLang()
        replaceMessages(messages)
        langCode.value = lang
        fallbackLangCode.value = fallback
    }
})
