import EventHandler from "../events/event-handler"

type AuthService = {
    login(email: string, password: string): Promise<unknown>
    refresh(refreshToken: string): Promise<unknown>
}

type IdentityState = {
    isAuthenticated: boolean
    refreshToken?: string
    expiresAt?: Date
    expiresIn?: number
    [key: string]: unknown
}

/**
 * Handles login/logoff and saves state of current identity
 * automatically refreshes token when autoRefresh is enabled
 */
class IdentityManager {
    private _service: AuthService
    private _autoRefreshTimer?: ReturnType<typeof setTimeout>
    private _autoRefresh: boolean
    state!: IdentityState

    constructor({ authenticationService, autoRefresh = false }: { authenticationService: AuthService; autoRefresh?: boolean }) {
        this._service = authenticationService
        this._autoRefresh = autoRefresh

        this._setState()
    }

    get autoRefresh() {
        return this._autoRefresh
    }
    set autoRefresh(value) {
        this._autoRefresh = !!value
        this._checkAutoRefresh()
    }

    async login(email: string, password: string) {
        const identityResponse = await this._service.login(email, password)
        this._setState(identityResponse)
        this._checkAutoRefresh()
        return (this as unknown as { trigger(e: string, arg?: unknown): Promise<unknown[]> }).trigger("login", { ...this.state })
    }
    async refresh() {
        const identityResponse = await this._service.refresh(this.state.refreshToken!)
        this._setState(identityResponse)
        this._checkAutoRefresh()
        return (this as unknown as { trigger(e: string, arg?: unknown): Promise<unknown[]> }).trigger("refresh", { ...this.state })
    }
    async logoff() {
        const oldState = { ...this.state }
        this._setState()
        return (this as unknown as { trigger(e: string, arg?: unknown): Promise<unknown[]> }).trigger("logoff", oldState)
    }

    _setState(response?: unknown) {
        if (!response) {
            this.state = { isAuthenticated: false }
            return
        }

        const r = response as IdentityState
        this.state = {
            ...r,
            expiresAt: new Date(new Date().getTime() + (r.expiresIn as number) * 1000),
            isAuthenticated: true,
        }
    }
    _checkAutoRefresh() {
        const mgr = this
        if (this._autoRefreshTimer) {
            clearTimeout(this._autoRefreshTimer)
        }
        if (this._autoRefresh) {
            const refreshInMs = Math.abs(this.state.expiresAt!.getTime() - new Date().getTime()) - 60 * 1000 //1 minute to spare
            this._autoRefreshTimer = setTimeout(() => mgr.refresh(), refreshInMs)
        }
    }
}
EventHandler.injectInto(IdentityManager.prototype)

export default IdentityManager
