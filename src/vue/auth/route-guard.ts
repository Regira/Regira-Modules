import type { Store } from "pinia"
import type { RouteLocationNormalized, RouteLocationRaw, Router } from "vue-router"
import { routeAllows as recordsAllow, type RouteAccess } from "../../core/auth/route-allows"

type GuardStore = Store & { isAuthenticated: boolean; hasPermission(value: string): boolean }

/**
 * Whether the identity in `store` passes every `meta.policy` and `meta.permissions` on the route and its parents — the
 * check the route guard runs for a signed-in user. A route marked `allowAnonymous` always passes. Use it to hide what
 * the guard would refuse, such as a navigation entry: `routeAllows(router.resolve({ name: "ApprovalsOverview" }), store)`.
 */
export function routeAllows(to: Pick<RouteLocationNormalized, "matched" | "meta">, store: { hasPermission(value: string): boolean }): boolean {
    // `to.meta` starts as the merge of these records' meta, and an app's own guard can edit it, so it decides whether
    // the route is open, as it does for the guard below. Always a boolean: `undefined` would leave it to the records.
    // A policy receives the store it was given — the plugin's auth store, as for the guard
    return recordsAllow(to.matched.map((r) => r.meta) as Array<RouteAccess<typeof store>>, store, !!to.meta?.allowAnonymous)
}

/**
 * Registers the permission check as a `beforeEach` guard and returns the check itself, so a caller that registers the
 * guard after the router's first navigation (as the auth plugin does) can run it for the route already shown.
 */
export default ({ router, store }: { router: Router; store: GuardStore }) => {
    const check = (to: RouteLocationNormalized): true | RouteLocationRaw => {
        // allowAnonmyous
        if (to.meta && to.meta.allowAnonymous) {
            return true
        }

        const isAuthenticated = store.isAuthenticated
        if (isAuthenticated) {
            return routeAllows(to, store) ? true : { name: "forbidden", query: { url: to.fullPath } }
        }

        store.$patch({ authRequired: true })
        return true
        //return { name: "login", query: { returnUrl: to.query.returnUrl || to.fullPath } }
    }
    router.beforeEach((to, _from) => check(to))
    return check
}
