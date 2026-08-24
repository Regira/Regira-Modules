import type { Store } from "pinia"
import { startsWith } from "../../utilities/string-utility"
import { maskAxiosError } from "./error-logging"
import type { IAuthData } from "./AuthData"
import type { AxiosInstance } from "axios"
import type { ITokenManager } from "./token-manager"

export function addBearerHeader(axios: AxiosInstance, tokenManager: ITokenManager): AxiosInstance {
    axios.interceptors.request.use((config) => {
        if (tokenManager.token) {
            config.headers["Authorization"] = `Bearer ${tokenManager.token}`
        }
        return config
    })

    return axios
}

type ILogoutStore = { isAuthenticated: boolean; authData: IAuthData; validateToken(): Promise<boolean> }

export function autoLogoutOnFailedRequest(axios: AxiosInstance, store: Store & ILogoutStore) {
    axios.interceptors.response.use(
        (response) => response,
        async (error) => {
            const { config } = error
            // Every failed request passes through here, so nothing that reaches this line may carry a
            // credential to the console — `maskAxiosError` logs the error field by field with the request's
            // Authorization header, body and query masked (see error-logging.ts). Nothing is mutated, so the
            // error rejected below still holds the real header for a retry to reuse. The decoded claims are
            // logged as they are: diagnostics worth having, and not a credential anything can replay. The
            // axios instance is not logged at all — noise, and a leak vector for any default header.
            console.error("axios error", { error: maskAxiosError(error), auth: { ...store.authData } })
            // Deliberately narrower than error-logging's `isAuthUrl`: this decides whether a 401 should log
            // the user out, and only the `auth/` calls made with a token (validate, refresh, password) may
            // skip that. A failed login is not exempted — it needs no exemption, since `isAuthenticated` is
            // false while logging in. A request that failed before it was built carries no config at all.
            if (!startsWith(config?.url || "", "auth/", true) && [401 /*, 403*/].includes(error.response?.status)) {
                store.$patch({ authRequired: true })
                // will log user out when token expired and prompt login popup
                if (store.isAuthenticated) {
                    await store.validateToken()
                }
            }
            return Promise.reject(error)
        }
    )
}
