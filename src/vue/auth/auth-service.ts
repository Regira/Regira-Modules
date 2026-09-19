import type { AxiosInstance } from "axios"
import { createQueryString } from "../http/query"
import type { ITokenManager } from "./token-manager"
import { AuthData, type IAuthData } from "./AuthData"
import { maskAxiosError } from "./error-logging"
import type { IAuthOptions } from "./auth"

export type IAuthenticateInput = { token: string; isAuthenticated: boolean }
export type IChangePasswordInput = { newPassword: string; currentPassword: string }
export type IForgotPasswordInput = { username: string; siteUrl: string; siteName?: string }
export type IResetPasswordInput = { token: string; password: string }

export interface IAuthService {
    /**
     * Owns `clientApp` (the JWT audience) as plain state — the store and `$auth` read through to it rather
     * than copying it. Change it through the auth store's `setClientApp()`: that is the path that notifies
     * Vue. Mutating a field here directly is seen by later reads but re-renders nothing.
     */
    readonly options: IAuthOptions
    authenticate({ token, isAuthenticated }: IAuthenticateInput): IAuthData
    login(username: string, password: string): Promise<IAuthData>
    refresh(o?: Record<string, unknown>): Promise<IAuthData>
    validateToken(): Promise<IAuthData>
    logout(): void
    changePassword(input: IChangePasswordInput): Promise<void>
    forgotPassword(input: IForgotPasswordInput): Promise<void>
    resetPassword(input: IResetPasswordInput): Promise<void>
}
export const emptyAuthData = (): IAuthData => new AuthData()

/**
 * The API mints the JWT with `clientApp` as its audience (Regira's `AccountControllerBase` takes it
 * `[FromQuery]`), so the configured `clientApp` has to ride the login request itself — every later call
 * fails audience validation otherwise. `refresh` needs no such thing: it re-reads `aud` off the current token.
 * An explicit `clientApp=` already in `loginUrl` wins, so a URL that spells it out keeps working untouched.
 */
const withClientApp = (url: string, clientApp?: string) => {
    if (!clientApp || /[?&]clientApp=/.test(url)) return url
    return `${url}${url.includes("?") ? "&" : "?"}clientApp=${encodeURIComponent(clientApp)}`
}

export class AuthService implements IAuthService {
    options: IAuthOptions

    constructor(
        private axios: AxiosInstance,
        private tokenManager: ITokenManager,
        options?: IAuthOptions
    ) {
        this.options = options || {}
    }

    authenticate({ token, isAuthenticated }: IAuthenticateInput): IAuthData {
        if (isAuthenticated) {
            this.tokenManager.token = token
            return new AuthData(token, { isAuthenticated })
        }

        // clear token
        this.tokenManager.token = undefined
        return emptyAuthData()
    }
    async login(username: string, password: string): Promise<IAuthData> {
        const url = withClientApp(this.options?.loginUrl || "auth", this.options?.clientApp)
        const response = await this.axios.post(url, { username, password })
        return this.authenticate(response.data)
    }
    async refresh(queryParams?: Record<string, unknown>): Promise<IAuthData> {
        const query = createQueryString(queryParams || {})
        const url = `auth/refresh/?${query}`
        const response = await this.axios.post(url)
        return this.authenticate(response.data)
    }
    async validateToken(): Promise<IAuthData> {
        if (this.tokenManager.token != null) {
            try {
                const response = await this.axios.post("auth/validate")
                if (response.status >= 200 && response.status < 300) {
                    return this.authenticate({ token: this.tokenManager.token, isAuthenticated: true })
                } else {
                    // The token itself is never logged, here or below: it is a bearer credential, replayable
                    // until it expires, and console output is captured verbatim by breadcrumb and
                    // session-replay telemetry. This path runs on every app load that restores a saved token,
                    // so its logs are routine. `tokenManager` is not logged either — it holds the same token.
                    console.warn("validateToken: invalid statusCode", response.status)
                    this.discardRejectedToken(response.status)
                }
            } catch (ex: any) {
                // the error carries the request that produced it, Authorization header included
                console.error("validating token failed", maskAxiosError(ex))
                this.discardRejectedToken(ex.response?.status)
            }
        }
        return emptyAuthData()
    }
    /**
     * Drops the stored token when `auth/validate` has rejected it outright. **403 is as terminal as 401
     * here:** the endpoint answers 403 for a token whose signature is valid but whose user no longer exists
     * (deleted, deactivated, or the database reseeded under it). Keeping such a token makes the failure
     * permanent — every reload replays it, the app renders unauthenticated with no sign-in gate to re-open,
     * and only clearing site data by hand recovers.
     *
     * Scoped to this call on purpose: a 403 from an ordinary resource means "signed in, not allowed here"
     * and must not sign the user out, which is why the response interceptor acts on 401 alone.
     */
    private discardRejectedToken(status?: number): void {
        if (status === 401 || status === 403) {
            this.tokenManager.token = undefined
        }
    }
    logout(): void {
        this.tokenManager.token = undefined
    }
    async changePassword(input: IChangePasswordInput) {
        const url = `auth/password`
        await this.axios.post(url, input)
    }
    async forgotPassword(input: IForgotPasswordInput) {
        const url = `auth/password/recover`
        await this.axios.post(url, input)
    }
    async resetPassword(input: IResetPasswordInput) {
        const url = `auth/password/reset`
        await this.axios.post(url, input)
    }
}

export default AuthService
