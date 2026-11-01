import type { Box, BoxFactory } from "../box"
import { emptyAuthData, type IAuthService } from "./auth-service"
import type { IAuthData } from "./AuthData"
import type { LoginInput } from "./forms"

export type AuthStateInput = {
    box: BoxFactory
    /** read when it is used: a layer's state can exist before the app made its auth setup */
    service(): IAuthService | undefined
    /** the current route is open to anonymous visitors */
    isAnonymousRoute(): boolean
}
export type AuthState = {
    enabled: Box<boolean>
    authData: Box<IAuthData>
    authRequired: Box<boolean>

    /** auth is enabled and the current route is not open to anonymous visitors */
    isRequired(): boolean
    isAuthenticated(): boolean
    displayName(): string | undefined
    hasPermission(permission: string): boolean
    hasRole(role: string): boolean
    hasClaim(type: string, value?: string): boolean
    getClaimValue(type: string): string | Array<string> | undefined
    /** the JWT audience, read from the service options, which own it: the state keeps no copy to go stale */
    clientApp(): string | undefined
    setClientApp(value?: string): void

    login({ username, password }: LoginInput): Promise<boolean>
    validateToken(): Promise<boolean>
    /** Re-issues the token: `o` is sent as the query string of `POST auth/refresh/` (e.g. `{ tenantId }`). */
    refresh(o?: Record<string, unknown>): Promise<boolean>
    logout(): void
}

/** who is signed in; a framework layer keeps one app-wide (the core's rule 5) */
export function createAuthState({ box, service, isAnonymousRoute }: AuthStateInput): AuthState {
    const enabled = box(true)
    const authData = box<IAuthData>(emptyAuthData())
    const authRequired = box(false)

    return {
        enabled,
        authData,
        authRequired,

        isRequired: () => enabled.value && !isAnonymousRoute(),
        isAuthenticated: () => !!authData.value.isAuthenticated,
        displayName: () => authData.value?.displayName,
        hasPermission: (permission) => authData.value?.hasPermission(permission) ?? false,
        hasRole: (role) => authData.value?.hasRole(role) ?? false,
        hasClaim: (type, value) => authData.value?.hasClaim(type, value) ?? false,
        getClaimValue: (type) => authData.value.get(type),
        clientApp: () => service()?.options?.clientApp,
        setClientApp(value) {
            const options = service()?.options
            if (options) options.clientApp = value
        },

        async login({ username, password }) {
            authData.value = await service()!.login(username, password)
            return authData.value.isAuthenticated
        },
        async refresh(o) {
            authData.value = await service()!.refresh(o)
            return authData.value.isAuthenticated
        },
        async validateToken() {
            authData.value = await service()!.validateToken()
            return authData.value.isAuthenticated
        },
        logout() {
            authData.value = emptyAuthData()
            service()!.logout()
        },
    }
}
