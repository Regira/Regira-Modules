import { describe, test, expect, vi, afterEach } from "vitest"
import { AxiosHeaders } from "axios"
import { autoLogoutOnFailedRequest } from "../../../src/vue/auth/auth-axios"
import { AuthData } from "../../../src/vue/auth/AuthData"

// The response interceptor logs every rejected request for diagnostics. Console output is captured verbatim
// by breadcrumb and session-replay telemetry, so the bearer credential must not appear in it — it reaches
// the log through the Authorization header addBearerHeader put on the request.

const jwt = `header.${btoa(JSON.stringify({ sub: "1", name: "u", exp: 9999999999, nbf: 0 }))}.signature`

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
    const error = { message: "Request failed with status code 404", code: "ERR_BAD_REQUEST", config, response: { status: 404, data: {} } }
    return { config, error, reject: () => onRejected(error).catch(() => {}) }
}

afterEach(() => vi.restoreAllMocks())

describe("autoLogoutOnFailedRequest logging", () => {
    test("the Authorization header does not reach the console", async () => {
        const log = vi.spyOn(console, "error").mockImplementation(() => {})
        const { reject } = harness()

        await reject()

        const [, payload] = log.mock.calls[0]
        expect(JSON.stringify(payload)).not.toContain(jwt)
        expect(payload.config.headers.Authorization).not.toContain(jwt)
    })

    test("the diagnostics themselves survive — claims, status and the request that failed", async () => {
        const log = vi.spyOn(console, "error").mockImplementation(() => {})
        const { reject } = harness()

        await reject()

        const [, payload] = log.mock.calls[0]
        expect(payload.auth.name).toBe("u") // decoded claims are not the credential
        expect(payload.auth.isAuthenticated).toBe(true)
        expect(payload.error.status).toBe(404)
        expect(payload.error.message).toContain("404")
        expect(payload.config.url).toBe("products")
        expect(payload.config.headers.Accept).toBe("application/json")
    })

    test("the rejected error is untouched, so a retry still has the real header", async () => {
        vi.spyOn(console, "error").mockImplementation(() => {})
        const { config, reject } = harness()

        await reject()

        expect(config.headers.Authorization).toBe(`Bearer ${jwt}`)
    })
})
