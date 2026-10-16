import { describe, test, expect, afterEach } from "vitest"
import { createApp, h, nextTick } from "vue"
import { createPinia } from "pinia"
import { createRouter, createMemoryHistory } from "vue-router"
import authPlugin from "../../../src/vue/auth/plugin"
import { useAuthStore } from "../../../src/vue/auth/store"

// `$auth.isRequired` returned the store's `authRequired` flag, which the guard and the 401 interceptor set and nothing
// clears: once a protected route had been shown it stayed true on every public page after it. It is the store's
// route-driven `isRequired`, the value `useAuthStore().isRequired` gives.
const mounted = []
afterEach(() => {
    while (mounted.length) mounted.pop().unmount()
})

async function signedOutApp() {
    const View = { render: () => h("div") }
    const router = createRouter({
        history: createMemoryHistory(),
        routes: [
            { path: "/", name: "home", component: View },
            { path: "/public", name: "public", component: View, meta: { allowAnonymous: true } },
            { path: "/forbidden", name: "forbidden", component: View, meta: { allowAnonymous: true } },
        ],
    })
    const axios = { interceptors: { request: { use: () => {} }, response: { use: () => {} } }, post: async () => ({ status: 401 }) }
    const app = createApp({ render: () => h("div") })
    app.use(createPinia())
    app.use(router)
    await router.push("/")
    await authPlugin.install(app, { axios, tokenManager: { token: undefined } })
    app.mount(document.createElement("div"))
    mounted.push(app)
    await router.isReady()
    await nextTick()
    return { router, $auth: app.config.globalProperties.$auth, store: useAuthStore() }
}

describe("$auth.isRequired", () => {
    test("follows the route, as the store's isRequired does", async () => {
        const { router, $auth, store } = await signedOutApp()
        expect($auth.isRequired).toBe(true)
        expect(store.authRequired).toBe(true) // the guard flagged the protected route

        await router.push("/public")

        expect($auth.isRequired).toBe(false)
        expect($auth.isRequired).toBe(store.isRequired)
        expect(store.authRequired).toBe(true) // the flag $auth.isRequired no longer reads
    })
})
