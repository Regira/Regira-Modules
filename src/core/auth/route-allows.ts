/** what a route record says about who may see it */
export type RouteAccess<S> = {
    allowAnonymous?: boolean
    /** receives the store it was given to check */
    policy?: (store: S) => boolean
    permissions?: Array<string>
}

/**
 * Whether the identity in `store` passes every `policy` and `permissions` on a route's records, root first. A route
 * marked `allowAnonymous` always passes; the mark of a record stands for its children until one of them says otherwise.
 * A router that keeps a route's meta itself passes `allowAnonymous` as that meta says it, which is what its guard reads.
 */
export function routeAllows<S extends { hasPermission(value: string): boolean }>(
    metas: Array<RouteAccess<S> | undefined>,
    store: S,
    allowAnonymous: boolean = !!Object.assign({}, ...metas).allowAnonymous
): boolean {
    if (allowAnonymous) {
        return true
    }
    const policies = metas.map((meta) => meta?.policy).filter((p) => typeof p == "function")
    if (!policies.every((p) => p(store))) {
        return false
    }
    const requiredPermissions = metas.flatMap((meta) => meta?.permissions || [])
    return requiredPermissions.every((r) => store.hasPermission(r))
}
