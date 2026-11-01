import { describe, test, expect, beforeEach, afterEach } from "vitest"
import { createApp, defineComponent, effectScope, h, nextTick, ref } from "vue"
import { setActivePinia, createPinia } from "pinia"
import { createAuth, setGlobalAuth } from "../../../src/vue/auth/auth"
import { useAuthStore } from "../../../src/vue/auth/store"
import { onAuthenticated } from "../../../src/vue/auth/onAuthenticated"

// What `onAuthenticated` does with a token is a shared scenario (`__tests__/contract/auth.test.js`). These are the
// Vue layer's own: which store it reads, how a throwing handler reaches `app.config.errorHandler`, and pinia's hooks.

const jwt = (claims = {}) => `header.${btoa(JSON.stringify({ sub: "1", name: "u", exp: 9999999999, nbf: 0, ...claims }))}.signature`

const tokenA = jwt({ tenant: "a" })
const tokenB = jwt({ tenant: "b" })

/** Auth wired over a stubbed API. */
function harness() {
    const tokenManager = { token: undefined }
    const axios = {
        post: async () => ({ status: 200, data: { token: tokenA, isAuthenticated: true } }),
    }
    createAuth({ enabled: true, tokenManager, axios, clientApp: "MyApp" })
    return { store: useAuthStore() }
}

/** Registers the handler inside an effect scope, as a component's setup would. */
function track(fn) {
    const calls = { count: 0 }
    const scope = effectScope()
    scope.run(() =>
        onAuthenticated(() => {
            calls.count++
            fn?.()
        })
    )
    return { calls, scope }
}

beforeEach(() => setActivePinia(createPinia()))
// `globalAuth` is module-level state the plugin owns; the tests below set it, so clear it or the ones
// relying on the default-store fallback would read a leftover from an earlier test.
afterEach(() => setGlobalAuth(undefined))

// The plugin resolves `authStore ?? useAuthStore()`, so an app passing its own store never populates the
// default one. Reading the default directly would watch a store that stays empty forever: no immediate
// call, no later change, and every scaffolded view silently stops reloading. `$auth` is the accessor that
// honours whichever store the plugin was configured with.
describe("onAuthenticated store resolution", () => {
    /** A stand-in for `$auth`, whose `authData` getter reads through to a custom store. */
    function globalAuthOver(authData) {
        setGlobalAuth({
            enabled: true,
            get authData() {
                return authData.value
            },
        })
    }

    test("follows the store the plugin was configured with, not the default one", async () => {
        harness() // default store exists and stays signed out
        const customAuthData = ref({ token: undefined, isAuthenticated: false })
        globalAuthOver(customAuthData)

        const { calls } = track()
        expect(calls.count).toBe(0)

        customAuthData.value = { token: tokenA, isAuthenticated: true }
        await nextTick()

        expect(calls.count).toBe(1)
        expect(useAuthStore().isAuthenticated).toBe(false) // proof it was NOT the default store that fired
    })

    test("an explicit { store } wins over both", async () => {
        harness()
        globalAuthOver(ref({ token: tokenA, isAuthenticated: true })) // would fire immediately
        const explicit = ref({ token: undefined, isAuthenticated: false })

        let count = 0
        const scope = effectScope()
        scope.run(() =>
            onAuthenticated(() => count++, {
                store: {
                    get authData() {
                        return explicit.value
                    },
                },
            })
        )
        expect(count).toBe(0)

        explicit.value = { token: tokenB, isAuthenticated: true }
        await nextTick()
        expect(count).toBe(1)
    })

    test("falls back to the default store when the plugin has not installed yet", async () => {
        const { store } = harness() // no setGlobalAuth — e.g. a pinia store built before app.use(authPlugin)

        const { calls } = track()
        await store.login({ username: "u", password: "p" })
        await nextTick()

        expect(calls.count).toBe(1)
    })

    // Registering before the plugin installs is ordinary (a pinia setup store is built on first use, which
    // can be at import time). Capturing `$auth` once would pin such a registration to the default store,
    // which `authStore ?? useAuthStore()` then never populates — the list never loads and never errors.
    test("switches to the plugin's custom store when the plugin installs afterwards", async () => {
        harness() // default store exists and stays signed out

        const { calls } = track() // registered while $auth does not exist yet
        expect(calls.count).toBe(0)

        globalAuthOver(ref({ token: tokenA, isAuthenticated: true })) // app.use(authPlugin, { authStore }), already signed in
        await nextTick()

        expect(calls.count).toBe(1)
        expect(useAuthStore().isAuthenticated).toBe(false) // proof it was NOT the default store that fired
    })

    // The disabled branch runs the handler itself rather than through a token that never arrives. A bare
    // call would put it OUTSIDE Vue's error handling: a throw aborts the caller's setup() and blanks the
    // subtree, where every watched path lands in app.config.errorHandler instead.
    test("auth disabled: a throwing handler is reported, not thrown out of setup", () => {
        setGlobalAuth({ enabled: false })
        const errors = []
        const host = document.createElement("div")
        const app = createApp(
            defineComponent({
                setup() {
                    onAuthenticated(() => {
                        throw new Error("boom")
                    })
                    return () => h("p", "rendered")
                },
            })
        )
        app.config.errorHandler = (err) => errors.push(err)
        app.mount(host)

        expect(errors.map((e) => e.message)).toEqual(["boom"])
        expect(host.textContent).toBe("rendered")
    })

    // Same ordering problem as the custom store, with a worse ending: the disabled flag arrives with the
    // install, so a registration made before it would sit watching for a token the app never mints.
    test("a plugin installed disabled AFTER registration still releases the handler", async () => {
        harness()

        const { calls } = track()
        expect(calls.count).toBe(0)

        setGlobalAuth({ enabled: false }) // app.use(authPlugin, { enabled: false })
        await nextTick()

        expect(calls.count).toBe(1)
    })

    // The per-call argument outranks the app-wide flag: `enabled: false` says the PLUGIN is off, which
    // tells us nothing about a store the caller handed us. Without the exemption the disabled branch
    // short-circuits first and the named store is never watched.
    test("an explicit { store } is still watched when the plugin is disabled", async () => {
        harness()
        setGlobalAuth({ enabled: false })
        const explicit = ref({ token: undefined, isAuthenticated: false })

        let count = 0
        const scope = effectScope()
        scope.run(() =>
            onAuthenticated(() => count++, {
                store: {
                    get authData() {
                        return explicit.value
                    },
                },
            })
        )
        expect(count).toBe(0) // no token yet — not the disabled branch's unconditional immediate run

        explicit.value = { token: tokenA, isAuthenticated: true }
        await nextTick()
        expect(count).toBe(1)
    })
})

// The default store is resolved on the watcher's first read, during `setup()`, and kept: resolving it on each read would
// run from the scheduler with no current instance, where pinia falls back to its module-global active instance.
test("two apps on one page: a handler stays on the store of the app that registered it", async () => {
    harness()
    let fired = 0
    const piniaA = createPinia()
    const appA = createApp(
        defineComponent({
            setup() {
                onAuthenticated(() => fired++, { immediate: false })
                return () => h("div")
            },
        })
    )
    appA.use(piniaA)
    appA.mount(document.createElement("div"))
    // a second app takes over the module-global active pinia
    const piniaB = createPinia()
    createApp({ render: () => null }).use(piniaB)

    const loggingIn = useAuthStore(piniaA).login({ username: "u", password: "p" })
    setActivePinia(piniaB) // the other app acts while the request runs
    await loggingIn
    await nextTick()

    expect(fired).toBe(1)
})

// `$onAction` is pinia's own subscription, not something this module wraps, so `onAuthenticated` arriving
// takes nothing away from it. These pin that: the store still dispatches the actions a hand-rolled hook
// listens for, and the reload gap it has always had (covered in rehydration-ordering.test.js) is the reason
// to prefer `onAuthenticated`, not evidence the old form stopped working.
describe("the legacy authStore.$onAction hook still works", () => {
    test("fires on sign-in, with the store authenticated by the time it runs", async () => {
        const { store } = harness()
        const seen = []
        store.$onAction(({ name, after }) => after(() => seen.push({ name, isAuthenticated: store.isAuthenticated })))

        await store.login({ username: "u", password: "p" })

        expect(seen.map((s) => s.name)).toContain("login")
        expect(seen.find((s) => s.name === "login").isAuthenticated).toBe(true)
    })

    test("still sees logout, and runs alongside onAuthenticated rather than instead of it", async () => {
        const { store } = harness()
        const seen = []
        store.$onAction(({ name }) => seen.push(name))
        const { calls } = track()

        await store.login({ username: "u", password: "p" })
        await nextTick()
        store.logout()

        expect(calls.count).toBe(1) // the new hook fired for the token
        expect(seen).toContain("login") // and the old one for the actions, both on the same store
        expect(seen).toContain("logout")
    })

    test("reading the token off authData still works for a hand-rolled hook", async () => {
        const { store } = harness()
        let token
        store.$onAction(({ name, after }) => after(() => name === "login" && (token = store.authData.token)))

        await store.login({ username: "u", password: "p" })

        // non-enumerable hides it from serialization, not from callers
        expect(token).toBe(tokenA)
    })
})
