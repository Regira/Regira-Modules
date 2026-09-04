import { describe, test, expect, beforeEach } from "vitest"
import { ref } from "vue"
import { setActivePinia, createPinia } from "pinia"
import { AuthData } from "../../../src/vue/auth/AuthData"
import { useAuthStore } from "../../../src/vue/auth/store"

// authData travels further than it looks: the plugin hands it straight to onAuthenticationChange — whose
// documented use is welcoming the user and preloading, i.e. exactly where an app calls its telemetry SDK —
// and the 401 interceptor logs it on every failed request. So the raw JWT must not survive the two things
// those paths do to an object: spreading it and stringifying it. It stays readable as a property, because
// onAuthenticated watches it.

const jwt = `header.${btoa(JSON.stringify({ sub: "1", name: "u", exp: 9999999999, nbf: 0 }))}.signature`

beforeEach(() => setActivePinia(createPinia()))

describe("AuthData.token exposure", () => {
    test("is readable as a property", () => {
        expect(new AuthData(jwt, { isAuthenticated: true }).token).toBe(jwt)
    })

    test("is absent from a spread", () => {
        const copy = { ...new AuthData(jwt, { isAuthenticated: true }) }

        expect(copy.token).toBeUndefined()
        expect(JSON.stringify(copy)).not.toContain(jwt)
    })

    test("is absent from JSON.stringify", () => {
        const authData = new AuthData(jwt, { isAuthenticated: true })

        expect(JSON.stringify(authData)).not.toContain(jwt)
        // and the diagnostics that make the object worth logging are still there
        expect(JSON.parse(JSON.stringify(authData)).name).toBe("u")
    })

    test("survives Vue's reactive proxy — readable through it, still not spread", () => {
        // the shape the store uses: ref(new AuthData(...)), so every read goes through a proxy
        const authData = ref(new AuthData(jwt, { isAuthenticated: true }))

        expect(authData.value.token).toBe(jwt)
        expect({ ...authData.value }.token).toBeUndefined()
        expect(JSON.stringify(authData.value)).not.toContain(jwt)
    })

    test("the pinia store keeps both properties too", () => {
        const store = useAuthStore()
        store.authData = new AuthData(jwt, { isAuthenticated: true })

        expect(store.authData.token).toBe(jwt)
        expect(JSON.stringify({ ...store.authData })).not.toContain(jwt)
        // the class methods are not lost — a consumer may still probe claims in onAuthenticationChange
        expect(store.authData.hasRole("none")).toBe(false)
    })

    test("an empty AuthData has no token at all", () => {
        expect(new AuthData(undefined, { isAuthenticated: false }).token).toBeUndefined()
    })
})
