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

A token manager (`ITokenManager`: `get/set token`) decides where the JWT lives. Three implementations; the
two persistent ones are keyed by `prefix + "auth:token"`:

| Manager                             | Storage                                                             |
| ----------------------------------- | ------------------------------------------------------------------- |
| `LocalStorageTokenManager(prefix?)` | `localStorage` (persists across tabs/restarts)                      |
| `CookieTokenManager(prefix?)`       | a cookie (`path=/`)                                                 |
| `MemoryTokenManager(token)`         | in-memory (cleared on reload; pass `undefined` to start signed out) |

⚠️ **No manager hides the token from script.** `LocalStorageTokenManager` survives reloads and new tabs, so a
script injected into the origin (XSS) can read it at any time until it expires. `CookieTokenManager` is no safer: a
cookie written by script cannot be `HttpOnly`. `MemoryTokenManager` leaves nothing at rest, at the price of a sign-in
on every reload and new tab, but an injected script can still read it from the running app. This module keeps a
single token and never calls the API's `auth/refresh-token`, so a short access-token lifetime means signing in again
when it runs out (`auth/refresh` renews only a token that is still valid). Keep script injection out: no `v-html` on
unescaped user content, and a Content-Security-Policy.

**A server cookie session** (`AddCookieAuthentication` on the API, no token in the browser) needs none of this
module's token handling. Send its requests with credentials (`initAxios({ api, includeCredentials: true })`, or
`withCredentials: true` per request) and ask the API who is signed in (a `GET` on its session endpoint). Keep the auth
plugin off it: an app that signs in only this way installs no auth plugin; one that also uses tokens marks that area's
routes `allowAnonymous` and sends its requests on an axios instance the plugin was not given.

The bearer interceptor reads `tokenManager.token`; you never set headers manually.

## Auth store (`useAuthStore`)

The Pinia store is the reactive source of truth for components:

- **state/getters:** `isAuthenticated`, `isRequired`, `authData`, `displayName`, `hasPermission(p)`,
  `hasRole(r)`, `hasClaim(type, value?)`, `getClaimValue(type)`, `clientApp`, `enabled`.
- **actions:** `login({ username, password })`, `validateToken()`, `refresh(o)`, `logout()`, `setClientApp(c)`.
  The audience has one owner — the service's plain `options` — and `store.clientApp` / `$auth.clientApp` read
  through to it, so a switch is visible everywhere at once with no copy to go stale.

In a template, `$auth.isAuthenticated` is TS2339: `$auth` is a union, so narrow it with `$auth.enabled &&`
([`$auth` global](#auth-global)), or read `const authStore = useAuthStore()` in script.

`authData` (`IAuthData`) is decoded from the JWT's claims: `token` (the raw JWT), `userId` ← `sub`, `name` ← `name`,
`email` ← `email`, `displayName` ← `displayName` (or `display_name`), `culture` ← `culture`, `role` ← the first of
`role`, `roles` or the `ClaimTypes.Role` URI (for display), `expires` ← `exp` − `nbf` (the lifetime in seconds), plus
`get(claim)`, `hasClaim`, `hasPermission`, `hasRole`. The API emits `culture` and `displayName` only when its claims
principal factory adds them.

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
keeps the default `immediate` and adds **no** `onMounted` fetch beside it: one there sends a second request, with
the stored token (the bearer header is attached before validation); it 401s only when that token has expired.
Those two composables discard a superseded fetch's feedback; a view driving its own `useFeedback` does not, so
there a failed fetch's banner stays on screen over the data the hook then loads.

⚠️ **A default read from the signed-in user is unknown in `setup` on a reload.** `authData` stays empty until the
stored token is validated, so a search-object default taken from a claim (an `ownerId`) is `undefined` there and the
first search runs without it. Set it inside the `onAuthenticated` handler, before the search it runs. With
`{ immediate: false }` the handler skips a token that is already there, so also set it in `setup` for in-app
navigation. The handler also runs when another account signs in on a page that stays mounted, so it replaces a
default it set before, never a value the user picked:

```ts
// the claim value the default came from: a sign-in as another account replaces it, a value the user picked stays
let appliedOwnerId: string | undefined
const applyDefaults = () => {
    const ownerId = authStore.getClaimValue("owner_id") as string | undefined
    if (searchObject.value.ownerId == null || searchObject.value.ownerId === appliedOwnerId) {
        searchObject.value.ownerId = ownerId
    }
    appliedOwnerId = ownerId
}
applyDefaults()
onAuthenticated(
    () => {
        applyDefaults()
        searchHandler(false)
    },
    { immediate: false }
)
```

⚠️ **Register it below everything its handler uses.** With a token already present, the immediate run happens
at the `onAuthenticated(…)` call itself — so in `<script setup>` a `const load = async () => …` declared further
down is not initialized yet, and the call throws `ReferenceError`.

⚠️ **It fires only while a token is held** (or once, with the plugin disabled), so a page a signed-out visitor
uses loads in `onMounted` (_What a first load shows_, under Route guard).

With the plugin `enabled: false` no token ever arrives, so it honours `immediate` once and stops — nothing
is gated in such an app. Pass
`{ store }` only for a store the plugin knows nothing about; it names the store to watch and is honoured
even with the plugin disabled. Registration order needs no `{ store }`: the plugin's store is resolved on
every read, so a pinia store built before `app.use(authPlugin, …)` still follows a custom `authStore`.

⚠️ **App-lifetime state registers once, from `main.ts`.** Registering inside `setup` scopes the watcher to
that component — right for a view, wrong for shared state such as _the signed-in user's domain row_: the
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
| `forgotPassword(input)`     | POST | `auth/password/recover`        | `{ username, siteUrl }`                                 |
| `resetPassword(input)`      | POST | `auth/password/reset`          | `{ token, password }`                                   |
| `logout()`                  | —    | —                              | client-side only: clears the stored token               |

`authenticate({ token, isAuthenticated })` stores the token and returns an `AuthData`; a falsy
`isAuthenticated` clears the token.

**A sign-in endpoint of your own** (a PIN, a one-time code) that answers `{ token, isAuthenticated }`: post to it
with the shared axios and hand the answer to the store as `login()` does.

```ts
const authStore = useAuthStore()
const { data } = await useAxios().post("auth/pin", input, { params: { clientApp: authStore.clientApp } })
authStore.authData = useAuth().service.authenticate(data)
```

`clientApp` is appended only to the login URL, so pass it yourself. A path under `auth/` is already masked in the
error log and exempt from the 401 auto-logout; register any other with `registerCredentialUrls`.

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
  Role-gated routes use a policy — `meta.policy: (store: IAuthStore) => store.hasRole("Administrator")`, with
  `import type { IAuthStore } from "@regira/modules/vue/auth"` — since `meta.permissions` checks the `permissions`
  claim, not roles. The guard hands the policy the plugin's auth store.
- Not authenticated: sets `authRequired` and **allows navigation** (the app shows a login popup rather
  than redirecting). Define an `allowAnonymous` route for public pages and a `forbidden` route.

The plugin restores a stored token with an async `validateToken` and registers this guard only after it, while the
router's first navigation has already started. So once the guard is registered, the plugin runs the same check for
the route already shown and replaces it when the check redirects: a reload or a deep link to a gated page is
checked too, as soon as the token is known. It runs the check again on every new token — another account signing
in on the page, a refresh, a tenant switch — so a page the new identity may not see leaves the screen for the
`forbidden` route (`/403?url=…`).
`routeGuard` returns that check, for an app that registers the guard itself.

`routeAllows(route, store)` is the guard's verdict for a signed-in user, as a boolean: `allowAnonymous`, then every
matched `meta.policy` and `meta.permissions`. Pass it a route from `router.resolve(...)` to hide what the guard would
refuse: the scaffolded navigation drops an entry whose overview route it refuses, so a role-gated slice leaves the
navbar and the dashboard for everyone else.

> ⚠️ **Gate a route by role with `meta.policy`, never `beforeEnter: () => hasRole(…)`.** `beforeEnter` runs on the
> first navigation with no token yet, and nothing runs it again: an administrator reloading the page, or opening a
> link to it, lands on `forbidden`. The API still decides who may write either way; the route gate only spares the
> user a page they cannot use. Without the auth plugin nothing reads `meta.policy` — a `--no-auth` app with roles of
> its own: `entities.patterns` → _Permission-gated UI_.

### What a first load shows

<!-- how_to: key=public-pages-in-auth-app aliases=public-page,public-pages,anonymous,allowanonymous,landing,catalogue,first-load,cold-load,deep-link,reload,401,403 -->

In-app navigation to a role-gated route is redirected before the target mounts. A first load does not wait for
the guard:

- **A protected route opened while signed out** mounts its view, and each view's mount fetch answers `401`: one
  `axios error` line per view in the console, while the login modal opens. Judge the console after sign-in.
- **A reload or deep link to a role-gated route** mounts the view and fetches with the stored token; its
  `onAuthenticated` runs once that token is validated, and both answer `403` before the guard redirects to
  `forbidden`. A view that must not ask checks `store.hasRole(…)` or `routeAllows(route, store)` before
  fetching.
- **A page on an `allowAnonymous` route** that a signed-out visitor uses (a landing page) gets no
  `onAuthenticated` run until someone signs in. It loads its public data in `onMounted` and re-loads after
  sign-in with `onAuthenticated(() => load(), { immediate: false })`. Every other view keeps the
  `onAuthenticated` rule.

A "Sign in" button on such a page opens the login on demand (_Show the login form on time_, under Account UI);
self-registration: _Sign-up_.

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
| Sign up (self-registration)             | none: _Sign-up_ below                               | —                       |
| Confirm email (from the mail link)      | none: _Confirm page_ below                          | —                       |

- **The entities app shell wires all five out of the box** (`scaffold.mjs --shell`, auth variant): login +
  recovery modals in `App.vue`, an app-owned `components/users/ForgotPasswordForm.vue` (the library ships
  `ForgotPasswordModal` and `useForgotPasswordForm`, but **no** `ForgotPasswordForm` — the form is yours),
  `views/ResetPasswordView.vue` on an `allowAnonymous` `/reset-password` route, and `AccountView` for
  change-password. Building the shell yourself? Reproduce all of it.
- **`siteUrl` is the reset PAGE, not the site root.** The API mails `siteUrl` with `?token=…` as its query
  string, so `location.origin` alone puts the recovery link on the dashboard, where nothing reads the token — send
  `${location.origin}/reset-password` (or `router.resolve({ name: "resetPassword" })`).
- **The API mails the link only to an origin it lists.** Add the SPA's origin, and the dev server's
  (`http://localhost:5173`; a port Vite moves to is another origin), to the API's allowed origins: a `siteUrl`
  elsewhere answers `400`, and an API that lists none answers `500` — `Regira.Security` → security.instructions →
  _Mailed links: allowed origins_. The API also names the mail itself, so `siteName` does not reach it.
- **Show the login form on time.** Gate the main content and pop the login modal immediately for
  anonymous users — never render a dashboard an anonymous user can't do anything with:

    ```vue
    <LoadingContainer :isLoading="$appStatus != AppStatus.Ready && (!$auth.enabled || $auth.isAuthenticated)"><Main /></LoadingContainer>
    <LoginModal v-if="showLogin" :show-close="!authStore.isRequired" ... />
    ```

    ```ts
    const showLogin = computed(() => authStore.isRequired && !authStore.isAuthenticated)
    ```

    An app whose public pages are `allowAnonymous` (a storefront) opens it on demand too. `isRequired` is set only
    by a protected route, so one app-wide flag widens the gate: a "Sign in" button, a checkout step or a wishlist
    heart requests the sign-in, and the shell's `App.vue` reads the request beside `isRequired`:

    ```ts
    // src/composables/useLoginPrompt.ts — one request for the whole app, so any component can ask for a sign-in
    import { ref } from "vue"

    const loginRequested = ref(false)
    export function useLoginPrompt() {
        return {
            loginRequested,
            requestLogin: () => (loginRequested.value = true),
            clearLoginRequest: () => (loginRequested.value = false),
        }
    }
    ```

    ```ts
    // App.vue — the shell's script with its gate and its watch widened; forgotUsername, showForgot and
    // handleForgotPassword stay as they are
    import { useLoginPrompt } from "@/composables/useLoginPrompt"

    const authStore = useAuthStore()
    const { loginRequested, clearLoginRequest } = useLoginPrompt()
    const showLogin = computed(() => (authStore.isRequired || loginRequested.value) && !authStore.isAuthenticated)
    watch(showLogin, (gateOpen) => {
        if (gateOpen) return
        showForgot.value = false
        clearLoginRequest() // signed in (by the form or any other path) or closed: the request is answered
    })
    ```

    ```vue
    <!-- App.vue — the shell's LoginModal with @close bound: on demand its X stays, and closing drops the request -->
    <LoginModal v-if="showLogin && !showForgot" :title="$t('signIn')" :show-close="!authStore.isRequired" @close="clearLoginRequest">
        <LoginForm @forgot-password="handleForgotPassword" />
    </LoginModal>

    <!-- any component, with authStore = useAuthStore() and { requestLogin } = useLoginPrompt(): the header's "Sign in" -->
    <button v-if="!authStore.isAuthenticated" type="button" class="btn btn-outline-primary" @click="requestLogin">{{ $t("signIn") }}</button>
    ```

    `showClose` hides the header's X while sign-in is required, where closing would leave a page that needs it.
    Esc emits the same `close`, since the modal takes focus when it opens; while sign-in is required both leave the
    modal open, since clearing the request does not lift `isRequired`. On demand the X stays, and its `@close` (X or
    Esc) clears the request. The public page behind the modal renders for a signed-out visitor as it is: the shell's
    `LoadingContainer` waits only while a signed-in session starts. The shell's header hides its menu and search
    while nobody is signed in: drop their two `v-if`s in `layout/TheHeader.vue`, or a visitor finds no way to the
    public pages.

- **Gate `LoginModal` with `v-if="showLogin"`** (the canonical `App.vue` does): unmounting removes the
  mask and dialog atomically. Keeping it mounted and toggling visibility can strand the leave-transition,
  leaving an invisible full-screen mask that swallows every click.
- `useLoginForm(props, emit)` → `{ username, password, failed, signingIn, isLockedOut, isNotAllowed, handleSubmit, handleForgotPassword }`.
  `isLockedOut` and `isNotAllowed` mirror the `401` body of the last attempt; `isNotAllowed` is a right password on
  an account that is not confirmed yet, and the stock `LoginForm` then asks the user to follow the mailed link.
- `useForgotPasswordForm(props, emit, { siteUrl })` → `{ username, isLoading, isFormValid, isSuccess, handleSubmit }`.
- `useChangePasswordForm(emit)` / `useResetPasswordForm({ token }, emit)` → password fields + match/validity
  state + `handleSubmit` (see [auth.signatures.md](auth.signatures.md)).
- All form components are plain-Bootstrap reference skins — restyle, wrap, or eject them
  (`scaffold.mjs --ui LoginForm|LoginModal|ForgotPasswordModal|ChangePasswordForm|ResetPasswordForm`); the modals render the app-wide
  modal via `injectModal()`, so a `modalPlugin { Modal }` swap reskins them too.

### Sign-up

An app that lets visitors create their own account posts it to the API's `users` endpoint, then signs in:

```ts
import { ref } from "vue"
import { useAuthStore } from "@regira/modules/vue/auth"
import { useAxios } from "@regira/modules/vue/http"
import { useFeedback, toFeedbackError } from "@regira/modules/vue/ui"

const username = ref("")
const password = ref("")
const authStore = useAuthStore()
const feedback = useFeedback()
async function handleSubmit() {
    feedback.pending("Creating your account")
    try {
        // main.ts: add "users" to the auth plugin's credentialUrls; this body holds the password
        await useAxios().post("users", { username: username.value, password: password.value })
        await authStore.login({ username: username.value, password: password.value })
        feedback.reset()
    } catch (ex) {
        feedback.fail("Sign-up failed", toFeedbackError(ex))
    }
}
```

Offer it from the login modal. Anything slotted into `LoginModal`'s default slot replaces the stock `LoginForm`, so
put a `RouterLink` to the sign-up page **beside** `<LoginForm>` inside the slot (the scaffolded `App.vue` already
slots its own `LoginForm`):

```vue
<LoginModal v-if="showLogin && !showForgot" :title="$t('signIn')" :show-close="!authStore.isRequired">
    <LoginForm @forgot-password="handleForgotPassword" />
    <RouterLink :to="{ name: 'signUp' }">Create an account</RouterLink>
</LoginModal>
```

The route is anonymous — `{ path: "/sign-up", name: "signUp", component: SignUpView, meta: { allowAnonymous: true } }`
— and an `allowAnonymous` route makes `isRequired` false, so the modal closes when the link lands there.

- **Add `"users"` to `credentialUrls`** on the auth plugin. The shared axios instance logs every failed request
  with its body, and this body holds the password.
- **An API whose sign-up takes profile fields** has an action of its own (`users/sign-up`). Post there with the
  fields, and add that path to `credentialUrls` too.
- **The API opens `POST users` on an override.** The base action requires a signed-in caller, so a sign-up
  answers `401` until the app's `UserControllerBase` subclass overrides `Create` with `[AllowAnonymous]`:
  `Regira.Security` → security.instructions → _Authorization: guarded by default_.
- ⚠️ **A sign-up that links the new account to an existing record** (a customer, an employee, a speaker) links it
  on the API, only by an e-mail address the user has confirmed or by a stored external login. Never by an
  unconfirmed e-mail or an OIDC e-mail claim without `email_verified`, or anyone can take over that record:
  `Regira.Security` → security.instructions → _Sign-up with profile fields_.
- **A taken name answers `400`** with ASP.NET Identity's `DuplicateUserName` as the key, like a password the
  API's rules refuse. `toFeedbackError` reads both, and `<Feedback>` lists them.
- To have the API mail a confirmation link, post `confirmEmailUrl` too: the absolute URL of the app's confirm
  page (_Confirm page_ below), on an origin the API lists (`Regira.Security` → security.instructions → _Mailed
  links: allowed origins_). Sign-in does not wait for the confirmation unless the API sets
  `SignIn.RequireConfirmedEmail` or `RequireConfirmedAccount`, which `Regira.Security.Authentication.Web` honours
  from 6.6.0. Then drop the `login` call after the post and tell the visitor to follow the mailed link: signing in
  answers `401` with `isNotAllowed` until they do, which `useLoginForm` returns as `isNotAllowed` and the stock
  `LoginForm` shows as "not confirmed yet".

### Confirm page

The confirmation mail links to the page `confirmEmailUrl` named, with `?token=…` as its query string. The page is
anonymous, so it loads in `onMounted` (_What a first load shows_), and posts the token back, alone
(`Regira.Security.Authentication.Web` 6.6.0 or later):

```vue
<!-- views/ConfirmEmailView.vue, route { path: "/confirm-email", name: "confirmEmail", meta: { allowAnonymous: true } } -->
<script setup lang="ts">
import { onMounted } from "vue"
import { useRoute } from "vue-router"
import { useAxios } from "@regira/modules/vue/http"
import { Feedback, useFeedback, toFeedbackError } from "@regira/modules/vue/ui"

const route = useRoute()
const feedback = useFeedback({ autoHideDelay: 0 })
onMounted(async () => {
    const token = route.query.token
    if (typeof token !== "string") return feedback.fail("This link is incomplete")
    feedback.pending("Confirming your address")
    try {
        // the API reads the user from the token
        await useAxios().post("users/confirm-email", { token })
        feedback.success("Your address is confirmed: you can sign in")
    } catch (ex) {
        feedback.fail("This link is invalid or has expired", toFeedbackError(ex))
    }
})
</script>

<template>
    <Feedback :feedback="feedback" />
</template>
```

- **Add `"users/confirm-email"` to `credentialUrls`** beside `"users"`: the body carries the token, and `"users"`
  matches that path alone.
- The sign-up form posts `confirmEmailUrl: new URL(router.resolve({ name: "confirmEmail" }).href, location.origin).href`,
  as the shell's `ForgotPasswordForm` builds its `siteUrl`.

## `$auth` global

When enabled the plugin sets `app.config.globalProperties.$auth` (`IGlobalAuth`: `enabled`, `clientApp`,
`tokenManager`, `service`, `authData`, `isAuthenticated`, `isRequired`). Outside components,
`useGlobalAuth()` returns that same `$auth` object; `useAuth()` returns the narrower `IAuth`
(`enabled`, `clientApp`, `tokenManager`, `service` — no `authData`/`isAuthenticated`/`isRequired`).
Prefer the store in components. `$auth.isRequired` is the store's route-driven `isRequired`: auth is enabled and the
current route is not `allowAnonymous`.

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
- **Password-reset link:** the recover email links to `siteUrl` with its query string set to `?token=…`, the Base64
  token percent-encoded (`/reset-password?token=…`). Read it from vue-router's `route.query.token`, which decodes the
  query as `URLSearchParams` does, so either returns the token intact; treat anything but a single string as no
  token, since a repeated `?token=a&token=b` parses as an array.

## See also

- [auth.signatures.md](auth.signatures.md) · [auth.examples.md](auth.examples.md)
- [regira_modules.vue.http](../../http/ai/http.instructions.md) · [regira_modules.vue.ioc](../../ioc/ai/ioc.instructions.md)
- [Entities](../../entities/ai/entities.instructions.md) — its requests ride this auth
