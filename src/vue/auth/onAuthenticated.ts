import { watch, type WatchStopHandle } from "vue"
import { useGlobalAuth } from "./auth"
import { useAuthStore, type IAuthStore } from "./store"
import type { IAuthData } from "./AuthData"

// Stands in for the token in an app whose auth plugin is installed disabled (`enabled: false`): no token can
// ever arrive there, so watching for one would never fire and the caller's fetch would never run — the blank
// panel this primitive exists to prevent. Nothing is gated in such an app, so it counts as authenticated.
// A symbol can never collide with a real token, and it changes at most once, so the handler runs at most once.
const AUTH_DISABLED = Symbol("auth-disabled")

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
     * module's default pinia store — only pass this when neither applies. Naming a store here outranks the
     * plugin's `enabled` flag, so it is watched even in an app that installed the plugin disabled.
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
 *
 * Registration order does not matter: the plugin's store is resolved on every read, so a pinia store built
 * before `app.use(authPlugin, …)` still follows a custom `authStore` once that installs. An app that never
 * installs the plugin **at all** is the one gap — it is indistinguishable from one that has not installed it
 * *yet*, so the handler waits for a token that never comes (no error, no request). Such an app should
 * scaffold its slices with `--no-auth`, or install the plugin with `enabled: false`, which is detectable.
 */
export function onAuthenticated(handler: () => unknown, { immediate = true, store }: OnAuthenticatedOptions = {}): WatchStopHandle {
    // Resolved on the watcher's first read — which is synchronous, while the caller's `setup()` is still
    // active — and kept: resolving it inside the getter would later run from the scheduler with no current
    // instance, where pinia falls back to its module-global active instance (another app's store under SSR
    // or a multi-app page).
    let defaultStore: Pick<IAuthStore, "authData"> | undefined
    const readAuthData: () => IAuthData | undefined = store
        ? () => store.authData
        : () => {
              // `$auth.authData` reads through to the store the plugin was configured with, which may be a
              // custom `authStore` rather than this module's default — reading the default directly would
              // watch a store the app never populates. Read per evaluation rather than capturing it once:
              // `$auth` only exists after the plugin installed, and a store constructed before
              // `app.use(authPlugin, …)` would otherwise stay pinned to the default for good. `useGlobalAuth`
              // is reactive, so this watcher re-evaluates on the install itself and switches over then.
              const globalAuth = useGlobalAuth()
              if (globalAuth != null && "authData" in globalAuth) return (globalAuth as { authData: IAuthData }).authData
              return (defaultStore ??= useAuthStore()).authData
          }

    return watch(
        // The disabled state is watched as a value rather than short-circuited before the watch, so that it
        // honours `immediate` through the same path (a throwing handler reaches `app.config.errorHandler`
        // instead of aborting the caller's `setup()`) and so a plugin that installs disabled AFTER this
        // registration still releases the handler. An explicit `{ store }` is exempt: it names the store to
        // watch, and the per-call argument outranks the app-wide flag — the plugin being disabled says
        // nothing about a store the caller handed us.
        () => (!store && useGlobalAuth()?.enabled === false ? AUTH_DISABLED : readAuthData()?.token),
        (token) => {
            // `isAuthenticated` as well as the token: a custom IAuthService may build AuthData around a
            // token it has not accepted, and the shipped one pairs them anyway, so this costs nothing.
            if (token === AUTH_DISABLED || (token && readAuthData()?.isAuthenticated)) handler()
        },
        { immediate }
    )
}

export default onAuthenticated
