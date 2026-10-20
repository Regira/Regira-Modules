import type { Store } from "pinia"
import type { RouteLocationNormalized, RouteLocationRaw, Router } from "vue-router"

type GuardStore = Store & { isAuthenticated: boolean; hasPermission(value: string): boolean }

/**
 * Whether the identity in `store` passes every `meta.policy` and `meta.permissions` on the route and its parents — the
 * check the route guard runs for a signed-in user. A route marked `allowAnonymous` always passes. Use it to hide what
 * the guard would refuse, such as a navigation entry: `routeAllows(router.resolve({ name: "ApprovalsOverview" }), store)`.
 */
export function routeAllows(to: Pick<RouteLocationNormalized, "matched" | "meta">, store: { hasPermission(value: string): boolean }): boolean {
    if (to.meta?.allowAnonymous) {
        return true
    }
    // a policy receives the store it was given — the plugin's auth store, as for the guard
    const policies = to.matched.map((r) => r.meta?.policy as (s: typeof store) => boolean).filter((p) => typeof p == "function")
    if (!policies.every((p) => p(store))) {
        return false
    }
    const requiredPermissions = to.matched.flatMap((r) => (r.meta?.permissions as Array<string>) || [])
    return requiredPermissions.every((r) => store.hasPermission(r))
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
