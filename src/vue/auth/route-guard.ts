import type { Store } from "pinia"
import type { Router } from "vue-router"

export default ({ router, store }: { router: Router; store: Store & { isAuthenticated: boolean; hasPermission(value: string): boolean } }) => {
    router.beforeEach((to, _from) => {
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
    })
}
