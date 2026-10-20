import { describe, test, expect } from "vitest"
import { createRouter, createMemoryHistory } from "vue-router"
import { h } from "vue"
import { routeAllows } from "../../../src/vue/auth/route-guard"

// the guard's verdict as a boolean, for what is shown before a navigation: a navbar entry the guard would refuse
const View = { render: () => h("div") }
const router = createRouter({
    history: createMemoryHistory(),
    routes: [
        { path: "/", name: "home", component: View },
        {
            path: "/approvals",
            meta: { policy: (store) => store.hasRole("Administrator") },
            children: [{ path: "", name: "ApprovalOverview", component: View }],
        },
        { path: "/reports", name: "ReportOverview", component: View, meta: { permissions: ["reports.read"] } },
        { path: "/public", name: "public", component: View, meta: { allowAnonymous: true, policy: () => false } },
    ],
})
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
