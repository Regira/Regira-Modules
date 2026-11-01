import { describe, test, expect, vi, afterEach } from "vitest"
import { AxiosHeaders } from "axios"
import { runOn } from "./drivers"

// Who is signed in, and what an app does with it. The token arrives through the API, so a scenario steers an `axios`
// and watches the state follow.

// AuthData base64-decodes the JWT payload, so a token has to be shaped like one
const jwt = (claims = {}) => `header.${btoa(JSON.stringify({ sub: "1", name: "u", exp: 9999999999, nbf: 0, ...claims }))}.signature`
const tokenA = jwt({ tenant: "a" })
const tokenB = jwt({ tenant: "b" })

/** an API that accepts every call and mints `axios.token`; `axios.calls` holds what it was sent */
function accepting(token = tokenA) {
    const axios = {
        token,
        calls: [],
        post: async (url, body) => (axios.calls.push({ url, body }), { status: 200, data: { token: axios.token, isAuthenticated: true } }),
    }
    return axios
}
/** what a refused call rejects with: the request that made it, its credentials included, and the answer */
const refusal = (url, data, { status = 401, body = {} } = {}) => ({
    message: `Request failed with status code ${status}`,
    code: "ERR_BAD_REQUEST",
    config: { url, method: "post", data: JSON.stringify(data), headers: new AxiosHeaders({ Authorization: "Bearer the-bearer" }) },
    response: { status, data: body },
})
const refusing = (answer) => ({ post: async (url, data) => Promise.reject(refusal(url, data, answer?.())) })
/** an API that refuses the first call, and holds each one after it until `axios.answer()` */
function refusingOnceThenHolding() {
    let refused = false
    const axios = {
        post(url, data) {
            if (refused)
                return new Promise((resolve) => (axios.answer = () => resolve({ status: 200, data: { token: tokenA, isAuthenticated: true } })))
            refused = true
            return Promise.reject(refusal(url, data, { status: 400 }))
        },
    }
    return axios
}
/** a new attempt on a form that was refused: loading, without the last answer, until the new one arrives */
async function expectsANewAttempt(view, axios) {
    await view.call("handleSubmit")
    expect(view.read("isSuccess")).toBe(false)

    const submit = view.call("handleSubmit")
    expect(view.read("isLoading")).toBe(true)
    expect(view.read("isSuccess")).toBeUndefined()

    axios.answer()
    await submit
    expect(view.read("isSuccess")).toBe(true)
    expect(view.read("isLoading")).toBe(false)
}
const names = (events) => events.map(([name]) => name)
const credentials = { username: "u", password: "p" }

let mounted
afterEach(() => {
    mounted?.unmount?.()
    mounted = undefined
    vi.restoreAllMocks()
})

runOn(["core", "vue"], "auth state", (driver) => {
    const app = async (input = {}) => (mounted = await driver.auth({ axios: accepting(), ...input }))

    describe("signing in", () => {
        test("a login answers whether it signed in, and the identity comes with the token", async () => {
            const { view } = await app({ axios: accepting(jwt({ name: "Ann", displayName: "Ann P", permissions: ["reports.read"], tier: "gold" })) })
            expect(view.read("isAuthenticated")).toBe(false)

            await expect(view.call("login", credentials)).resolves.toBe(true)

            expect(view.read("isAuthenticated")).toBe(true)
            expect(view.read("displayName")).toBe("Ann P")
            expect(view.call("getClaimValue", "tier")).toBe("gold")
            expect(view.call("hasClaim", "tier", "gold")).toBe(true)
            expect(view.call("hasClaim", "tier", "silver")).toBe(false)
            expect(view.call("hasPermission", "reports.read")).toBe(true)
            expect(view.call("hasPermission", "reports.write")).toBe(false)
        })

        test("hasRole is false before login, and true after a token carrying the role arrives", async () => {
            const { view } = await app({ axios: accepting(jwt({ role: "Admin" })) })
            expect(view.call("hasRole", "Admin")).toBe(false)

            await view.call("login", credentials)

            expect(view.call("hasRole", "Admin")).toBe(true)
            expect(view.call("hasRole", "Manager")).toBe(false)
        })

        test("a login the API does not authenticate stays signed out", async () => {
            const { view } = await app({ axios: { post: async () => ({ data: { isAuthenticated: false } }) } })

            await expect(view.call("login", credentials)).resolves.toBe(false)

            expect(view.read("isAuthenticated")).toBe(false)
        })

        test("a refused login rejects, and leaves the state as it was", async () => {
            const { view } = await app({ axios: refusing() })

            await expect(view.call("login", credentials)).rejects.toMatchObject({ response: { status: 401 } })

            expect(view.read("isAuthenticated")).toBe(false)
        })

        test("a stored token signs in once it is validated", async () => {
            const tokenManager = { token: tokenA }
            const { view } = await app({ tokenManager })
            expect(view.read("isAuthenticated")).toBe(false)

            await expect(view.call("validateToken")).resolves.toBe(true)

            expect(view.read("authData.token")).toBe(tokenA)
        })

        test("a refused stored token leaves the state signed out", async () => {
            vi.spyOn(console, "error").mockImplementation(() => {})
            const tokenManager = { token: tokenA }
            const { view } = await app({ tokenManager, axios: refusing() })

            await expect(view.call("validateToken")).resolves.toBe(false)

            expect(tokenManager.token).toBeUndefined()
        })

        test("a refresh sends its query and takes the new token", async () => {
            const axios = accepting()
            const { view } = await app({ axios })
            await view.call("login", credentials)
            axios.token = tokenB

            await expect(view.call("refresh", { tenantId: "b" })).resolves.toBe(true)

            expect(axios.calls.at(-1).url).toBe("auth/refresh/?tenantId=b")
            expect(view.read("authData.token")).toBe(tokenB)
        })

        test("a logout clears the identity and the stored token", async () => {
            const tokenManager = { token: undefined }
            const { view } = await app({ tokenManager })
            await view.call("login", credentials)
            expect(tokenManager.token).toBe(tokenA)

            view.call("logout")

            expect(view.read("isAuthenticated")).toBe(false)
            expect(view.read("authData.token")).toBeUndefined()
            expect(tokenManager.token).toBeUndefined()
        })
    })

    describe("logout order", () => {
        test("the identity goes first: a token store that fails leaves no one signed in", async () => {
            let stored
            let failing = false
            const tokenManager = {
                get token() {
                    return stored
                },
                set token(value) {
                    if (failing) throw new Error("storage is full")
                    stored = value
                },
            }
            const { view } = await app({ tokenManager })
            await view.call("login", credentials)

            failing = true
            expect(() => view.call("logout")).toThrow("storage is full")

            expect(view.read("isAuthenticated")).toBe(false)
        })
    })

    describe("isRequired", () => {
        test("follows the route, and is off while auth is", async () => {
            const page = await app({ path: "/things" })
            expect(page.view.read("isRequired")).toBe(true)

            await page.go("/public")
            expect(page.view.read("isRequired")).toBe(false)

            await page.go("/things")
            page.view.write("enabled", false)
            expect(page.view.read("isRequired")).toBe(false)
        })
    })

    // `service.options` owns the JWT audience, plain state outside any framework; the state is a view of it
    describe("clientApp", () => {
        test("setClientApp writes the owner, and every reader sees it", async () => {
            const { auth, view } = await app({ clientApp: "MyApp" })
            expect(view.read("clientApp")).toBe("MyApp")

            view.call("setClientApp", "Switched")

            expect(auth.service.options.clientApp).toBe("Switched")
            expect(auth.clientApp).toBe("Switched")
            expect(view.read("clientApp")).toBe("Switched")
        })

        test("a read after a direct write to the owner sees it: the state keeps no copy", async () => {
            const { auth, view } = await app({ clientApp: "MyApp" })

            auth.service.options.clientApp = "Direct"

            expect(view.read("clientApp")).toBe("Direct")
        })

        test("the next login sends what was switched to", async () => {
            const axios = accepting()
            const { view } = await app({ axios, clientApp: "MyApp" })

            view.call("setClientApp", "Other")
            await view.call("login", credentials)

            expect(axios.calls[0].url).toBe("auth?clientApp=Other")
        })
    })
})

// A Vue store can be built before the plugin installs; `__tests__/vue/auth/store-reactivity.test.js` has its side of this.
runOn(["core"], "auth state before the auth setup", (driver) => {
    test("reads no clientApp, and a write goes nowhere", async () => {
        mounted = await driver.auth({ unset: true })

        expect(mounted.view.read("clientApp")).toBeUndefined()
        expect(() => mounted.view.call("setClientApp", "Other")).not.toThrow()
    })
})

// What every request of the app passes through once auth is installed.
runOn(["core", "vue"], "the axios interceptors", (driver) => {
    async function app(input) {
        const axios = accepting()
        axios.interceptors = {
            request: { use: (handler) => (axios.onRequest = handler) },
            response: { use: (onSuccess, onFailure) => Object.assign(axios, { onSuccess, onFailure }) },
        }
        vi.spyOn(console, "error").mockImplementation(() => {})
        mounted = await driver.auth({ axios, ...input })
        mounted.intercept()
        return { ...mounted, axios }
    }
    const failure = (url, status) => ({ config: { url, headers: {} }, response: { status } })

    test("a request carries the token while there is one", async () => {
        const { view, axios } = await app()
        expect(axios.onRequest({ headers: {} }).headers.Authorization).toBeUndefined()

        await view.call("login", credentials)

        expect(axios.onRequest({ headers: {} }).headers.Authorization).toBe(`Bearer ${tokenA}`)
    })

    test("a response that succeeds reaches the caller as it arrived", async () => {
        const { axios } = await app()
        const response = { status: 200, data: {} }

        expect(axios.onSuccess(response)).toBe(response)
    })

    test("a 401 flags a sign-in, and validates the token of a signed-in user", async () => {
        const { view, axios } = await app()
        await view.call("login", credentials)
        const error = failure("products", 401)

        await expect(axios.onFailure(error)).rejects.toBe(error)

        expect(view.read("authRequired")).toBe(true)
        expect(axios.calls.at(-1).url).toBe("auth/validate")
    })

    // the token of a reload is stored before it is validated: that is no signed-in user yet
    test("a 401 while signed out flags a sign-in and validates nothing", async () => {
        const { view, axios } = await app({ tokenManager: { token: tokenA } })

        await expect(axios.onFailure(failure("products", 401))).rejects.toBeDefined()

        expect(view.read("authRequired")).toBe(true)
        expect(axios.calls).toEqual([])
    })

    test("a 401 reaches the caller only after the validation it started", async () => {
        const { view, axios } = await app()
        await view.call("login", credentials)
        let answer
        axios.post = () => new Promise((resolve) => (answer = resolve))
        let settled = false

        const failing = axios.onFailure(failure("products", 401)).catch(() => (settled = true))
        await new Promise((resolve) => setTimeout(resolve))
        expect(settled).toBe(false)

        answer({ status: 200 })
        await failing
        expect(settled).toBe(true)
    })

    test("the log names who is signed in when the request fails", async () => {
        const { view, axios } = await app()
        await view.call("login", credentials)

        await expect(axios.onFailure(failure("products", 500))).rejects.toBeDefined()

        expect(vi.mocked(console.error).mock.calls.at(-1)[1].auth).toMatchObject({ isAuthenticated: true, userId: "1", name: "u" })
    })

    test("a request that failed before it was built still flags a 401", async () => {
        const { view, axios } = await app()

        await expect(axios.onFailure({ response: { status: 401 } })).rejects.toBeDefined()

        expect(view.read("authRequired")).toBe(true)
    })

    // an `auth/` call made with a token answers for that call alone, and a 403 means signed in, not allowed here
    test.each([
        ["a 401 on an auth/ call", "auth/validate", 401],
        ["a 401 on an Auth/ call", "Auth/validate", 401],
        ["a 403", "products", 403],
        ["a 500", "products", 500],
    ])("%s neither flags a sign-in nor validates", async (_, url, status) => {
        const { view, axios } = await app()
        await view.call("login", credentials)
        const calls = axios.calls.length

        await expect(axios.onFailure(failure(url, status))).rejects.toBeDefined()

        expect(view.read("authRequired")).toBe(false)
        expect(axios.calls).toHaveLength(calls)
    })
})

// `onAuthenticated` watches the token instead of listening for named actions: restoring a stored token dispatches
// `validateToken`, not `login`, and a refresh that swaps the token while staying authenticated (a tenant switch) still
// fires, while re-validating the same token (the plugin's periodic check) does not.
runOn(["core", "vue"], "onAuthenticated", (driver) => {
    const app = async (input = {}) => (mounted = await driver.auth({ axios: accepting(), ...input }))
    function count(page, options) {
        const calls = { count: 0 }
        page.onAuthenticated(() => calls.count++, options)
        return calls
    }

    test("does not run while signed out", async () => {
        const page = await app()

        expect(count(page).count).toBe(0)
    })

    test("runs straight away when a token is already there (a view mounting after login)", async () => {
        const page = await app()
        await page.view.call("login", credentials)

        expect(count(page).count).toBe(1)
    })

    test("runs when a stored token is validated on reload: the case a login-only hook misses", async () => {
        const page = await app({ tokenManager: { token: tokenA } })
        const calls = count(page)
        expect(calls.count).toBe(0) // mounted before the token is restored, as views are

        await page.view.call("validateToken")
        await page.settle()

        expect(calls.count).toBe(1)
    })

    test("runs again when a refresh swaps the token: the case watching isAuthenticated misses", async () => {
        const axios = accepting()
        const page = await app({ axios })
        await page.view.call("login", credentials)
        const calls = count(page)
        expect(calls.count).toBe(1)

        axios.token = tokenB // a tenant switch: still authenticated, another identity
        await page.view.call("refresh", { tenantId: "b" })
        await page.settle()

        expect(calls.count).toBe(2)
    })

    test("does not run again when the same token is re-validated (the plugin's periodic check)", async () => {
        const page = await app({ tokenManager: { token: tokenA } })
        await page.view.call("validateToken")
        const calls = count(page)
        expect(calls.count).toBe(1)

        await page.view.call("validateToken")
        await page.settle()

        expect(calls.count).toBe(1)
    })

    test("does not run on logout", async () => {
        const page = await app()
        await page.view.call("login", credentials)
        const calls = count(page)

        page.view.call("logout")
        await page.settle()

        expect(calls.count).toBe(1)
    })

    test("immediate: false skips the call for the token already there", async () => {
        const page = await app()
        await page.view.call("login", credentials)

        expect(count(page, { immediate: false }).count).toBe(0)
    })

    test("does not run for a token the state has not accepted", async () => {
        const page = await app()
        const calls = count(page)

        // a custom IAuthService may build AuthData around a token it rejected
        page.view.write("authData", { token: tokenA, isAuthenticated: false })
        await page.settle()

        expect(calls.count).toBe(0)
    })

    test("does not run for an authenticated state that holds no token", async () => {
        const page = await app()

        page.view.write("authData", { isAuthenticated: true })

        expect(count(page).count).toBe(0)
    })

    // no token ever arrives in such an app: waiting for one would leave the view blank
    test("auth disabled: runs straight away", async () => {
        const page = await app({ disabled: true })

        expect(count(page).count).toBe(1)
    })

    test("auth disabled, immediate: false: stays quiet, as the view fetched already", async () => {
        const page = await app({ disabled: true })

        expect(count(page, { immediate: false }).count).toBe(0)
    })
})

// The check the route guard runs for a signed-in user, over a route's records from its root to the leaf.
runOn(["core", "vue"], "routeAllows", (driver) => {
    const storeWith = ({ roles = [], permissions = [] } = {}) => ({
        hasRole: (role) => roles.includes(role),
        hasPermission: (permission) => permissions.includes(permission),
    })

    test("a route without policy or permissions passes", () => {
        expect(driver.routeAllows([{}], storeWith())).toBe(true)
    })

    test("a parent's policy applies to its child, and gets the store it was given", () => {
        const route = [{ policy: (store) => store.hasRole("Administrator") }, {}]

        expect(driver.routeAllows(route, storeWith({ roles: ["Administrator"] }))).toBe(true)
        expect(driver.routeAllows(route, storeWith({ roles: ["Employee"] }))).toBe(false)
    })

    test("every record's policy has to pass", () => {
        expect(driver.routeAllows([{ policy: () => true }, { policy: () => false }], storeWith())).toBe(false)
        expect(driver.routeAllows([{ policy: () => false }, { policy: () => true }], storeWith())).toBe(false)
    })

    test("a policy that is no function is no check", () => {
        expect(driver.routeAllows([{ policy: "Administrator" }], storeWith())).toBe(true)
    })

    test("every record's permissions are required, through the store", () => {
        const route = [{ permissions: ["reports.read"] }, { permissions: ["reports.write"] }]

        expect(driver.routeAllows(route, storeWith({ permissions: ["reports.read", "reports.write"] }))).toBe(true)
        expect(driver.routeAllows(route, storeWith({ permissions: ["reports.read"] }))).toBe(false)
        expect(driver.routeAllows(route, storeWith({ permissions: ["reports.write"] }))).toBe(false)
    })

    test("allowAnonymous passes whatever the rest says", () => {
        expect(driver.routeAllows([{ allowAnonymous: true, policy: () => false, permissions: ["x"] }], storeWith())).toBe(true)
    })

    test("allowAnonymous on a parent reaches its child, and the child has the last word", () => {
        const denied = { policy: () => false }

        expect(driver.routeAllows([{ allowAnonymous: true }, denied], storeWith())).toBe(true)
        expect(driver.routeAllows([{ allowAnonymous: true }, { ...denied, allowAnonymous: false }], storeWith())).toBe(false)
    })
})

// A router that keeps a route's meta itself says what it says about `allowAnonymous`; `__tests__/vue/auth/route-allows.test.js`
// holds the Vue layer's side, where an app's guard can edit `to.meta`.
runOn(["core"], "routeAllows with a layer's own answer", (driver) => {
    const store = { hasPermission: () => false }
    const denied = { policy: () => false }

    test("it outranks the records", () => {
        expect(driver.routeAllows([{ allowAnonymous: true, ...denied }], store, false)).toBe(false)
        expect(driver.routeAllows([denied], store, true)).toBe(true)
    })
})

// POST auth answers 401 with the sign-in result as its body (camelCase): `isLockedOut` after too many tries,
// `isNotAllowed` when the password was right but the account, e-mail or phone is not confirmed yet.
runOn(["core", "vue"], "login form", (driver) => {
    /** a form whose POST auth refuses each attempt with the next of `answers` */
    async function form(answers) {
        vi.spyOn(console, "error").mockImplementation(() => {})
        mounted = await driver.loginForm({ username: "bram", axios: refusing(() => ({ body: answers.shift() })) })
        mounted.view.write("password", "hunter2")
        return mounted
    }

    test("starts from the username it was given", async () => {
        mounted = await driver.loginForm({ axios: accepting() })
        expect(mounted.view.read("username")).toBe("")
        mounted.unmount?.()

        mounted = await driver.loginForm({ username: "bram", axios: accepting() })
        expect(mounted.view.read("username")).toBe("bram")
    })

    test("a login posts what was typed", async () => {
        const axios = accepting()
        mounted = await driver.loginForm({ axios })
        mounted.view.write("username", "typed")
        mounted.view.write("password", "hunter2")

        await mounted.view.call("handleSubmit")

        expect(axios.calls).toEqual([{ url: "auth", body: { username: "typed", password: "hunter2" } }])
    })

    test("a login that succeeds reports it, and the state is signed in", async () => {
        mounted = await driver.loginForm({ username: "bram", axios: accepting() })

        await mounted.view.call("handleSubmit")

        expect(mounted.events).toEqual([
            ["signingIn", "bram"],
            ["success", "bram"],
        ])
        expect(mounted.view.read("failed")).toBe(false)
        expect(mounted.view.read("signingIn")).toBe(false)
    })

    test("signing in shows while the request runs", async () => {
        let answer
        mounted = await driver.loginForm({ axios: { post: () => new Promise((resolve) => (answer = resolve)) } })

        const submit = mounted.view.call("handleSubmit")
        expect(mounted.view.read("signingIn")).toBe(true)

        answer({ data: { token: tokenA, isAuthenticated: true } })
        await submit
        expect(mounted.view.read("signingIn")).toBe(false)
    })

    test("a login the API does not authenticate reports a fail, without a refusal to show", async () => {
        mounted = await driver.loginForm({ username: "bram", axios: { post: async () => ({ data: { isAuthenticated: false } }) } })

        await mounted.view.call("handleSubmit")

        expect(names(mounted.events)).toEqual(["signingIn", "fail"])
        expect(mounted.view.read("failed")).toBe(false)
    })

    test("an unconfirmed account sets isNotAllowed", async () => {
        const { view, events } = await form([{ isAuthenticated: false, isLockedOut: false, isNotAllowed: true }])

        await view.call("handleSubmit")

        expect(view.read("failed")).toBe(true)
        expect(view.read("isNotAllowed")).toBe(true)
        expect(view.read("isLockedOut")).toBe(false)
        expect(view.read("signingIn")).toBe(false)
        expect(names(events)).toEqual(["signingIn", "fail"])
    })

    test("a lockout sets isLockedOut", async () => {
        const { view } = await form([{ isAuthenticated: false, isLockedOut: true, isNotAllowed: false }])

        await view.call("handleSubmit")

        expect(view.read("failed")).toBe(true)
        expect(view.read("isLockedOut")).toBe(true)
        expect(view.read("isNotAllowed")).toBe(false)
    })

    test("a wrong password sets neither flag", async () => {
        const { view } = await form([{ isAuthenticated: false, isLockedOut: false, isNotAllowed: false }])

        await view.call("handleSubmit")

        expect(view.read("failed")).toBe(true)
        expect(view.read("isLockedOut")).toBe(false)
        expect(view.read("isNotAllowed")).toBe(false)
    })

    test("the next attempt clears the previous attempt's flags", async () => {
        const { view } = await form([
            { isAuthenticated: false, isLockedOut: true, isNotAllowed: false },
            { isAuthenticated: false, isLockedOut: false, isNotAllowed: true },
            {},
        ])

        await view.call("handleSubmit")
        await view.call("handleSubmit")
        expect(view.read("isLockedOut")).toBe(false)
        expect(view.read("isNotAllowed")).toBe(true)

        await view.call("handleSubmit")
        expect(view.read("isLockedOut")).toBe(false)
        expect(view.read("isNotAllowed")).toBe(false)
    })

    test("a login that succeeds clears what the last refusal showed", async () => {
        vi.spyOn(console, "error").mockImplementation(() => {})
        let refuse = true
        const post = async (url, data) => {
            if (refuse) throw refusal(url, data, { body: { isLockedOut: true, isNotAllowed: true } })
            return { data: { token: tokenA, isAuthenticated: true } }
        }
        mounted = await driver.loginForm({ axios: { post } })
        await mounted.view.call("handleSubmit")
        expect([mounted.view.read("failed"), mounted.view.read("isLockedOut"), mounted.view.read("isNotAllowed")]).toEqual([true, true, true])

        refuse = false
        await mounted.view.call("handleSubmit")

        expect([mounted.view.read("failed"), mounted.view.read("isLockedOut"), mounted.view.read("isNotAllowed")]).toEqual([false, false, false])
    })

    test("the logged refusal carries no password", async () => {
        const { view } = await form([{ isAuthenticated: false, isLockedOut: false, isNotAllowed: true }])

        await view.call("handleSubmit")

        expect(console.error).toHaveBeenCalled()
        expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain("hunter2")
    })

    test("handleForgotPassword hands on what was typed", async () => {
        mounted = await driver.loginForm({ axios: accepting() })
        mounted.view.write("username", "typed")

        mounted.view.call("handleForgotPassword")

        expect(mounted.events).toEqual([["forgotPassword", "typed"]])
    })
})

runOn(["core", "vue"], "change password form", (driver) => {
    async function form(axios, { current = "hunter2", next = "hunter3", confirm = next, onEvent } = {}) {
        mounted = await driver.changePasswordForm({ axios, onEvent })
        mounted.view.write("currentPassword", current)
        mounted.view.write("newPassword", next)
        mounted.view.write("confirmPassword", confirm)
        return mounted
    }

    test("an unconfirmed new password is no valid form, and sends nothing", async () => {
        const axios = accepting()
        const { view } = await form(axios, { confirm: "typo" })
        expect(view.read("passwordsMatch")).toBe(false)
        expect(view.read("isFormValid")).toBe(false)

        await view.call("handleSubmit")

        expect(axios.calls).toEqual([])

        view.write("confirmPassword", "hunter3")
        expect(view.read("isFormValid")).toBe(true)
    })

    test("an empty current password is no valid form", async () => {
        const { view } = await form(accepting(), { current: "" })

        expect(view.read("passwordsMatch")).toBe(true)
        expect(view.read("isFormValid")).toBe(false)
    })

    test("an empty new password is no valid form, even when it is confirmed", async () => {
        const { view } = await form(accepting(), { next: "" })

        expect(view.read("passwordsMatch")).toBe(true)
        expect(view.read("isFormValid")).toBe(false)
    })

    test("a success listener finds the fields cleared", async () => {
        let fields
        const onEvent = () => (fields = [mounted.view.read("currentPassword"), mounted.view.read("isSuccess")])
        const { view } = await form(accepting(), { onEvent })

        await view.call("handleSubmit")

        expect(fields).toEqual(["", true])
    })

    test("a change that succeeds clears the fields and reports it", async () => {
        const axios = accepting()
        const { view, events } = await form(axios)

        await view.call("handleSubmit")

        expect(axios.calls).toEqual([{ url: "auth/password", body: { currentPassword: "hunter2", newPassword: "hunter3" } }])
        expect(view.read("isSuccess")).toBe(true)
        expect(view.read("isLoading")).toBe(false)
        expect([view.read("currentPassword"), view.read("newPassword"), view.read("confirmPassword")]).toEqual(["", "", ""])
        expect(names(events)).toEqual(["success"])
    })

    test("a refused change keeps the fields, hands on the error, and logs neither password", async () => {
        const log = vi.spyOn(console, "error").mockImplementation(() => {})
        const { view, events } = await form(refusing(() => ({ status: 400 })))

        await view.call("handleSubmit")

        expect(view.read("isSuccess")).toBe(false)
        expect(view.read("isLoading")).toBe(false)
        expect(view.read("newPassword")).toBe("hunter3")
        expect(events).toEqual([["fail", expect.objectContaining({ response: expect.objectContaining({ status: 400 }) })]])
        const [, payload] = log.mock.calls[0]
        expect(JSON.stringify(payload)).not.toContain("hunter2")
        expect(JSON.stringify(payload)).not.toContain("hunter3")
        expect(payload.config.url).toBe("auth/password") // it still says which call failed
    })

    test("a new attempt loads, without the last answer", async () => {
        vi.spyOn(console, "error").mockImplementation(() => {})
        const axios = refusingOnceThenHolding()
        const { view } = await form(axios)

        await expectsANewAttempt(view, axios)
    })
})

runOn(["core", "vue"], "forgot password form", (driver) => {
    const options = { siteUrl: "https://app.example", siteName: "App" }

    test("a form needs a username", async () => {
        mounted = await driver.forgotPasswordForm({ axios: accepting(), options })
        expect(mounted.view.read("isFormValid")).toBe(false)

        mounted.view.write("username", "bram")

        expect(mounted.view.read("isFormValid")).toBe(true)
    })

    test("a request that succeeds sends the options and reports the username", async () => {
        const axios = accepting()
        mounted = await driver.forgotPasswordForm({ username: "bram", axios, options })

        await mounted.view.call("handleSubmit")

        expect(axios.calls).toEqual([{ url: "auth/password/recover", body: { username: "bram", ...options } }])
        expect(mounted.view.read("isSuccess")).toBe(true)
        expect(mounted.view.read("isLoading")).toBe(false)
        expect(mounted.events).toEqual([["success", "bram"]])
    })

    test("a success listener runs before the form shows the success", async () => {
        const seen = []
        const onEvent = () => seen.push(mounted.view.read("isSuccess"))
        mounted = await driver.forgotPasswordForm({ username: "bram", axios: accepting(), options, onEvent })

        await mounted.view.call("handleSubmit")

        expect(seen).toEqual([undefined])
        expect(mounted.view.read("isSuccess")).toBe(true)
    })

    test("a refused request hands on the error", async () => {
        vi.spyOn(console, "error").mockImplementation(() => {})
        mounted = await driver.forgotPasswordForm({ username: "bram", axios: refusing(() => ({ status: 400 })), options })

        await mounted.view.call("handleSubmit")

        expect(mounted.view.read("isSuccess")).toBe(false)
        expect(mounted.view.read("isLoading")).toBe(false)
        expect(names(mounted.events)).toEqual(["fail"])
        expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain("the-bearer")
    })

    test("a new attempt loads, without the last answer", async () => {
        vi.spyOn(console, "error").mockImplementation(() => {})
        const axios = refusingOnceThenHolding()
        mounted = await driver.forgotPasswordForm({ username: "bram", axios, options })

        await expectsANewAttempt(mounted.view, axios)
    })

    test("a new username from the owner replaces what is there", async () => {
        mounted = await driver.forgotPasswordForm({ username: "bram", axios: accepting(), options })

        await mounted.setUsername("ann")
        expect(mounted.view.read("username")).toBe("ann")

        await mounted.setUsername(undefined)
        expect(mounted.view.read("username")).toBe("")
    })
})

runOn(["core", "vue"], "reset password form", (driver) => {
    async function form(axios, { password = "hunter3", confirm = password, token = "from-the-mail" } = {}) {
        mounted = await driver.resetPasswordForm({ token, axios })
        mounted.view.write("password", password)
        mounted.view.write("confirmPassword", confirm)
        return mounted
    }

    test("an unconfirmed password is no valid form, and sends nothing", async () => {
        const axios = accepting()
        const { view } = await form(axios, { confirm: "typo" })
        expect(view.read("passwordsMatch")).toBe(false)
        expect(view.read("isFormValid")).toBe(false)

        await view.call("handleSubmit")

        expect(axios.calls).toEqual([])

        view.write("confirmPassword", "hunter3")
        expect(view.read("isFormValid")).toBe(true)
    })

    test("an empty password is no valid form", async () => {
        const { view } = await form(accepting(), { password: "" })

        expect(view.read("passwordsMatch")).toBe(true)
        expect(view.read("isFormValid")).toBe(false)
    })

    test("a reset sends the token the owner holds by then, and reports it", async () => {
        const axios = accepting()
        const page = await form(axios)

        page.setToken("a-later-mail")
        await page.view.call("handleSubmit")

        expect(axios.calls).toEqual([{ url: "auth/password/reset", body: { token: "a-later-mail", password: "hunter3" } }])
        expect(page.view.read("isSuccess")).toBe(true)
        expect(page.view.read("isLoading")).toBe(false)
        expect(names(page.events)).toEqual(["success"])
    })

    test("a refused reset hands on the error, and logs neither the token nor the password", async () => {
        const log = vi.spyOn(console, "error").mockImplementation(() => {})
        const { view, events } = await form(refusing(() => ({ status: 400 })))

        await view.call("handleSubmit")

        expect(view.read("isSuccess")).toBe(false)
        expect(view.read("isLoading")).toBe(false)
        expect(events).toEqual([["fail", expect.objectContaining({ response: expect.objectContaining({ status: 400 }) })]])
        expect(JSON.stringify(log.mock.calls)).not.toContain("hunter3")
        expect(JSON.stringify(log.mock.calls)).not.toContain("from-the-mail")
    })

    test("a new attempt loads, without the last answer", async () => {
        vi.spyOn(console, "error").mockImplementation(() => {})
        const axios = refusingOnceThenHolding()
        const { view } = await form(axios)

        await expectsANewAttempt(view, axios)
    })
})
