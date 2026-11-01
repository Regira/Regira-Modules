import type { Store } from "pinia"
import type { AxiosInstance } from "axios"
import { autoLogoutOnFailedRequest as logoutOnFailedRequest } from "../../core/auth/auth-axios"
import type { IAuthData } from "../../core/auth/AuthData"

export { addBearerHeader } from "../../core/auth/auth-axios"

type ILogoutStore = { isAuthenticated: boolean; authData: IAuthData; validateToken(): Promise<boolean> }

export function autoLogoutOnFailedRequest(axios: AxiosInstance, store: Store & ILogoutStore) {
    logoutOnFailedRequest(axios, {
        isAuthenticated: () => store.isAuthenticated,
        authData: () => store.authData,
        validateToken: () => store.validateToken(),
        requireAuth: () => store.$patch({ authRequired: true }),
    })
}
