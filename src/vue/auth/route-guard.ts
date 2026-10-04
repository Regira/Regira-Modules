import type { Store } from "pinia"
import type { RouteLocationNormalized, RouteLocationRaw, Router } from "vue-router"

/**
 * Registers the permission check as a `beforeEach` guard and returns the check itself, so a caller that registers the
 * guard after the router's first navigation (as the auth plugin does) can run it for the route already shown.
 */
export default ({ router, store }: { router: Router; store: Store & { isAuthenticated: boolean; hasPermission(value: string): boolean } }) => {
    const check = (to: RouteLocationNormalized): true | RouteLocationRaw => {
        // allowAnonmyous
        if (to.meta && to.meta.allowAnonymous) {
            return true
        }

        const isAuthenticated = store.isAuthenticated
        if (isAuthenticated) {
            const policies = to.matched.map((r) => r.meta?.policy as (store: Store) => boolean).filter((p) => typeof p == "function")
            if (policies.length && !policies.every((p) => p(store))) {
                return { name: "forbidden", query: { url: to.fullPath } }
            }

            const requiredPermissions = to.matched.flatMap((r) => (r.meta?.permissions as Array<string>) || [])

            if (requiredPermissions.length && !requiredPermissions.every((r) => store.hasPermission(r))) {
                return { name: "forbidden", query: { url: to.fullPath } }
            }

            return true
        }

        store.$patch({ authRequired: true })
        return true
        //return { name: "login", query: { returnUrl: to.query.returnUrl || to.fullPath } }
    }
    router.beforeEach((to, _from) => check(to))
    return check
}
