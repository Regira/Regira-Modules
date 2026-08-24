import type { Store } from "pinia"
import { startsWith } from "../../utilities/string-utility"
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

/** copy of a request config with the bearer credential masked — the original is never touched */
function maskAuthHeader(config: { headers?: Record<string, unknown> } | undefined) {
    if (config?.headers == null) return config
    const headers: Record<string, unknown> = { ...config.headers }
    // header names are case-insensitive, so match on the name rather than trusting one spelling
    for (const key of Object.keys(headers)) {
        if (key.toLowerCase() === "authorization") headers[key] = "<redacted>"
    }
    return { ...config, headers }
}

export function autoLogoutOnFailedRequest(axios: AxiosInstance, store: Store & ILogoutStore) {
    axios.interceptors.response.use(
        (response) => response,
        async (error) => {
            const { config } = error
            // No bearer token may reach the console: console output is captured verbatim by breadcrumb and
            // session-replay telemetry, and every failed request passes through here. The JWT reaches this
            // line through the Authorization header `addBearerHeader` put on the request, so it is masked in
            // a copy. The error is logged field by field for the same reason: it carries this very config.
            // Nothing is mutated, so what gets rejected below still holds the real header for a retry to
            // reuse. The decoded claims are logged as they are: diagnostics worth having, and not a
            // credential anything can replay.
            console.error("axios error", {
                error: {
                    message: error?.message,
                    code: error?.code,
                    status: error?.response?.status,
                    data: error?.response?.data,
                    stack: error?.stack,
                },
                config: maskAuthHeader(config),
                auth: { ...store.authData },
                axios,
            })
            if (!startsWith(config.url, "auth/", true) && [401 /*, 403*/].includes(error.response?.status)) {
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
