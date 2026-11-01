import type { IAuthData } from "./AuthData"

// Stands in for the token in an app whose auth is installed disabled (`enabled: false`): no token can ever
// arrive there, so watching for one would never fire and the caller's fetch would never run — the blank
// panel this primitive exists to prevent. Nothing is gated in such an app, so it counts as authenticated.
// A symbol can never collide with a real token, and it changes at most once, so the handler runs at most once.
const AUTH_DISABLED = Symbol("auth-disabled")

export type AuthSignal = string | symbol | undefined

export type OnAuthenticatedInput = {
    /** auth is installed disabled, and the caller named no store of its own */
    disabled(): boolean
    authData(): IAuthData | undefined
    handler(): unknown
}
export type OnAuthenticated = {
    /** what a layer watches */
    signal(): AuthSignal
    /** the signal changed, or a view registered and runs it straight away */
    onSignal(signal: AuthSignal): void
}

/** runs `handler` whenever an authenticated token arrives, for a layer that watches `signal` and calls `onSignal` */
export function createOnAuthenticated({ disabled, authData, handler }: OnAuthenticatedInput): OnAuthenticated {
    return {
        // The disabled state is a value rather than a short-circuit before the watch, so that it goes through the
        // layer's own handling (a throwing handler is the framework's to report, instead of aborting the caller)
        // and so a plugin that installs disabled after the registration still releases the handler.
        signal: () => (disabled() ? AUTH_DISABLED : authData()?.token),
        onSignal(signal) {
            // `isAuthenticated` as well as the token: a custom IAuthService may build AuthData around a
            // token it has not accepted, and the shipped one pairs them anyway, so this costs nothing.
            if (signal === AUTH_DISABLED || (signal && authData()?.isAuthenticated)) handler()
        },
    }
}
