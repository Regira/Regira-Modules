import type { AxiosInstance } from "axios"
import type { ITokenManager } from "./token-manager"
import { AuthService, type IAuthService } from "./auth-service"
import type { IAuthData } from "./AuthData"

export interface IAuth {
    enabled: boolean
    /** the JWT audience — reads through to `service.options`, the single owner (never assign; use the store's `setClientApp`) */
    readonly clientApp?: string
    tokenManager: ITokenManager
    service: IAuthService
}

export interface IGlobalAuth {
    enabled: boolean
    /** the JWT audience — reads through to `service.options` (see {@link IAuth.clientApp}) */
    readonly clientApp?: string
    tokenManager: ITokenManager
    service: IAuthService
    authData: IAuthData
    isAuthenticated: boolean
    isRequired: boolean
}
export type IAuthOptions = {
    clientApp?: string
    loginUrl?: string
}

interface Input extends IAuthOptions {
    enabled: boolean
    tokenManager: ITokenManager
    axios: AxiosInstance
}

let auth: IAuth
export function createAuth(options: Input): IAuth {
    const { enabled, tokenManager, axios, clientApp, loginUrl } = options
    // Single owner for the audience: the service options login() actually sends from — plain state, no
    // framework. Everything else (this getter, $auth, the store) reads through instead of keeping a copy,
    // so the mirrors can't drift apart. The store wraps this in its own reactive view.
    const service = new AuthService(axios, tokenManager, { clientApp, loginUrl })
    auth = {
        enabled,
        get clientApp() {
            return service.options.clientApp
        },
        tokenManager,
        service,
    }

    return auth
}

export const useAuth = () => auth

export type GlobalAuth = IGlobalAuth | { enabled: false; authData?: IAuthData }
let globalAuth: GlobalAuth
/** called by the auth plugin — the same object it exposes as `$auth` */
export function setGlobalAuth(value: GlobalAuth) {
    globalAuth = value
}
/**
 * The `$auth` object, script-side: wraps the store the auth plugin was configured with (which may be a
 * custom `authStore`, not this module's default pinia store). Available after the auth plugin installed —
 * same lifecycle caveat as `useAuth()`. Its `authData` getters read the reactive store, so computeds track.
 */
export const useGlobalAuth = () => globalAuth

/** display label for the signed-in user — not every JWT carries a displayName claim */
export const getAccountName = (auth: GlobalAuth = useGlobalAuth()) => auth?.authData?.displayName ?? auth?.authData?.name ?? auth?.authData?.email
