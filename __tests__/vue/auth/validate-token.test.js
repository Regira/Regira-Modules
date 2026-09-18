import { describe, test, expect, beforeEach } from "vitest"
import { setActivePinia, createPinia } from "pinia"
import { createAuth } from "../../../src/vue/auth/auth"

// `auth/validate` has two terminal answers, and the client used to act on only one of them. 401 is "this
// token is not valid"; 403 is "the signature is fine but the user behind it is gone" — deleted, deactivated,
// or the database reseeded underneath it. Keeping the token on 403 made the failure permanent: every reload
// replayed the same rejection, the app rendered unauthenticated with no sign-in gate re-opened, and the only
// way out was clearing site data by hand.

const jwt = () => `header.${btoa(JSON.stringify({ sub: "1", name: "u", exp: 9999999999, nbf: 0 }))}.signature`

/** Auth wired over an axios stub whose `auth/validate` answers with the status you give it. */
function harness(status) {
    const tokenManager = { token: jwt() }
    const axios = {
        post: async () => {
            if (status >= 200 && status < 300) return { status, data: {} }
            // axios rejects a non-2xx with the response attached — the shape `validateToken` reads.
            const error = new Error(`Request failed with status code ${status}`)
            error.response = { status, config: { url: "auth/validate" } }
            error.config = { url: "auth/validate" }
            throw error
        },
    }
    const { service } = createAuth({ enabled: true, tokenManager, axios, clientApp: "MyApp" })
    return { service, tokenManager }
}

describe("validateToken", () => {
    beforeEach(() => setActivePinia(createPinia()))

    test.each([
        [401, "the token is rejected"],
        [403, "the token is valid but its user is gone"],
    ])("discards the stored token on %i — %s", async (status) => {
        const { service, tokenManager } = harness(status)

        const authData = await service.validateToken()

        expect(authData.isAuthenticated).toBeFalsy()
        // The load-bearing assertion: without this the next reload repeats the same dead state.
        expect(tokenManager.token).toBeUndefined()
    })

    test("keeps the token when validation succeeds", async () => {
        const { service, tokenManager } = harness(204)

        const authData = await service.validateToken()

        expect(authData.isAuthenticated).toBe(true)
        expect(tokenManager.token).toBeDefined()
    })

    test("keeps the token on a transient failure", async () => {
        // 500 or a dropped connection says nothing about the credential — signing the user out there would
        // turn a server hiccup into a forced re-login.
        const { service, tokenManager } = harness(500)

        await service.validateToken()

        expect(tokenManager.token).toBeDefined()
    })
})
