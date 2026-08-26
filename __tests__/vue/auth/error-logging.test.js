import { describe, test, expect, vi, afterEach } from "vitest"
import { AxiosHeaders } from "axios"
import { autoLogoutOnFailedRequest } from "../../../src/vue/auth/auth-axios"
import { maskAxiosError, maskCredentials, registerCredentialUrls, registerLoginUrl, resetCredentialUrls } from "../../../src/vue/auth/error-logging"
import { AuthService } from "../../../src/vue/auth/auth-service"
import { createAuth } from "../../../src/vue/auth/auth"
import { useChangePasswordForm } from "../../../src/vue/auth/useChangePasswordForm"
import { AuthData } from "../../../src/vue/auth/AuthData"

// Everything this module logs goes through maskAxiosError, because console output is captured verbatim by
// breadcrumb and session-replay telemetry and an axios error carries the request that produced it. Every
// credential the module handles rides that request: the bearer token on the Authorization header
// addBearerHeader put there, the password and the reset token in the body (login, changePassword and
// resetPassword all post on this same instance — a wrong password is the most frequent error of all), and
// a refresh token in the query string.

const jwt = `header.${btoa(JSON.stringify({ sub: "1", name: "u", exp: 9999999999, nbf: 0 }))}.signature`

const axiosError = (config, { status = 401, message = "Request failed" } = {}) => ({
    message,
    code: "ERR_BAD_REQUEST",
    config,
    response: { status, data: {} },
})

function harness() {
    let onRejected
    const axios = { interceptors: { response: { use: (_onFulfilled, onError) => (onRejected = onError) } } }
    const store = {
        isAuthenticated: true,
        authData: new AuthData(jwt, { isAuthenticated: true }),
        $patch: () => {},
        validateToken: async () => true,
    }
    autoLogoutOnFailedRequest(axios, store)

    // the real header bag, not a plain object: AxiosHeaders is what addBearerHeader writes into, and the
    // masking only works because its entries are own enumerable properties
    const headers = new AxiosHeaders()
    headers["Authorization"] = `Bearer ${jwt}`
    headers["Accept"] = "application/json"
    const config = { url: "products", method: "get", headers }
    const error = axiosError(config, { status: 404, message: "Request failed with status code 404" })
    return { config, error, reject: () => onRejected(error).catch(() => {}) }
}

/** the interceptor over a request that carries credentials the way AuthService sends them */
function authCallHarness(config) {
    let onRejected
    const axios = { interceptors: { response: { use: (_onFulfilled, onError) => (onRejected = onError) } } }
    const store = { isAuthenticated: false, authData: new AuthData(), $patch: () => {}, validateToken: async () => true }
    autoLogoutOnFailedRequest(axios, store)

    const error = axiosError({ method: "post", headers: new AxiosHeaders(), ...config })
    return { reject: () => onRejected(error).catch(() => {}) }
}

afterEach(() => {
    vi.restoreAllMocks()
    registerLoginUrl(undefined) // module-level, like the auth setup that registers it
    resetCredentialUrls()
})

describe("autoLogoutOnFailedRequest logging", () => {
    test("the Authorization header does not reach the console", async () => {
        const log = vi.spyOn(console, "error").mockImplementation(() => {})
        const { reject } = harness()

        await reject()

        const [, payload] = log.mock.calls[0]
        expect(JSON.stringify(payload)).not.toContain(jwt)
        expect(payload.error.config.headers.Authorization).not.toContain(jwt)
    })

    test("the diagnostics themselves survive — claims, status and the request that failed", async () => {
        const log = vi.spyOn(console, "error").mockImplementation(() => {})
        const { reject } = harness()

        await reject()

        const [, payload] = log.mock.calls[0]
        expect(payload.auth.name).toBe("u") // the named diagnostics are not the credential
        expect(payload.auth.isAuthenticated).toBe(true)
        expect(payload.error.status).toBe(404)
        expect(payload.error.message).toContain("404")
        expect(payload.error.config.url).toBe("products")
        expect(payload.error.config.headers.Accept).toBe("application/json")
    })

    test("the login body does not reach the console", async () => {
        const log = vi.spyOn(console, "error").mockImplementation(() => {})
        const { reject } = authCallHarness({ url: "auth?clientApp=app", data: JSON.stringify({ username: "bram", password: "hunter2" }) })

        await reject()

        const [, payload] = log.mock.calls[0]
        expect(JSON.stringify(payload)).not.toContain("hunter2")
        expect(payload.error.config.data).toBe("<redacted>")
        expect(payload.error.config.url).toBe("auth?<redacted>") // the endpoint survives, its parameters do not
        expect(payload.error.status).toBe(401)
    })

    test("the axios instance itself is not logged", async () => {
        const log = vi.spyOn(console, "error").mockImplementation(() => {})
        const { reject } = harness()

        await reject()

        const [, payload] = log.mock.calls[0]
        expect(payload).not.toHaveProperty("axios")
    })

    test("a request that failed before it was built carries no config, and still logs", async () => {
        const log = vi.spyOn(console, "error").mockImplementation(() => {})
        let onRejected
        const axios = { interceptors: { response: { use: (_onFulfilled, onError) => (onRejected = onError) } } }
        const store = { isAuthenticated: false, authData: new AuthData(), $patch: () => {}, validateToken: async () => true }
        autoLogoutOnFailedRequest(axios, store)

        await onRejected({ message: "Network Error", code: "ERR_NETWORK" }).catch(() => {})

        const [, payload] = log.mock.calls[0]
        expect(payload.error.message).toBe("Network Error")
    })

    test("the rejected error is untouched, so a retry still has the real header", async () => {
        vi.spyOn(console, "error").mockImplementation(() => {})
        const { config, reject } = harness()

        await reject()

        expect(config.headers.Authorization).toBe(`Bearer ${jwt}`)
    })
})

// The masking decides per URL, so the boundary is the thing to pin down: every endpoint that carries a
// credential, and nothing that merely looks like one.
describe("maskCredentials — which endpoints are credential-bearing", () => {
    test.each([
        ["auth?clientApp=app", { username: "bram", password: "hunter2" }],
        ["auth/password", { currentPassword: "hunter2", newPassword: "hunter3" }],
        ["auth/password/reset", { token: "reset-token", password: "hunter3" }],
        ["https://api.host/auth", { username: "bram", password: "hunter2" }], // absolute, or prefixed by a baseURL
    ])("%s: the body is dropped", (url, body) => {
        const masked = maskCredentials({ url, data: JSON.stringify(body) })

        expect(masked.data).toBe("<redacted>")
        for (const secret of Object.values(body)) {
            expect(JSON.stringify(masked)).not.toContain(secret)
        }
    })

    test.each(["products", "oauth/token", "/api/authors"])("%s: the body is a diagnostic, and survives", (url) => {
        expect(maskCredentials({ url, data: JSON.stringify({ title: "chair" }) }).data).toContain("chair")
    })

    test("a refresh token in the query string is dropped — `refresh` posts no body at all", () => {
        // AuthService.refresh builds `auth/refresh/?<params>` and posts nothing, so masking the body alone
        // would leave the credential sitting in the logged url
        const masked = maskCredentials({ url: "auth/refresh/?refreshToken=hunter2&clientApp=app" })

        expect(masked.url).toBe("auth/refresh/?<redacted>")
        expect(JSON.stringify(masked)).not.toContain("hunter2")
    })

    test("params and axios' own basic-auth field are dropped too", () => {
        const masked = maskCredentials({
            url: "auth/refresh/",
            params: { refreshToken: "hunter2" },
            auth: { username: "u", password: "hunter2" },
        })

        expect(masked.params).toBe("<redacted>")
        expect(masked.auth).toBe("<redacted>")
        expect(JSON.stringify(masked)).not.toContain("hunter2")
    })

    test("a configured loginUrl outside `auth/` is credential-bearing as well", () => {
        // IAuthOptions.loginUrl is public — createAuth registers it, since nothing in such a URL says "auth"
        registerLoginUrl("account/login")

        expect(maskCredentials({ url: "account/login?clientApp=app", data: '{"password":"hunter2"}' }).data).toBe("<redacted>")
        expect(maskCredentials({ url: "https://api.host/account/login", data: '{"password":"hunter2"}' }).data).toBe("<redacted>")
        expect(maskCredentials({ url: "account/profile", data: '{"title":"chair"}' }).data).toContain("chair")
    })

    test("createAuth registers the configured loginUrl", () => {
        createAuth({ enabled: true, tokenManager: { token: undefined }, axios: { post: async () => ({ data: {} }) }, loginUrl: "account/login" })

        expect(maskCredentials({ url: "account/login", data: '{"password":"hunter2"}' }).data).toBe("<redacted>")
    })

    test("nothing is mutated — the caller keeps the real request for a retry", () => {
        const config = { url: "auth", data: '{"password":"hunter2"}', headers: { Authorization: `Bearer ${jwt}` } }

        maskCredentials(config)

        expect(config.data).toBe('{"password":"hunter2"}')
        expect(config.headers.Authorization).toBe(`Bearer ${jwt}`)
    })
})

// The interceptor is installed on the app's shared axios instance, so it logs every failed request the SPA
// makes — but only this module's endpoints are credential-bearing by construction. An application says
// which of its OWN endpoints post a password, and the boundary is what needs pinning: registered paths lose
// their body, everything else keeps it as the diagnostic it is.
describe("application-registered credential endpoints", () => {
    test("a registered path loses its body, wherever a baseURL puts it", () => {
        registerCredentialUrls("invitations/accept")

        expect(maskCredentials({ url: "invitations/accept", data: '{"password":"hunter2"}' }).data).toBe("<redacted>")
        expect(maskCredentials({ url: "https://api.host/v2/invitations/accept", data: '{"password":"hunter2"}' }).data).toBe("<redacted>")
    })

    test("`*` stands for exactly one segment, so an id in the path is covered", () => {
        registerCredentialUrls("users/*/password")

        expect(maskCredentials({ url: "users/123/password", data: '{"newPassword":"hunter2"}' }).data).toBe("<redacted>")
        expect(maskCredentials({ url: "users/me/password", data: '{"newPassword":"hunter2"}' }).data).toBe("<redacted>")
        // one segment, not "the rest of the path" — a deeper route is a different endpoint
        expect(maskCredentials({ url: "users/123/devices/password", data: '{"title":"chair"}' }).data).toContain("chair")
    })

    test("a RegExp is matched against the path, without query string or outer slashes", () => {
        registerCredentialUrls(/(^|\/)tokens\//)

        expect(maskCredentials({ url: "/admin/tokens/issue?scope=all", data: '{"secret":"hunter2"}' }).data).toBe("<redacted>")
        expect(maskCredentials({ url: "admin/tokenshop", data: '{"title":"chair"}' }).data).toContain("chair")
    })

    test("registration is additive, and unregistered endpoints keep their body", () => {
        registerCredentialUrls("invitations/accept")
        registerCredentialUrls("users/*/password")

        expect(maskCredentials({ url: "invitations/accept", data: '{"password":"hunter2"}' }).data).toBe("<redacted>")
        expect(maskCredentials({ url: "users/1/password", data: '{"password":"hunter2"}' }).data).toBe("<redacted>")
        // the guarantee an app has to opt into: this one was never registered
        expect(maskCredentials({ url: "users", data: '{"password":"hunter2"}' }).data).toContain("hunter2")
    })

    test("the Authorization header is masked on every request, registered or not", () => {
        // the header needs no registration — addBearerHeader puts it on everything
        const masked = maskCredentials({ url: "products", headers: { Authorization: `Bearer ${jwt}` } })

        expect(masked.headers.Authorization).toBe("<redacted>")
    })

    test("createAuth registers its credentialUrls option, and re-running it replaces the list", () => {
        const setup = (credentialUrls) =>
            createAuth({ enabled: true, tokenManager: { token: undefined }, axios: { post: async () => ({ data: {} }) }, credentialUrls })

        setup(["invitations/accept"])
        expect(maskCredentials({ url: "invitations/accept", data: '{"password":"hunter2"}' }).data).toBe("<redacted>")

        // one auth setup owns the option-provided list — a second run must not inherit the first's
        setup(["users/*/password"])
        expect(maskCredentials({ url: "users/1/password", data: '{"password":"hunter2"}' }).data).toBe("<redacted>")
        expect(maskCredentials({ url: "invitations/accept", data: '{"password":"hunter2"}' }).data).toContain("hunter2")
    })
})

// AuthData._decodedToken is private to TypeScript only — at runtime it is an ordinary own enumerable
// property, so `{ ...store.authData }` would ship the whole decoded claim bag to telemetry that captures
// console output verbatim. The log names the fields it wants instead.
describe("the signed-in user is logged by named field", () => {
    test("the decoded claim bag does not reach the console", async () => {
        const log = vi.spyOn(console, "error").mockImplementation(() => {})
        const token = `header.${btoa(JSON.stringify({ sub: "1", name: "u", role: "admin", ssn: "hunter2", exp: 9999999999, nbf: 0 }))}.signature`
        let onRejected
        const axios = { interceptors: { response: { use: (_onFulfilled, onError) => (onRejected = onError) } } }
        const store = {
            isAuthenticated: true,
            authData: new AuthData(token, { isAuthenticated: true }),
            $patch: () => {},
            validateToken: async () => true,
        }
        autoLogoutOnFailedRequest(axios, store)

        await onRejected(axiosError({ url: "products", headers: new AxiosHeaders() }, { status: 404 })).catch(() => {})

        const [, payload] = log.mock.calls[0]
        expect(payload.auth).toEqual({ isAuthenticated: true, userId: "1", name: "u", role: "admin" })
        expect(payload.auth).not.toHaveProperty("_decodedToken")
        expect(JSON.stringify(payload)).not.toContain("hunter2") // a custom claim the app never meant to log
    })
})

// validateToken runs on every app load that restores a saved token, and its catch fires on any 401 or
// network blip — the most routine log in the module, over a token that is replayable until it expires.
describe("AuthService.validateToken logging", () => {
    const loggedArgs = (call) => call.map((a) => JSON.stringify(a)).join()

    test("the token reaches neither the message nor the logged error", async () => {
        const log = vi.spyOn(console, "error").mockImplementation(() => {})
        const headers = new AxiosHeaders()
        headers["Authorization"] = `Bearer ${jwt}`
        const axios = { post: async () => Promise.reject(axiosError({ url: "auth/validate", headers })) }
        const service = new AuthService(axios, { token: jwt })

        await service.validateToken()

        expect(loggedArgs(log.mock.calls[0])).not.toContain(jwt)
    })

    test("an invalid status logs the status, and no token bag with it", async () => {
        const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
        const service = new AuthService({ post: async () => ({ status: 400 }) }, { token: jwt })

        await service.validateToken()

        expect(loggedArgs(warn.mock.calls[0])).not.toContain(jwt)
        expect(warn.mock.calls[0]).toContain(400)
    })
})

// The form composables log their own failure too — and the request they log is the one carrying the password.
describe("form composables", () => {
    test("changePassword's failure log prints neither password", async () => {
        const log = vi.spyOn(console, "error").mockImplementation(() => {})
        const axios = {
            post: async (url, data) => Promise.reject(axiosError({ url, data: JSON.stringify(data), headers: new AxiosHeaders() }, { status: 400 })),
        }
        createAuth({ enabled: true, tokenManager: { token: undefined }, axios })
        const form = useChangePasswordForm(() => {})
        form.currentPassword.value = "hunter2"
        form.newPassword.value = "hunter3"
        form.confirmPassword.value = "hunter3"

        await form.handleSubmit()

        expect(form.isSuccess.value).toBe(false)
        const [, payload] = log.mock.calls[0]
        expect(JSON.stringify(payload)).not.toContain("hunter2")
        expect(JSON.stringify(payload)).not.toContain("hunter3")
        expect(payload.config.url).toBe("auth/password") // it still says which call failed
    })
})

describe("maskAxiosError", () => {
    test("logs the error field by field — never the error object that carries the request", () => {
        const headers = new AxiosHeaders()
        headers["Authorization"] = `Bearer ${jwt}`
        const ex = axiosError({ url: "auth", data: '{"password":"hunter2"}', headers }, { message: "Request failed with status code 401" })
        ex.stack = "Error: Request failed"

        const masked = maskAxiosError(ex)

        expect(JSON.stringify(masked)).not.toContain("hunter2")
        expect(JSON.stringify(masked)).not.toContain(jwt)
        expect(masked.status).toBe(401)
        expect(masked.message).toContain("401")
        expect(masked.stack).toBe("Error: Request failed")
    })
})
