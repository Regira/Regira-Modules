# Regira Auth — AI Agent Instructions

Front-end authentication (`@regira/modules/vue/auth`): JWT bearer auth layered onto the shared
[axios instance](../../http/ai/http.instructions.md), with pluggable token storage, a Pinia auth store,
a permission-aware route guard, and login UI. Install it **after** the IoC/http and router are set up.

> **Never guess** a signature or endpoint — verify in [auth.signatures.md](auth.signatures.md). Worked
> wiring: [auth.examples.md](auth.examples.md).

## Import

```ts
import {
    plugin as authPlugin,
    useAuthStore,
    onAuthenticated,
    useAuth,
    LocalStorageTokenManager,
    CookieTokenManager,
    MemoryTokenManager,
    AuthService,
    LoginModal,
    LogoutForm,
    ForgotPasswordModal,
    ChangePasswordForm,
    ResetPasswordForm,
    useLoginForm,
    useForgotPasswordForm,
    useChangePasswordForm,
    useResetPasswordForm,
} from "@regira/modules/vue/auth"
```

## Setup — the auth plugin

Install once at startup, passing the **same axios instance** from `initAxios` and a token manager:

```ts
app.use(authPlugin, {
    axios, // the shared instance (initAxios)
    tokenManager: new LocalStorageTokenManager(),
    clientApp: appConfig.clientApp, // the JWT audience — login() appends it as ?clientApp=
    loginUrl: appConfig.loginUrl, // optional; only for a login endpoint other than "auth"
    enableRouteGuard: true, // default true
    enabled: true, // default true; pass false to disable auth entirely
    onAuthenticationChange: (authData) => {},
})
```

`install` is **async** — it `await`s a token validation on load. It: builds the auth service, resolves
the auth store, exposes `$auth` globally, adds the **bearer request interceptor**, validates any saved
token, installs the route guard, and adds the **401 auto-logout response interceptor**.

## Token storage

A token manager (`ITokenManager`: `get/set token`) decides where the JWT lives. Three implementations,
all keyed by `prefix + "auth:token"`:

| Manager                             | Storage                                        |
| ----------------------------------- | ---------------------------------------------- |
| `LocalStorageTokenManager(prefix?)` | `localStorage` (persists across tabs/restarts) |
| `CookieTokenManager(prefix?)`       | a cookie (`path=/`)                            |
| `MemoryTokenManager(token?)`        | in-memory (cleared on reload)                  |

The bearer interceptor reads `tokenManager.token`; you never set headers manually.

## Auth store (`useAuthStore`)

The Pinia store is the reactive source of truth for components:

- **state/getters:** `isAuthenticated`, `isRequired`, `authData`, `displayName`, `hasPermission(p)`,
  `hasRole(r)`, `hasClaim(type, value?)`, `getClaimValue(type)`, `clientApp`, `enabled`.
- **actions:** `login({ username, password })`, `validateToken()`, `refresh(o)`, `logout()`, `setClientApp(c)`.
  The audience has one owner — the service's plain `options` — and `store.clientApp` / `$auth.clientApp` read
  through to it, so a switch is visible everywhere at once with no copy to go stale.

`authData` (`IAuthData`) is decoded from the JWT: `token` (the raw JWT), `userId`, `name`, `email`,
`displayName`, `culture`, `role` (the first role found, for display), `expires`, plus `get(claim)`,
`hasClaim`, `hasPermission`, `hasRole`.

### Reacting to a token — `onAuthenticated`

```ts
onAuthenticated(() => load())
```

Runs the handler whenever an authenticated token arrives: sign-in, a refresh (a tenant switch included), a
token restored from storage on reload, and immediately when one is already present. **Use it for anything
that fetches on mount** — views mount _before_ a stored token is validated, so a fetch guarded on
`isAuthenticated` is otherwise skipped and never retried, leaving a blank panel with no error and no failed
request. Restoring a token dispatches `validateToken`, not `login`, which is why a hand-rolled
`$onAction(… "login" …)` misses it.

⚠️ Pass `{ immediate: false }` when the view already fetches on mount (`useRouteOverview`, `useDetails`),
or the immediate run races their `onMounted` fetch during `setup` — that is the only reason the scaffolded
views pass it. `useSearchView`/`useListView` fetch nothing themselves, so a hand-written view built on either
keeps the default `immediate` and adds **no** `onMounted` fetch beside it: one there runs before the stored
token is validated and 401s, wasting a request. Those two composables discard a superseded fetch's feedback;
a view driving its own `useFeedback` does not, so there the 401's banner stays on screen over the data the
hook then loads.

With the plugin `enabled: false` no token ever arrives, so it honours `immediate` once and stops — nothing
is gated in such an app. Pass
`{ store }` only for a store the plugin knows nothing about; it names the store to watch and is honoured
even with the plugin disabled. Registration order needs no `{ store }`: the plugin's store is resolved on
every read, so a pinia store built before `app.use(authPlugin, …)` still follows a custom `authStore`.

⚠️ **App-lifetime state registers once, from `main.ts`.** Registering inside `setup` scopes the watcher to
that component — right for a view, wrong for shared state such as *the signed-in user's domain row*: the
watcher belongs to whichever component called the composable first and dies with it. Split the composable —
`initCurrentPerson()` called once after the auth plugin, `useCurrentPerson()` a pure reader.

⚠️ **An app that installs no auth plugin at all cannot be detected.** `enabled: false` is a signal the
plugin sets; never installing it leaves the same blank state as "not installed _yet_", so the hook waits
for a token that never arrives. In a no-auth app leave the hooks out (`scaffold.mjs --no-auth`) or install
the plugin disabled.

⚠️ **Role checks are `hasRole(r)`, not `hasPermission(r)`.** The store decodes the **raw** token, and role
claims arrive under one of three spellings depending on the issuer — `role` (self-issued JWT), `roles`
(Entra), or the `ClaimTypes.Role` URI (ASP.NET Identity's default) — `hasRole` probes all three, mirroring
the backend's `FindRoles()`. `hasPermission(p)` reads a **`permissions`** claim, which the standard
Identity/JWT recipe never mints — using it for role gating silently answers `false`. The full backend chain
(emitting role claims from Identity) is `Regira.Security` → security.instructions → _Roles end-to-end_
(`how_to` key `roles-end-to-end`).

## Endpoints (`AuthService`)

URLs are **relative** to the axios `baseURL` (no leading slash):

| Method                      | HTTP | URL                            | Body                                                    |
| --------------------------- | ---- | ------------------------------ | ------------------------------------------------------- |
| `login(username, password)` | POST | `auth` (or `options.loginUrl`) | `{ username, password }` → `{ token, isAuthenticated }` |
| `refresh(queryParams?)`     | POST | `auth/refresh/?{query}`        | —                                                       |
| `validateToken()`           | POST | `auth/validate`                | — (only when a token exists; 401 clears it)             |
| `changePassword(input)`     | POST | `auth/password`                | `{ newPassword, currentPassword }`                      |
| `forgotPassword(input)`     | POST | `auth/password/recover`        | `{ username, siteUrl, siteName? }`                      |
| `resetPassword(input)`      | POST | `auth/password/reset`          | `{ token, password }`                                   |
| `logout()`                  | —    | —                              | client-side only: clears the stored token               |

`authenticate({ token, isAuthenticated })` stores the token and returns an `AuthData`; a falsy
`isAuthenticated` clears the token.

## Interceptors

- **`addBearerHeader(axios, tokenManager)`** — request interceptor; sets `Authorization: Bearer <token>`
  when a token is present.
- **`autoLogoutOnFailedRequest(axios, store)`** — response interceptor; on a **401** for a non-`auth/`
  URL it sets `authRequired` and re-validates the token (triggering the login popup). 403 is not handled.
  It `console.error`s every rejected response for diagnostics, masked (below).

Both are installed automatically by the plugin and are **not exported** from `@regira/modules/vue/auth`
(internal); they are listed here only to document the request/response behavior.

## Logging (no credential reaches the console)

Console output is captured verbatim by breadcrumb and session-replay telemetry, and an axios error carries
the **request** that produced it — headers, body and URL. So nothing in this module logs a raw error or a
raw request config. Every `catch` logs `maskAxiosError(ex)` instead (internal, `error-logging.ts`): the
message, code, status, response data and stack, plus a masked copy of the request. Masked means

- the **`Authorization` header** redacted (any spelling — header names are case-insensitive), and axios'
  own `auth` (basic-auth) field with it;
- for credential-bearing endpoints, the request **body**, **`params`** and **query string** dropped
  wholesale — the endpoint and status are the diagnostics that matter, and a key list would silently miss
  whatever field an API adds next. Credential-bearing = the `auth` family wherever a `baseURL` puts it
  (`auth`, `auth/password`, `auth/password/reset`, `auth/refresh`, …), **a configured `loginUrl`** that
  lives elsewhere, which `createAuth` registers for exactly this reason, and **whatever the application
  registered** (below).

Nothing is mutated, so the rejected error still holds the real header for a retry. The signed-in user is
logged by **named field** — `{ isAuthenticated, userId, name, role }`, never `{ ...store.authData }`:
`AuthData._decodedToken` is private to TypeScript only, so a spread ships the whole decoded claim bag
(every custom claim the issuer put in the token) into telemetry. The **token itself is never logged** — not
by `validateToken`, whose `catch` runs on every app load that restores a saved token, and not through a
`tokenManager` that holds it. `AuthData.token` is **non-enumerable** as a second line of defence, so the JWT
is absent from `{ ...authData }` and `JSON.stringify(authData)` — it cannot ride along into a log or a
telemetry payload even where an app forwards the object whole (`onAuthenticationChange`). Reading
`authData.token` still works; this hides it from serialization, not from callers.

### The application's own credential endpoints

`autoLogoutOnFailedRequest` is installed on the app's **shared** axios instance, so it logs every failed
request the SPA makes — but only this module's endpoints are credential-bearing by construction. An app
that posts a password anywhere else registers those paths, or their bodies are logged in full:

```ts
// either at setup…
app.use(authPlugin, { axios, tokenManager, credentialUrls: ["users/*/password", "invitations/accept"] })
// …or afterwards (additive; `createAuth` resets the list to what its options carried, so not before)
registerCredentialUrls("users/*/password", /(^|\/)tokens\//)
```

A `string` matches a whole path or its trailing segments (a `baseURL` prefix is irrelevant), with `*`
standing for exactly one segment (`users/*/password` → `users/123/password`, not `users/1/devices/password`);
a `RegExp` is tested against the lower-cased path without its query string or outer slashes. The
`Authorization` header needs no registration — it is masked on every request. Anything unregistered keeps
its body: a failed request's body is a real diagnostic, so it is not thrown away everywhere.

`registerCredentialUrls` is the one part of the masking that IS exported from
`@regira/modules/vue/auth`; `maskAxiosError` / `maskCredentials` stay internal.

The masking helper itself is internal, so keep the same rule in your own
code: in a `catch` around anything auth-adjacent log the error's **own fields** (`ex.message`,
`ex.response?.status`, `ex.response?.data`) — never `{ ex }`, which drags the whole request along, and
never the token.

## Route guard

`routeGuard({ router, store })` runs `router.beforeEach`:

- `meta.allowAnonymous` → always allowed.
- Authenticated: each matched route's `meta.policy(store)` and `meta.permissions: string[]`
  (via `store.hasPermission`) must pass, else redirect to route **`forbidden`** (`query.url` = target).
  Role-gated routes use a policy — `meta.policy: (store) => store.hasRole("Admin")` — since
  `meta.permissions` checks the `permissions` claim, not roles.
- Not authenticated: sets `authRequired` and **allows navigation** (the app shows a login popup rather
  than redirecting). Define an `allowAnonymous` route for public pages and a `forbidden` route.

## Account UI — wire the FULL surface, shown on time

**When an app has authentication, build the complete account surface, not just a login form.** The
components and composables exist for all of it — use them instead of hand-rolling:

| Concern                                 | Component                                           | Composable              |
| --------------------------------------- | --------------------------------------------------- | ----------------------- |
| Sign in                                 | `LoginForm` (inside `LoginModal`)                   | `useLoginForm`          |
| Forgot password (request recovery mail) | slot into `ForgotPasswordModal`                     | `useForgotPasswordForm` |
| Reset password (from the mail link)     | `ResetPasswordForm`                                 | `useResetPasswordForm`  |
| Change password (signed-in user)        | `ChangePasswordForm`                                | `useChangePasswordForm` |
| Sign out                                | `LogoutForm` (or `store.logout()` in a header menu) | —                       |

- **The entities app shell wires all five out of the box** (`scaffold.mjs --shell`, auth variant): login +
  recovery modals in `App.vue`, an app-owned `components/users/ForgotPasswordForm.vue` (the library ships
  `ForgotPasswordModal` and `useForgotPasswordForm`, but **no** `ForgotPasswordForm` — the form is yours),
  `views/ResetPasswordView.vue` on an `allowAnonymous` `/reset-password` route, and `AccountView` for
  change-password. Building the shell yourself? Reproduce all of it.
- **`siteUrl` is the reset PAGE, not the site root.** The API mails `siteUrl` with `?token=…` appended, so
  `location.origin` alone puts the recovery link on the dashboard, where nothing reads the token — send
  `${location.origin}/reset-password` (or `router.resolve({ name: "resetPassword" })`).
- **Show the login form on time.** Gate the main content and pop the login modal immediately for
  anonymous users — never render a dashboard an anonymous user can't do anything with:

    ```vue
    <LoadingContainer :isLoading="$appStatus != AppStatus.Ready && (!$auth.enabled || $auth.isAuthenticated)"><Main /></LoadingContainer>
    <LoginModal v-if="showLogin" ... />
    ```

    ```ts
    const showLogin = computed(() => authStore.isRequired && !authStore.isAuthenticated)
    ```

- **Gate `LoginModal` with `v-if="showLogin"`** (the canonical `App.vue` does): unmounting removes the
  mask and dialog atomically. Keeping it mounted and toggling visibility can strand the leave-transition,
  leaving an invisible full-screen mask that swallows every click.
- `useLoginForm(props, emit)` → `{ username, password, failed, signingIn, isLockedOut, handleSubmit, handleForgotPassword }`.
- `useForgotPasswordForm(props, emit, { siteUrl, siteName? })` → `{ username, isLoading, isFormValid, isSuccess, handleSubmit }`.
- `useChangePasswordForm(emit)` / `useResetPasswordForm({ token }, emit)` → password fields + match/validity
  state + `handleSubmit` (see [auth.signatures.md](auth.signatures.md)).
- All form components are plain-Bootstrap reference skins — restyle, wrap, or eject them
  (`scaffold.mjs --ui LoginForm|LoginModal|ForgotPasswordModal|ChangePasswordForm|ResetPasswordForm`); the modals render the app-wide
  modal via `injectModal()`, so a `modalPlugin { Modal }` swap reskins them too.

## `$auth` global

When enabled the plugin sets `app.config.globalProperties.$auth` (`IGlobalAuth`: `enabled`, `clientApp`,
`tokenManager`, `service`, `authData`, `isAuthenticated`, `isRequired`). Outside components,
`useGlobalAuth()` returns that same `$auth` object; `useAuth()` returns the narrower `IAuth`
(`enabled`, `clientApp`, `tokenManager`, `service` — no `authData`/`isAuthenticated`/`isRequired`).
Prefer the store in components.

⚠️ **`$auth` is a discriminated union**, `IGlobalAuth | { enabled: false }` — every member beyond `enabled`
and `authData` lives on the enabled arm only. So `v-if="$auth.isAuthenticated"` is a **TS2339 build failure**;
narrow first, exactly as the scaffolded shell does: `$auth.enabled && $auth.isAuthenticated` (or
`!$auth.enabled || $auth.isAuthenticated` for "ready unless auth is pending"). In script, prefer the already-
resolved `authStore.isAuthenticated` — it needs no guard.

## Gotchas

- **Install order:** after the router is on `app` (the plugin reads `$router`) and after `initAxios` —
  pass that same axios instance.
- **`logout()` is client-side** — it only clears the token; there is no server call.
- **No login redirect:** unauthenticated navigation is allowed (popup model), so you must provide the
  login UI and a `forbidden` route; only `permissions`/`policy` failures redirect.
- **Endpoints are relative** (`"auth"`, `"auth/validate"`) — they resolve against the axios `baseURL`.
- **`clientApp` travels on login automatically** — `login()` appends `?clientApp=<your value>` to the login URL
  from the plugin's `clientApp` option, because the API mints the JWT audience from it (Regira's
  `AccountControllerBase` takes it `[FromQuery]`). So **set `clientApp` and leave `loginUrl` alone**; `loginUrl`
  is only for a login endpoint that isn't `auth`. Spelling `clientApp=` out in `loginUrl` yourself still wins and
  is never doubled. Never emit a `{clientApp}`/`<clientApp>` placeholder into the URL — nothing substitutes it at
  runtime, and the API would mint a token with that literal audience, 401-ing every later call. `refresh` needs
  no `clientApp`: the server re-reads `aud` from the current token.
- **Password-reset link:** the recover email lands at `{siteUrl}/?token=<base64>` (root path). Read the token
  from **vue-router `route.query.token`** (preserves `+`), never `URLSearchParams` — it turns `+` into a space
  and corrupts the base64.

## See also

- [auth.signatures.md](auth.signatures.md) · [auth.examples.md](auth.examples.md)
- [regira_modules.vue.http](../../http/ai/http.instructions.md) · [regira_modules.vue.ioc](../../ioc/ai/ioc.instructions.md)
- [Entities](../../entities/ai/entities.instructions.md) — its requests ride this auth
