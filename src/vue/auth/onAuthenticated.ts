import { watch, type WatchStopHandle } from "vue"
import { useGlobalAuth } from "./auth"
import { useAuthStore, type IAuthStore } from "./store"
import type { IAuthData } from "./AuthData"

export type OnAuthenticatedOptions = {
    /**
     * Run the handler straight away when an authenticated token is already present (default `true`).
     *
     * Pass `false` in a view whose data is *already* fetched on mount by `useSearchView`/`useRouteOverview`
     * or `useDetails` — those register their own `onMounted` fetch, and an immediate run would fire a
     * second, unsequenced request during `setup`, before the search object and paging are populated from
     * the route.
     */
    immediate?: boolean
    /**
     * The store to read from. Defaults to the one the auth plugin was configured with, falling back to this
     * module's default pinia store — only pass this when neither applies.
     */
    store?: Pick<IAuthStore, "authData">
}

/**
 * Runs `handler` whenever an authenticated token arrives: signing in, a refresh (a tenant switch included),
 * and a token restored from storage on a hard reload.
 *
 * It watches the token rather than listening for named store actions, which matters twice over: no action
 * can be missed (restoring a stored token dispatches `validateToken`, not `login`, and views mount before
 * it resolves), and re-validating the *same* token — what the plugin's periodic check does — leaves the
 * token equal, so the handler does not re-run.
 *
 * Returns the watch stop handle. Registering inside `setup` scopes it to the component automatically.
 *
 * ```ts
 * onAuthenticated(() => load())
 * ```
 */
export function onAuthenticated(handler: () => unknown, { immediate = true, store }: OnAuthenticatedOptions = {}): WatchStopHandle {
    // `$auth.authData` reads through to the store the plugin was configured with, which may be a custom
    // `authStore` rather than this module's default — reading the default directly would watch a store the
    // app never populates. It is only set once the plugin has installed, so a store constructed before
    // `app.use(authPlugin, …)` falls back to the default (which is what such an app is using anyway).
    const globalAuth = useGlobalAuth()
    const readAuthData: () => IAuthData | undefined = store
        ? () => store.authData
        : globalAuth != null && "authData" in globalAuth
          ? () => (globalAuth as { authData: IAuthData }).authData
          : () => useAuthStore().authData

    return watch(
        () => readAuthData()?.token,
        (token) => {
            // `isAuthenticated` as well as the token: a custom IAuthService may build AuthData around a
            // token it has not accepted, and the shipped one pairs them anyway, so this costs nothing.
            if (token && readAuthData()?.isAuthenticated) handler()
        },
        { immediate }
    )
}

export default onAuthenticated
