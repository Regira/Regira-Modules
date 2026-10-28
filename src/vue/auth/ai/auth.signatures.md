# Regira Auth — API Signatures Reference

Verbatim TypeScript signatures for `@regira/modules/vue/auth`. Do not guess — look up here first.

```ts
import {
    plugin,
    useAuth,
    useGlobalAuth,
    getAccountName,
    useAuthStore,
    createStore,
    onAuthenticated,
    routeGuard,
    routeAllows,
    AuthService,
    CookieTokenManager,
    MemoryTokenManager,
    LocalStorageTokenManager,
    useLoginForm,
    useForgotPasswordForm,
    useChangePasswordForm,
    useResetPasswordForm,
    LoginForm,
    LoginModal,
    LogoutForm,
    ForgotPasswordModal,
    ChangePasswordForm,
    ResetPasswordForm,
    registerCredentialUrls,
    type IAuthOptions,
    type IGlobalAuth,
    type ITokenManager,
    type IAuthStore,
    type IDefineAuthStore,
    type OnAuthenticatedOptions,
} from "@regira/modules/vue/auth"
```

## Auth data

```ts
export interface IAuthData {
    isAuthenticated: boolean
    expires: number // the token's lifetime in seconds (exp − nbf, or exp − iat without nbf; 0 without either), not a timestamp
    readonly token?: string // the raw JWT — changes on sign-in and every refresh, equal when the same token is re-validated.
    // NON-ENUMERABLE: absent from { ...authData } and JSON.stringify(authData), so the credential cannot ride
    // along into a log or a telemetry payload. Reading authData.token still works.
    userId?: string
    name?: string
    email?: string
    displayName?: string // ← the "displayName" (or "display_name") claim
    culture?: string // ← the "culture" claim (BCP-47, e.g. "nl-BE")
    role?: string // first role found across the three claim spellings — display only; check with hasRole()
    get(claimType: string): string | Array<string> | undefined
    hasClaim(claimType: string, claimValue?: string): boolean
    hasPermission(value: string): boolean // reads the "permissions" claim — NOT a role check
    hasRole(role: string): boolean // probes "role" / "roles" / the ClaimTypes.Role URI (mirrors backend FindRoles())
}
// NOTE: the `AuthData` *class* is internal — it is NOT re-exported from "@regira/modules/vue/auth"
// (no deep-import subpath either). Only the `IAuthData` type is reachable; code against the type.
export class AuthData implements IAuthData {
    constructor(token?: string, options?: { isAuthenticated: boolean })
    /* + IAuthData members */
}
```

## Reacting to authentication

```ts
export type OnAuthenticatedOptions = {
    immediate?: boolean // default true; pass FALSE only when the view already fetches on mount — useRouteOverview and useDetails do, useSearchView / useListView do NOT
    //                     an immediate run happens AT the onAuthenticated(…) call: register it below every const its handler uses
    store?: Pick<IAuthStore, "authData"> // defaults to the plugin's configured store, then the default pinia store
}
// Runs `handler` whenever an authenticated token arrives: sign-in, refresh (tenant switch included), and a
// token restored from storage on reload. Re-validating the SAME token does not re-run it.
// Auth disabled (plugin `enabled: false`): no token ever arrives, so it honours `immediate` once and stops
// — unless an explicit `{ store }` names one to watch, which wins over the app-wide flag.
// Order-independent: the plugin's store is resolved per read, so registering BEFORE app.use(authPlugin, …)
// still follows a custom `authStore`. Installing NO plugin at all is indistinguishable from "not yet", so
// the handler then waits forever — a no-auth app leaves the hook out or installs the plugin disabled.
// Prefer this over authStore.$onAction(...) for anything that fetches on mount.
// Registering inside setup() scopes the watcher to that component, so app-lifetime state (the signed-in
// user's domain row) registers ONCE from main.ts after the auth plugin — not inside a composable, where it
// would belong to whichever component called first and die with it.
export function onAuthenticated(handler: () => unknown, options?: OnAuthenticatedOptions): WatchStopHandle
```

## Auth service

```ts
export type IAuthenticateInput = { token: string; isAuthenticated: boolean }
export type IChangePasswordInput = { newPassword: string; currentPassword: string }
export type IForgotPasswordInput = { username: string; siteUrl: string; siteName?: string } // siteName: @deprecated, the API ignores it
export type IResetPasswordInput = { token: string; password: string }

export interface IAuthService {
    readonly options: IAuthOptions // owns clientApp as plain state; change it via authStore.setClientApp() — that is what notifies Vue
    authenticate({ token, isAuthenticated }: IAuthenticateInput): IAuthData
    login(username: string, password: string): Promise<IAuthData>
    refresh(o?: Record<string, unknown>): Promise<IAuthData> // o is sent as the query string: POST auth/refresh/?{o}
    validateToken(): Promise<IAuthData>
    logout(): void
    changePassword(input: IChangePasswordInput): Promise<void>
    forgotPassword(input: IForgotPasswordInput): Promise<void>
    resetPassword(input: IResetPasswordInput): Promise<void>
}
export const emptyAuthData: () => IAuthData // internal — NOT re-exported from the barrel
export class AuthService implements IAuthService {
    constructor(axios: AxiosInstance, tokenManager: ITokenManager, options?: IAuthOptions)
    /* + IAuthService members */
}
```

## Auth root & options

```ts
// clientApp = the JWT audience; login() appends it to the login URL as ?clientApp= (refresh reuses the token's aud).
// loginUrl only overrides the endpoint path (default "auth"); an explicit clientApp= in it wins and is not doubled.
// `service.options` is the SINGLE OWNER of clientApp — plain state, no framework. IAuth/$auth expose it as
// read-through getters; the store wraps it in a reactive view (a customRef, Vue stays in the Vue layer), so
// `setClientApp(v)` and `store.clientApp = v` both write the owner and no copy exists to go stale.
export type IAuthOptions = {
    clientApp?: string
    loginUrl?: string
    // the APPLICATION's credential-bearing endpoints, on top of this module's own — see Logging below
    credentialUrls?: Array<string | RegExp>
}
export interface IGlobalAuth {
    enabled: boolean
    readonly clientApp?: string
    tokenManager: ITokenManager
    service: IAuthService
    authData: IAuthData
    isAuthenticated: boolean
    isRequired: boolean // the store's route-driven isRequired: auth enabled and the current route not allowAnonymous
}
export function createAuth(options: IAuthOptions & { enabled: boolean; tokenManager: ITokenManager; axios: AxiosInstance }): IAuth // createAuth is internal — NOT re-exported from the barrel; the IAuth type is exported
export const useAuth: () => IAuth

export type GlobalAuth = IGlobalAuth | { enabled: false; authData?: IAuthData }
// the `$auth` object, script-side — wraps the store the auth plugin was CONFIGURED with (which may be a
// custom `authStore`, not the module's default pinia store). Available after the plugin installed; its
// authData getters read the reactive store, so computeds track. Reading it inside a computed or watcher
// tracks the INSTALL too: a reader that ran before app.use(authPlugin, …) re-evaluates when it lands,
// instead of being stuck with the undefined it first saw.
export const useGlobalAuth: () => GlobalAuth
// display label for the signed-in user (displayName ?? name ?? email) — not every JWT carries a
// displayName claim; may be undefined, so give templates a `?? $t("account")`-style fallback
export const getAccountName: (auth?: GlobalAuth) => string | undefined
```

## Token managers

```ts
export interface ITokenManager {
    get token(): string | undefined
    set token(value: string | undefined)
}
export class CookieTokenManager implements ITokenManager {
    constructor(prefix?: string)
    get fullKey(): string
}
export class MemoryTokenManager implements ITokenManager {
    constructor(_token: string | undefined)
}
export class LocalStorageTokenManager implements ITokenManager {
    constructor(prefix?: string)
    get fullKey(): string
}
// key = prefix + "auth:token"
```

## Interceptors

```ts
// NOTE: both interceptors are internal — they are installed automatically by the auth `plugin`
// and are NOT re-exported from "@regira/modules/vue/auth". Shown for reference only.
export function addBearerHeader(axios: AxiosInstance, tokenManager: ITokenManager): AxiosInstance
export function autoLogoutOnFailedRequest(
    axios: AxiosInstance,
    store: Store & { isAuthenticated: boolean; authData: IAuthData; validateToken(): Promise<boolean> }
): void
```

## Logging

```ts
// The ONLY exported part of the masking — maskAxiosError / maskCredentials stay internal.
// Registers the APPLICATION's own credential-bearing endpoints, so their request body, params and query
// string are dropped from the failed-request log the way the `auth` family's already are. Additive.
// A string matches a whole path or its trailing segments (a baseURL prefix is irrelevant), with `*` = one
// segment: "users/*/password" covers users/123/password, not users/1/devices/password. A RegExp is tested
// against the lower-cased path, without query string or outer slashes.
// Call it AFTER the plugin installed, or pass IAuthOptions.credentialUrls — createAuth resets the list to
// what its options carry. The Authorization header needs no registration: it is masked on every request.
export function registerCredentialUrls(...urls: Array<string | RegExp>): void
```

## Store

```ts
export interface IAuthStore extends Store {
    enabled: boolean
    clientApp?: string // reactive view of service.options.clientApp — reads and writes hit the owner directly
    authData: IAuthData
    authRequired: boolean
    isAuthenticated: boolean
    isRequired: boolean
    hasPermission: (permission: string) => boolean
    hasRole: (role: string) => boolean
    displayName: string | undefined
    hasClaim: (type: string, value?: string) => boolean
    getClaimValue: (type: string) => string | Array<string> | undefined
    setClientApp(clientApp?: string): void
    login({ username, password }: LoginInput): Promise<boolean>
    validateToken(): Promise<boolean>
    refresh(o: Record<string, unknown>): Promise<boolean> // o is sent as the query string: POST auth/refresh/?{o}
    logout(): void
}
export function createStore(): IDefineAuthStore // createStore.storeName
export const useAuthStore // Pinia StoreDefinition (IAuthStore)
```

## Plugin

```ts
type Input<TStore extends IAuthStore, TTokenManager extends ITokenManager> = IAuthOptions & {
    tokenManager: TTokenManager
    authStore?: TStore
    axios: AxiosInstance
    enableRouteGuard?: boolean // default true
    enabled?: boolean // default true
    onAuthenticationChange?(auth: IAuthData): void // receives the live IAuthData; its `token` is non-enumerable, so forwarding this object to telemetry does not leak the JWT
}
export const plugin: {
    install<TStore extends IAuthStore = IAuthStore, TTokenManager extends ITokenManager = ITokenManager>(
        app: App,
        options: Input<TStore, TTokenManager>
    ): Promise<void>
}
```

## Route guard

```ts
export const routeGuard: (args: {
    router: Router
    store: Store & { isAuthenticated: boolean; hasPermission(value: string): boolean }
}) => (to: RouteLocationNormalized) => true | RouteLocationRaw
// reads route meta: allowAnonymous, policy(store) => boolean, permissions: string[]
// meta is untyped: write a policy (store: IAuthStore) => store.hasRole("…") — it receives the plugin's auth store
// registers the check as a beforeEach guard and returns it; the plugin also runs it for the route already shown,
// after the first navigation and on every new token
export function routeAllows(to: Pick<RouteLocationNormalized, "matched" | "meta">, store: { hasPermission(value: string): boolean }): boolean
// the guard's verdict for a signed-in user: allowAnonymous, then every matched meta.policy and meta.permissions
```

## Account UI

```ts
export type LoginInput = { username: string; password: string }

export function useLoginForm(
    props: LoginFormProps, // { username?: string; labels? } — the composable reads username only
    emit: LoginFormEmits
): {
    username: Ref<string>
    password: Ref<string>
    failed: Ref<boolean>
    signingIn: Ref<boolean>
    isLockedOut: Ref<boolean> // the refusal's isLockedOut; cleared when an attempt starts
    isNotAllowed: Ref<boolean> // the refusal's isNotAllowed: right password, account not confirmed; cleared when an attempt starts
    handleSubmit: () => Promise<void>
    handleForgotPassword: () => void
}
// LoginFormEmits: "forgotPassword" | "signingIn" | "success" | "fail", each (username?: string)

export function useForgotPasswordForm(
    props: ForgotPasswordFormProps, // { username?: string }
    emit: ForgotPasswordFormEmits,
    options: { siteUrl: string; siteName?: string } // siteName: @deprecated, the API ignores it
): {
    username: Ref<string>
    isLoading: Ref<boolean>
    isFormValid: ComputedRef<boolean>
    isSuccess: Ref<boolean | undefined>
    handleSubmit: () => Promise<void>
}
// ForgotPasswordFormEmits: "success" (username?) | "fail" (ex?) | "login" (username?)

export function useChangePasswordForm(emit: ChangePasswordFormEmits): {
    currentPassword: Ref<string>
    newPassword: Ref<string>
    confirmPassword: Ref<string>
    isLoading: Ref<boolean>
    isSuccess: Ref<boolean | undefined>
    passwordsMatch: ComputedRef<boolean>
    isFormValid: ComputedRef<boolean>
    handleSubmit: () => Promise<void>
}
// ChangePasswordFormEmits: "success" | "fail"

export function useResetPasswordForm(
    props: ResetPasswordFormProps, // { token: string; username?: string; labels? } — reset token from the recovery link; optional account name for the hidden username field (password managers)
    emit: ResetPasswordFormEmits
): {
    password: Ref<string>
    confirmPassword: Ref<string>
    isLoading: Ref<boolean>
    isSuccess: Ref<boolean | undefined>
    passwordsMatch: ComputedRef<boolean>
    isFormValid: ComputedRef<boolean>
    handleSubmit: () => Promise<void>
}
// ResetPasswordFormEmits: "success" | "fail" | "login"

// Components (default exports): LoginForm, LoginModal, LogoutForm, ForgotPasswordModal,
//                                ChangePasswordForm, ResetPasswordForm
// Every text these components show is English by default; `labels` (and a modal's `title`) override it, one key at a time
// LoginForm props: LoginFormProps { username?: string; labels?: LoginFormLabels } ; emits: LoginFormEmits
//   LoginFormLabels: { username?; password?; signIn?; signingIn?; forgotPassword?; failed?; lockedOut?; notConfirmed? } (all string)
// LoginModal props: LoginModalProps { username?; title? ("Sign in"); labels?: LoginFormLabels; isVisible?; showClose? } ; slots: LoginModalSlots = default{ username } (replace the form)
//   labels go to the default LoginForm; a slotted form takes its own
//   showClose (default true): the header's X; pass false while sign-in is required — it fills the modal's header-close-button slot
//   emits: LoginModalEmits = LoginFormEmits (from its default form only; a slotted form emits its own) + close (header X or Esc; a required gate binds none)
// ForgotPasswordModal props: ForgotPasswordModalProps { username?; title? ("Forgot password"); isVisible? } ; slots: ForgotPasswordModalSlots = default{ username }
//   emits: ForgotPasswordModalEmits = close (header X or Esc)
// Both slot and emits types are exported from the barrel — import them when you type a wrapper that forwards the slot
// or the events
// ChangePasswordForm props: ChangePasswordFormProps { username?: string; labels?: ChangePasswordFormLabels }, emits: ChangePasswordFormEmits
//   ChangePasswordFormLabels: { currentPassword?; newPassword?; confirmPassword?; mismatch?; submit?; succeeded?; failed? }
// ResetPasswordForm props: ResetPasswordFormProps { token; username?; labels?: ResetPasswordFormLabels }, emits: ResetPasswordFormEmits
//   ResetPasswordFormLabels: { newPassword?; confirmPassword?; mismatch?; submit?; succeeded?; signIn?; failed? }
// LogoutForm props: LogoutFormProps { labels?: { signOut? } } — "Sign out {name}" by default; {name} is the user's display name
// Both password forms render a visually-hidden `autocomplete="username"` input (NOT display:none — that
// removes it from most password managers' form parse) so managers link the new password to the account —
// pass `username` from the host (`getAccountName()`); the components deliberately read no store (the app
// may run a custom one via the plugin's `authStore` option)
// LoginModal/ForgotPasswordModal render the app-wide modal via injectModal() — a modalPlugin { Modal } swap reskins them too
```

## See also

- [auth.instructions.md](auth.instructions.md) · [auth.examples.md](auth.examples.md)
