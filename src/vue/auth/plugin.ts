import { watch, type App } from "vue"
import type { AxiosInstance } from "axios"
import { addBearerHeader, autoLogoutOnFailedRequest } from "./auth-axios"
import { useAuthStore, type IAuthStore } from "./store"
import routeGuard from "./route-guard"
import type { ITokenManager } from "./token-manager"
import { createAuth, setGlobalAuth, type IAuthOptions } from "./auth"
import type { IAuthData } from "./AuthData"

type Input<TStore extends IAuthStore, TTokenManager extends ITokenManager> = IAuthOptions & {
    tokenManager: TTokenManager
    authStore?: TStore
    axios: AxiosInstance
    enableRouteGuard?: boolean
    enabled?: boolean
    onAuthenticationChange?(auth: IAuthData): void
}

export default {
    async install<TStore extends IAuthStore = IAuthStore, TTokenManager extends ITokenManager = ITokenManager>(
        app: App,
        options: Input<TStore, TTokenManager>
    ) {
        const {
            clientApp,
            loginUrl,
            tokenManager,
            authStore,
            axios,
            enableRouteGuard = true,
            enabled = true,
            onAuthenticationChange = () => {},
        } = options
        const { $router: router } = app.config.globalProperties

        const auth = createAuth({
            enabled,
            tokenManager,
            axios,
            clientApp,
            loginUrl,
        })

        const store = authStore ?? useAuthStore()

        // keep the store's enabled flag in sync with the plugin option so isRequired
        // is correct when auth is disabled
        store.$patch({ enabled })

        if (enabled) {
            app.config.globalProperties.$auth = {
                ...auth,
                // the spread would freeze auth's clientApp getter at its current value — re-declare it so
                // $auth keeps reading through to the service options
                get clientApp() {
                    return auth.clientApp
                },
                get authData() {
                    return store.authData
                },
                get isAuthenticated() {
                    return !!store.authData?.isAuthenticated
                },
                get isRequired() {
                    return store.authRequired
                },
            }

            if (clientApp) {
                // the default store reads through to the service options (already set by createAuth), so this
                // is a no-op there; it's what seeds a CUSTOM authStore that keeps its own state.
                store.setClientApp(clientApp)
            }
        } else {
            app.config.globalProperties.$auth = { enabled: false }
        }
        // script-side access to the same object (useGlobalAuth) — templates use $auth
        setGlobalAuth(app.config.globalProperties.$auth)

        if (enabled) {
            addBearerHeader(axios, tokenManager)

            let tokenInterval: ReturnType<typeof setInterval> | undefined

            watch(
                () => store.isAuthenticated,
                () => {
                    if (store.isAuthenticated) {
                        // triggers login-popup when token becomes invalid
                        clearInterval(tokenInterval)
                        tokenInterval = setInterval(() => store.validateToken(), store.authData.expires * 1000)
                    }
                    onAuthenticationChange(store.authData)
                }
            )

            // check saved (cookie, localStorage) token
            await store.validateToken()
            // check route permissions
            enableRouteGuard && routeGuard({ router, store })
            // log user out when token is invalidated (so loginPopup can appear automatically)
            autoLogoutOnFailedRequest(axios, store)
        } else {
            onAuthenticationChange({ isAuthenticated: false } as IAuthData)
        }
    },
}
