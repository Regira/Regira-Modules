import type { AxiosInstance } from "axios"
import type { ITokenManager } from "./token-manager"
import { AuthService, type IAuthOptions, type IAuthService } from "./auth-service"
import { registerCredentialUrls, registerLoginUrl, resetCredentialUrls } from "./error-logging"

export interface IAuth {
    enabled: boolean
    /** the JWT audience — reads through to `service.options`, the single owner (never assign; use `setClientApp`) */
    readonly clientApp?: string
    tokenManager: ITokenManager
    service: IAuthService
}

export interface AuthInput extends IAuthOptions {
    enabled: boolean
    tokenManager: ITokenManager
    axios: AxiosInstance
}

/** the app's auth setup; a framework layer keeps the one it created app-wide */
export function createAuth(options: AuthInput): IAuth {
    const { enabled, tokenManager, axios, clientApp, loginUrl, credentialUrls } = options
    // Single owner for the audience: the service options login() actually sends from — plain state, no
    // framework. Everything else (this getter, $auth, the store) reads through instead of keeping a copy,
    // so the mirrors can't drift apart. The auth state exposes it to a layer as a getter and a setter.
    const service = new AuthService(axios, tokenManager, { clientApp, loginUrl })
    // a login endpoint that is not `auth` still posts the password — tell the log masking about it
    registerLoginUrl(loginUrl)
    // The interceptor logs every failed request the app makes, not just this module's, so the app's own
    // credential-bearing endpoints belong on the same list. Reset first: this setup owns what the options
    // carry, and re-running it must not accumulate. `registerCredentialUrls` stays available afterwards.
    resetCredentialUrls()
    registerCredentialUrls(...(credentialUrls ?? []))

    return {
        enabled,
        get clientApp() {
            return service.options.clientApp
        },
        tokenManager,
        service,
    }
}
