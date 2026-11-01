import { describe, test, expect, beforeEach, vi } from "vitest"
import { computed, effect } from "vue"
import { setActivePinia, createPinia, storeToRefs } from "pinia"
import { createAuth } from "../../../src/vue/auth/auth"
import { useAuthStore } from "../../../src/vue/auth/store"

// The store is a thin view of the core's auth state. What it answers is a shared scenario (`__tests__/contract/auth.test.js`);
// whether what reads it updates, and what pinia makes of its members, a driver cannot see.

const jwt = (claims = {}) => `header.${btoa(JSON.stringify({ sub: "1", exp: 9999999999, nbf: 0, ...claims }))}.signature`
const claims = { displayName: "Ann", role: "Admin", permissions: ["reports.read"], tier: "gold" }

function signedOut() {
    const axios = { post: async () => ({ data: { token: jwt(claims), isAuthenticated: true } }) }
    createAuth({ enabled: true, tokenManager: { token: undefined }, axios })
    return useAuthStore()
}

beforeEach(() => {
    setActivePinia(createPinia())
    vi.spyOn(console, "warn").mockImplementation(() => {}) // useRouter outside an app, which this store does not need here
})

describe("what reads the store updates", () => {
    test("on login and on logout", async () => {
        const store = signedOut()
        const seen = []
        effect(() => seen.push([store.isAuthenticated, store.displayName]))

        await store.login({ username: "u", password: "p" })
        store.logout()

        expect(seen).toEqual([
            [false, undefined],
            [true, "Ann"],
            [false, undefined],
        ])
    })

    test("the checks a template calls, through a computed", async () => {
        const store = signedOut()
        const checks = computed(() => [
            store.hasRole("Admin"),
            store.hasPermission("reports.read"),
            store.hasClaim("tier", "gold"),
            store.getClaimValue("tier"),
        ])
        expect(checks.value).toEqual([false, false, false, undefined])

        await store.login({ username: "u", password: "p" })

        expect(checks.value).toEqual([true, true, true, "gold"])
    })
})

// a pinia store built on first use can exist before the plugin made the auth setup, and `clientApp` reads through to it
test("a store built before the auth setup reads no clientApp, and a write goes nowhere", async () => {
    vi.resetModules()
    const pinia = await import("pinia")
    pinia.setActivePinia(pinia.createPinia())
    const { useAuthStore: freshStore } = await import("../../../src/vue/auth/store")
    const store = freshStore()

    expect(store.clientApp).toBeUndefined()
    expect(() => store.setClientApp("Other")).not.toThrow()
    expect(store.clientApp).toBeUndefined()
})

describe("what pinia makes of the store", () => {
    test("the state, the getters and the actions are what they were", () => {
        const store = signedOut()

        expect(Object.keys(store.$state).sort()).toEqual(["authData", "authRequired", "clientApp", "enabled"])
        expect(Object.keys(storeToRefs(store)).sort()).toEqual([
            "authData",
            "authRequired",
            "clientApp",
            "displayName",
            "enabled",
            "getClaimValue",
            "hasClaim",
            "hasPermission",
            "hasRole",
            "isAuthenticated",
            "isRequired",
        ])
    })

    test("$patch reaches the state, as the plugin, the guard and the interceptor use it", () => {
        const store = signedOut()

        store.$patch({ enabled: false, authRequired: true })

        expect([store.enabled, store.authRequired]).toEqual([false, true])
    })

    test("every action dispatches, for a $onAction hook", async () => {
        const store = signedOut()
        const seen = []
        store.$onAction(({ name }) => seen.push(name))

        store.setClientApp("Other")
        await store.login({ username: "u", password: "p" })
        await store.refresh()
        await store.validateToken()
        store.logout()

        expect(seen).toEqual(["setClientApp", "login", "refresh", "validateToken", "logout"])
    })
})
