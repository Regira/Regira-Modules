import { describe, test, expect } from "vitest"
import { setActivePinia, createPinia } from "pinia"
import { AuthData } from "../../../src/vue/auth/AuthData"
import { createAuth } from "../../../src/vue/auth/auth"
import { useAuthStore } from "../../../src/vue/auth/store"

// The SPA decodes the RAW token, so role checks must probe every spelling an issuer can put in the
// payload: "role" (self-issued JWT), "roles" (Entra), or the ClaimTypes.Role URI (ASP.NET Identity's
// default, API keys) — mirroring the backend's FindRoles().
const ROLE_URI = "http://schemas.microsoft.com/ws/2008/06/identity/claims/role"

const jwtWith = (claims) => `header.${btoa(JSON.stringify({ sub: "1", exp: 9999999999, nbf: 0, ...claims }))}.signature`

describe("AuthData.hasRole probes all three claim spellings", () => {
    test('a string "role" claim', () => {
        const data = new AuthData(jwtWith({ role: "Admin" }), { isAuthenticated: true })
        expect(data.hasRole("Admin")).toBe(true)
        expect(data.hasRole("Manager")).toBe(false)
    })

    test('an array "roles" claim (Entra)', () => {
        const data = new AuthData(jwtWith({ roles: ["Admin", "User"] }), { isAuthenticated: true })
        expect(data.hasRole("Admin")).toBe(true)
        expect(data.hasRole("User")).toBe(true)
        expect(data.hasRole("Manager")).toBe(false)
    })

    test("the ClaimTypes.Role URI (Identity default)", () => {
        const data = new AuthData(jwtWith({ [ROLE_URI]: "Admin" }), { isAuthenticated: true })
        expect(data.hasRole("Admin")).toBe(true)
    })

    test("no role claims of any spelling", () => {
        const data = new AuthData(jwtWith({ name: "u" }), { isAuthenticated: true })
        expect(data.hasRole("Admin")).toBe(false)
    })

    test("hasRole is not fooled by the permissions claim", () => {
        const data = new AuthData(jwtWith({ permissions: ["Admin"] }), { isAuthenticated: true })
        expect(data.hasRole("Admin")).toBe(false)
        expect(data.hasPermission("Admin")).toBe(true)
    })
})

describe("AuthData.role carries the first role, for display", () => {
    test("from a string claim", () => {
        expect(new AuthData(jwtWith({ role: "Admin" })).role).toBe("Admin")
    })

    test("the first entry of an array claim", () => {
        expect(new AuthData(jwtWith({ roles: ["Manager", "User"] })).role).toBe("Manager")
    })

    test("from the URI spelling", () => {
        expect(new AuthData(jwtWith({ [ROLE_URI]: "Admin" })).role).toBe("Admin")
    })

    test("undefined when the token carries no roles", () => {
        expect(new AuthData(jwtWith({ name: "u" })).role).toBeUndefined()
    })

    test("undefined on the empty (logged-out) AuthData", () => {
        expect(new AuthData().role).toBeUndefined()
    })
})

describe("the store delegates hasRole to the current AuthData", () => {
    const harness = (claims) => {
        const axios = {
            post: async () => ({ data: { token: jwtWith(claims), isAuthenticated: true } }),
        }
        return createAuth({ enabled: true, tokenManager: { token: undefined }, axios })
    }

    test("false before login, true after a token carrying the role arrives", async () => {
        setActivePinia(createPinia())
        const auth = harness({ role: "Admin" })
        const store = useAuthStore()

        expect(store.hasRole("Admin")).toBe(false)

        store.authData = await auth.service.login("u", "p")

        expect(store.hasRole("Admin")).toBe(true)
        expect(store.hasRole("Manager")).toBe(false)
    })
})
