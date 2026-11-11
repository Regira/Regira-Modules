import { shallowRef } from "vue"
import type { ITokenManager } from "../../core/auth/token-manager"
import type { IAuthOptions, IAuthService } from "../../core/auth/auth-service"
import { createAuth as createAuthSetup, type AuthInput, type IAuth } from "../../core/auth/auth"
import type { IAuthData } from "../../core/auth/AuthData"

export type { IAuth }

export interface IGlobalAuth {
    enabled: boolean
    /** the JWT audience — reads through to `service.options` (see {@link IAuth.clientApp}) */
    readonly clientApp?: string
    tokenManager: ITokenManager
    service: IAuthService
    authData: IAuthData
    isAuthenticated: boolean
    /** the auth store's route-driven `isRequired`: auth is enabled and the current route is not `allowAnonymous` */
    isRequired: boolean
}
export type { IAuthOptions }

let auth: IAuth
export function createAuth(options: AuthInput): IAuth {
    auth = createAuthSetup(options)
    return auth
}

export const useAuth = () => auth

export type GlobalAuth = IGlobalAuth | { enabled: false; authData?: IAuthData }
// A ref, not a plain binding: this is assigned when the plugin installs, which is AFTER any store or
// composable built at import time has already read it. Reactive means such a reader re-evaluates then and
// picks up the store the plugin was configured with, instead of staying on whatever it saw first
// (`onAuthenticated` registered inside a pinia setup store is the case that needs it). Shallow — the value
// is `$auth`, whose getters read the reactive store themselves.
const globalAuth = shallowRef<GlobalAuth | undefined>()
/** called by the auth plugin — the same object it exposes as `$auth` */
export function setGlobalAuth(value: GlobalAuth) {
    globalAuth.value = value
}
/**
 * The `$auth` object, script-side: wraps the store the auth plugin was configured with (which may be a
 * custom `authStore`, not this module's default pinia store). Available after the auth plugin installed —
 * same lifecycle caveat as `useAuth()`, except that reading it inside a computed or watcher tracks the
 * install itself. Its `authData` getters read the reactive store, so computeds track those too.
 */
export const useGlobalAuth = () => globalAuth.value as GlobalAuth

/** display label for the signed-in user — not every JWT carries a displayName claim */
export const getAccountName = (auth: GlobalAuth = useGlobalAuth()) => auth?.authData?.displayName ?? auth?.authData?.name ?? auth?.authData?.email
