import { describe, test, expect, vi } from "vitest"
import { createRouter, createMemoryHistory } from "vue-router"
import { h } from "vue"
import routeGuard, { routeAllows } from "../../../src/vue/auth/route-guard"

// the guard's verdict as a boolean, for what is shown before a navigation: a navbar entry the guard would refuse
const View = { render: () => h("div") }
const routes = [
    { path: "/", name: "home", component: View },
    {
        path: "/approvals",
        meta: { policy: (store) => store.hasRole("Administrator") },
        children: [{ path: "", name: "ApprovalOverview", component: View }],
    },
    { path: "/reports", name: "ReportOverview", component: View, meta: { permissions: ["reports.read"] } },
    { path: "/public", name: "public", component: View, meta: { allowAnonymous: true, policy: () => false } },
]
const router = createRouter({ history: createMemoryHistory(), routes })
const storeWith = ({ roles = [], permissions = [] } = {}) => ({
    isAuthenticated: true,
    hasRole: (r) => roles.includes(r),
    hasPermission: (p) => permissions.includes(p),
})

describe("routeAllows", () => {
    test("a route without policy or permissions passes", () => {
        expect(routeAllows(router.resolve({ name: "home" }), storeWith())).toBe(true)
    })

    test("a parent's policy applies to its child", () => {
        const route = router.resolve({ name: "ApprovalOverview" })
        expect(routeAllows(route, storeWith({ roles: ["Administrator"] }))).toBe(true)
        expect(routeAllows(route, storeWith({ roles: ["Employee"] }))).toBe(false)
    })

    test("permissions are checked through the store", () => {
        const route = router.resolve({ name: "ReportOverview" })
        expect(routeAllows(route, storeWith({ permissions: ["reports.read"] }))).toBe(true)
        expect(routeAllows(route, storeWith())).toBe(false)
    })

    test("allowAnonymous passes whatever the policy says", () => {
        expect(routeAllows(router.resolve({ name: "public" }), storeWith())).toBe(true)
    })
})

// `to.meta` starts as the merge of the route's records, and a `beforeEach` can edit it. The guard reads it, so the check
// has to as well: going by the records would let a signed-in user through to a route the app closed.
describe("routeAllows follows to.meta", () => {
    test("a guard that closes an open route closes it here too", () => {
        const route = router.resolve({ name: "public" })
        const { allowAnonymous, ...rest } = route.meta

        expect(allowAnonymous).toBe(true)
        expect(routeAllows({ ...route, meta: { ...rest, allowAnonymous: false } }, storeWith())).toBe(false)
        expect(routeAllows({ ...route, meta: { ...rest, allowAnonymous: undefined } }, storeWith())).toBe(false)
        expect(routeAllows({ ...route, meta: rest }, storeWith())).toBe(false)
    })

    test("a guard that opens a closed route opens it here too", () => {
        const route = router.resolve({ name: "ReportOverview" })

        expect(routeAllows({ ...route, meta: { ...route.meta, allowAnonymous: true } }, storeWith())).toBe(true)
    })

    test("the route guard refuses a route an app's guard closed", async () => {
        const closing = createRouter({
            history: createMemoryHistory(),
            routes: [
                { path: "/", name: "home", component: View },
                { path: "/report", name: "report", component: View, meta: { allowAnonymous: true, permissions: ["needs-this"] } },
                { path: "/forbidden", name: "forbidden", component: View, meta: { allowAnonymous: true } },
            ],
        })
        closing.beforeEach((to) => {
            if (to.name === "report") to.meta.allowAnonymous = false
        })
        routeGuard({ router: closing, store: { ...storeWith(), $patch: () => {} } })

        await closing.push("/report")

        expect(closing.currentRoute.value.name).toBe("forbidden")
    })
})

// the flag prompts the login popup, which has no place on a public page
describe("the route guard, signed out", () => {
    test("flags a sign-in on a closed route, and nothing on an open one", async () => {
        const guarded = createRouter({ history: createMemoryHistory(), routes })
        const store = { isAuthenticated: false, $patch: vi.fn() }
        routeGuard({ router: guarded, store })

        await guarded.push("/public")
        expect(store.$patch).not.toHaveBeenCalled()

        await guarded.push("/reports")
        expect(store.$patch).toHaveBeenCalledWith({ authRequired: true })
    })
})
