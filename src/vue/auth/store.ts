import { ref, computed, customRef, type Ref, type ComputedRef } from "vue"
import { useRouter } from "vue-router"
import { defineStore, type Store } from "pinia"
import { emptyAuthData } from "./auth-service"
import type { IAuthData } from "./AuthData"
import { useAuth } from "./auth"
import type { LoginInput } from "./useLoginForm"

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
    displayName: ComputedRef<string | undefined>
    hasClaim: ComputedRef<(type: string, value?: string) => boolean>
    getClaimValue: ComputedRef<(type: string) => string | Array<string> | undefined>
    // actions
    setClientApp(clientApp?: string): void
    login({ username, password }: LoginInput): Promise<boolean>
    validateToken(): Promise<boolean>
    refresh(o: Record<string, unknown>): Promise<boolean>
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
    displayName: string | undefined
    hasClaim: (type: string, value?: string) => boolean
    getClaimValue: (type: string) => string | Array<string> | undefined
    // actions
    setClientApp(clientApp?: string): void
    login({ username, password }: LoginInput): Promise<boolean>
    validateToken(): Promise<boolean>
    refresh(o: Record<string, unknown>): Promise<boolean>
    logout(): void
}

export function createStore(): IDefineAuthStore {
    const enabled = ref(true)
    // The audience is owned by the (framework-free) auth service options; this is only its reactive view for
    // Vue — it re-reads the owner on every evaluation and triggers on write, so no copy exists to go stale.
    const clientApp = customRef<string | undefined>((track, trigger) => ({
        get() {
            track()
            return useAuth()?.service?.options?.clientApp
        },
        set(value) {
            const auth = useAuth()
            if (auth?.service?.options) auth.service.options.clientApp = value
            trigger()
        },
    }))
    const authData = ref(emptyAuthData())
    const authRequired = ref(false)

    const router = useRouter()

    const isRequired = computed(() => enabled.value && !router.currentRoute.value?.meta?.allowAnonymous)
    const isAuthenticated = computed(() => !!authData.value.isAuthenticated)
    const displayName = computed(() => authData.value?.displayName)
    const getClaimValue = computed(() => (type: string) => authData.value.get(type))
    const hasClaim = computed(() => (type: string, value?: string) => authData.value?.hasClaim(type, value) ?? false)
    const hasPermission = computed(() => (permission: string) => authData.value?.hasPermission(permission) ?? false)

    function setClientApp(value?: string) {
        // one write path into the owner — `clientApp` above and `$auth` reflect it because they read through
        clientApp.value = value
    }
    async function login({ username, password }: LoginInput) {
        const { service } = useAuth()
        authData.value = await service.login(username, password)
        return authData.value.isAuthenticated
    }
    async function refresh(o?: Record<string, unknown>) {
        const { service } = useAuth()
        authData.value = await service.refresh(o)
        return authData.value.isAuthenticated
    }
    async function validateToken() {
        const { service } = useAuth()
        authData.value = await service.validateToken()
        return authData.value.isAuthenticated
    }
    function logout() {
        authData.value = emptyAuthData()
        const { service } = useAuth()
        service.logout()
    }

    return {
        enabled,
        clientApp,
        authData,
        authRequired,

        isRequired,
        isAuthenticated,
        hasPermission,
        displayName,
        hasClaim,
        getClaimValue,

        setClientApp,
        login,
        refresh,
        validateToken,
        logout,
    }
}
createStore.storeName = storeName

export const useAuthStore = defineStore(storeName, createStore)

export default useAuthStore
