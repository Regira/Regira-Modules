import { computed, customRef, type Ref, type ComputedRef } from "vue"
import { useRouter } from "vue-router"
import { defineStore, type Store } from "pinia"
import { createAuthState } from "../../core/auth/auth-state"
import type { IAuthData } from "../../core/auth/AuthData"
import type { LoginInput } from "../../core/auth/forms"
import { vueBox } from "../box"
import { useAuth } from "./auth"

const storeName: string = "Auth"
export interface IDefineAuthStore {
    // state
    enabled: Ref<boolean>
    /** reactive view of `service.options.clientApp` (the owner) — reads and writes both go straight to it */
    clientApp: Ref<string | undefined>
    authData: Ref<IAuthData>
    authRequired: Ref<boolean>
    // getters
    isAuthenticated: ComputedRef<boolean>
    isRequired: ComputedRef<boolean>
    hasPermission: ComputedRef<(permission: string) => boolean>
    hasRole: ComputedRef<(role: string) => boolean>
    displayName: ComputedRef<string | undefined>
    hasClaim: ComputedRef<(type: string, value?: string) => boolean>
    getClaimValue: ComputedRef<(type: string) => string | Array<string> | undefined>
    // actions
    setClientApp(clientApp?: string): void
    login({ username, password }: LoginInput): Promise<boolean>
    validateToken(): Promise<boolean>
    /** Re-issues the token: `o` is sent as the query string of `POST auth/refresh/` (e.g. `{ tenantId }`). */
    refresh(o?: Record<string, unknown>): Promise<boolean>
    logout(): void
}
export interface IAuthStore extends Store {
    // state
    enabled: boolean
    /** reactive view of `service.options.clientApp` (the owner) — reads and writes both go straight to it */
    clientApp?: string | undefined
    authData: IAuthData
    authRequired: boolean
    // getters
    isAuthenticated: boolean
    isRequired: boolean
    hasPermission: (permission: string) => boolean
    hasRole: (role: string) => boolean
    displayName: string | undefined
    hasClaim: (type: string, value?: string) => boolean
    getClaimValue: (type: string) => string | Array<string> | undefined
    // actions
    setClientApp(clientApp?: string): void
    login({ username, password }: LoginInput): Promise<boolean>
    validateToken(): Promise<boolean>
    /** Re-issues the token: `o` is sent as the query string of `POST auth/refresh/` (e.g. `{ tenantId }`). */
    refresh(o?: Record<string, unknown>): Promise<boolean>
    logout(): void
}

export function createStore(): IDefineAuthStore {
    const router = useRouter()
    const state = createAuthState({
        box: vueBox,
        service: () => useAuth()?.service,
        isAnonymousRoute: () => !!router.currentRoute.value?.meta?.allowAnonymous,
    })
    // The audience is owned by the (framework-free) auth service options; this is only its reactive view for
    // Vue — it re-reads the owner on every evaluation and triggers on write, so no copy exists to go stale.
    const clientApp = customRef<string | undefined>((track, trigger) => ({
        get() {
            track()
            return state.clientApp()
        },
        set(value) {
            state.setClientApp(value)
            trigger()
        },
    }))

    return {
        enabled: state.enabled as Ref<boolean>,
        clientApp,
        authData: state.authData as Ref<IAuthData>,
        authRequired: state.authRequired as Ref<boolean>,

        isRequired: computed(state.isRequired),
        isAuthenticated: computed(state.isAuthenticated),
        hasPermission: computed(() => state.hasPermission),
        hasRole: computed(() => state.hasRole),
        displayName: computed(state.displayName),
        hasClaim: computed(() => state.hasClaim),
        getClaimValue: computed(() => state.getClaimValue),

        setClientApp(value?: string) {
            // one write path into the owner — `clientApp` above and `$auth` reflect it because they read through
            clientApp.value = value
        },
        login: state.login,
        refresh: state.refresh,
        validateToken: state.validateToken,
        logout: state.logout,
    }
}
createStore.storeName = storeName

export const useAuthStore = defineStore(storeName, createStore)

export default useAuthStore
