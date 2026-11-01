# Regira Auth (front-end)

`@regira/modules/vue/auth` — JWT bearer authentication layered onto the shared
[axios instance](../http/README.md): login/token management, a Pinia auth store, a
permission-aware route guard, and login UI.

An app without Vue imports `AuthService`, the token managers and `registerCredentialUrls` from [`@regira/modules/core`](../../core/README.md); the store, plugin, route guard and login UI are Vue-only.

## What it provides

| Export                                                                                                                                                                                                   | Purpose                                                                                                                                                                                                                                                                                                                                                                                                             |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `plugin` (auth)                                                                                                                                                                                          | Wires everything at startup: bearer interceptor, token validation, route guard, 401 auto-logout.                                                                                                                                                                                                                                                                                                                    |
| `LocalStorageTokenManager` / `CookieTokenManager` / `MemoryTokenManager`                                                                                                                                 | Pluggable token storage (`ITokenManager`). None hides the token from a script injected into the page, and the module keeps one token without calling the API's `auth/refresh-token`.                                                                                                                                                                                                                                |
| `useAuthStore`                                                                                                                                                                                           | Reactive auth state: `isAuthenticated`, `displayName`, `hasPermission`, `hasRole`, `login`, `logout`, …                                                                                                                                                                                                                                                                                                             |
| `onAuthenticated`                                                                                                                                                                                        | Runs a handler whenever an authenticated token arrives — sign-in, refresh, or one restored from storage on reload. Use it for anything that fetches on mount. With a token already present it runs at the call, so register it below everything the handler uses. A page a signed-out visitor uses loads in `onMounted` and re-loads with `{ immediate: false }` (`auth.instructions` → _What a first load shows_). |
| `AuthService`                                                                                                                                                                                            | The HTTP calls: login, refresh, validate, change/forgot/reset password.                                                                                                                                                                                                                                                                                                                                             |
| `routeGuard`                                                                                                                                                                                             | `beforeEach` guard reading `meta.allowAnonymous` / `permissions` / `policy`; returns the check it registers.                                                                                                                                                                                                                                                                                                        |
| `routeAllows`                                                                                                                                                                                            | The guard's verdict for a signed-in user, as a boolean: `allowAnonymous`, then every matched `meta.policy` and `meta.permissions`. Use it to hide what a route would refuse.                                                                                                                                                                                                                                        |
| `useAuth`                                                                                                                                                                                                | The wiring object (`IAuth`): `enabled`, `clientApp`, `tokenManager`, `service` — no `authData`.                                                                                                                                                                                                                                                                                                                     |
| `useGlobalAuth` / `$auth`                                                                                                                                                                                | The global auth object, typed `IGlobalAuth \| { enabled: false }`. Once narrowed with `enabled`, it has everything on `IAuth` plus `authData`, `isAuthenticated`, `isRequired`, read from the reactive store; `$auth.isAuthenticated` without that check is a TS2339 error. Set up by the plugin.                                                                                                                   |
| `getAccountName`                                                                                                                                                                                         | Display label for the signed-in user: `displayName` ?? `name` ?? `email` from `authData`.                                                                                                                                                                                                                                                                                                                           |
| `LoginForm` / `LoginModal` / `LogoutForm` / `ForgotPasswordModal` / `ChangePasswordForm` / `ResetPasswordForm`, `useLoginForm`, `useForgotPasswordForm`, `useChangePasswordForm`, `useResetPasswordForm` | The full account UI: sign in/out, forgot/reset/change password.                                                                                                                                                                                                                                                                                                                                                     |

## How it fits

```
initAxios → shared axios ──┐
                           ├─ authPlugin: addBearerHeader(axios, tokenManager)   (every request authed)
tokenManager ──────────────┘            + validateToken on load
                                        + routeGuard(router, store)
                                        + autoLogoutOnFailedRequest (401 → re-validate)
useAuthStore  ←─ components read isAuthenticated / displayName / hasPermission / hasRole
```

Install **after** the router and `initAxios`, passing that same axios instance. Auth endpoints are
relative to the axios `baseURL` (`auth`, `auth/validate`, `auth/refresh`, `auth/password*`). `logout()`
is client-side (clears the token); unauthenticated navigation is allowed (the app shows a login popup),
so provide the login modal (`:show-close="!authStore.isRequired"` hides its X while sign-in is required) and a
`forbidden` route. On a public (`allowAnonymous`) page `isRequired` stays false, so a "Sign in" button opens the modal
through a request flag of the app's own, which the modal's gate reads beside `isRequired`. Gate a route by role with `meta.policy`
(`(store: IAuthStore) => store.hasRole("Administrator")`), not `beforeEnter`: a stored token is restored only after the first
navigation, so a `beforeEnter` check sends an administrator who reloads the page to `forbidden`. The guard
itself is registered after that restore, so the plugin then checks the route already shown as well, and a
reload or deep link to a gated page is caught once the token is known. Every new token runs that check again, so
a page stays on screen only while the signed-in identity may see it — after another account signs in on it, or a
refresh or tenant switch changes its roles. Without this plugin nothing reads `meta.policy`: an app with roles of its
own resolves them before mounting and gates the route with `beforeEnter`.

The account components show English text. Each form takes a `labels` prop, one key per text, and each modal a
`title`, so a translated app passes its own wherever it uses them; a key left out stays English. `LogoutForm`'s
`signOut` label puts the user's display name where it writes `{name}` (`"Sign out {name}"` by default).

A sign-in endpoint of the app's own (a PIN, a one-time code) posts with the shared axios and hands the
`{ token, isAuthenticated }` answer to the store: `authStore.authData = useAuth().service.authenticate(data)`. A server
cookie session (no token in the browser) needs none of this module: send its requests with credentials and keep the
auth plugin off them.

Failed requests are logged with every credential this module handles masked — the bearer header on every
request, and the body, `params` and query string of a credential-bearing endpoint (the `auth` family plus a
configured `loginUrl`). The signed-in user is logged by named field (`isAuthenticated`, `userId`, `name`,
`role`), never as a spread of `authData`, which would ship the whole decoded claim bag.

The response interceptor runs on the app's **shared** axios instance, so it logs every failed request the
SPA makes — but only this module's endpoints carry a credential by construction. **Register the app's own
credential-bearing endpoints** so their bodies are dropped too, either through the plugin's `credentialUrls`
option or with `registerCredentialUrls(...)` after the plugin installed:

```ts
app.use(authPlugin, { axios, tokenManager, credentialUrls: ["users/*/password", "invitations/accept"] })
```

A `string` matches a whole path or its trailing segments (so a `baseURL` prefix is irrelevant), with `*`
standing for exactly one segment; a `RegExp` is tested against the lower-cased path without its query
string. Anything unregistered keeps its body — a failed request's body is a real diagnostic, so it is not
thrown away everywhere.

Since an axios error carries the request that produced it, log the error's own fields in your own `catch`
blocks rather than `{ ex }`, and never log the token.
