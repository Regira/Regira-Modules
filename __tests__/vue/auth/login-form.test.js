import { describe, test, expect, vi, beforeEach, afterEach } from "vitest"
import { AxiosHeaders } from "axios"
import { setActivePinia, createPinia } from "pinia"
import { createAuth } from "../../../src/vue/auth/auth"
import { useLoginForm } from "../../../src/vue/auth/useLoginForm"

// POST auth answers 401 with the sign-in result as its body (camelCase): `isLockedOut` after too many tries,
// `isNotAllowed` when the password was right but the account, e-mail or phone is not confirmed yet.
const refusal = (url, data, body) => ({
    message: "Request failed with status code 401",
    code: "ERR_BAD_REQUEST",
    config: { url, method: "post", data: JSON.stringify(data), headers: new AxiosHeaders() },
    response: { status: 401, data: body },
})

/** a login form over the real store, whose POST auth answers each attempt from `answers` in turn */
function harness(answers) {
    setActivePinia(createPinia())
    const axios = { post: async (url, data) => Promise.reject(refusal(url, data, answers.shift())) }
    createAuth({ enabled: true, tokenManager: { token: undefined }, axios })
    const events = []
    const form = useLoginForm({ username: "bram" }, (event) => events.push(event))
    form.password.value = "hunter2"
    return { form, events }
}

let log
beforeEach(() => {
    log = vi.spyOn(console, "error").mockImplementation(() => {})
})
afterEach(() => vi.restoreAllMocks())

describe("useLoginForm refusals", () => {
    test("an unconfirmed account sets isNotAllowed", async () => {
        const { form, events } = harness([{ isAuthenticated: false, isLockedOut: false, isNotAllowed: true }])

        await form.handleSubmit()

        expect(form.failed.value).toBe(true)
        expect(form.isNotAllowed.value).toBe(true)
        expect(form.isLockedOut.value).toBe(false)
        expect(events).toEqual(["signingIn", "fail"])
    })

    test("a lockout sets isLockedOut", async () => {
        const { form } = harness([{ isAuthenticated: false, isLockedOut: true, isNotAllowed: false }])

        await form.handleSubmit()

        expect(form.failed.value).toBe(true)
        expect(form.isLockedOut.value).toBe(true)
        expect(form.isNotAllowed.value).toBe(false)
    })

    test("a wrong password sets neither flag", async () => {
        const { form } = harness([{ isAuthenticated: false, isLockedOut: false, isNotAllowed: false }])

        await form.handleSubmit()

        expect(form.failed.value).toBe(true)
        expect(form.isLockedOut.value).toBe(false)
        expect(form.isNotAllowed.value).toBe(false)
    })

    test("the next attempt clears the previous attempt's flags", async () => {
        const { form } = harness([
            { isAuthenticated: false, isLockedOut: true, isNotAllowed: false },
            { isAuthenticated: false, isLockedOut: false, isNotAllowed: true },
            {},
        ])

        await form.handleSubmit()
        await form.handleSubmit()
        expect(form.isLockedOut.value).toBe(false)
        expect(form.isNotAllowed.value).toBe(true)

        await form.handleSubmit()
        expect(form.isLockedOut.value).toBe(false)
        expect(form.isNotAllowed.value).toBe(false)
    })

    test("the logged refusal carries no password", async () => {
        const { form } = harness([{ isAuthenticated: false, isLockedOut: false, isNotAllowed: true }])

        await form.handleSubmit()

        expect(log).toHaveBeenCalled()
        expect(JSON.stringify(log.mock.calls)).not.toContain("hunter2")
    })
})
