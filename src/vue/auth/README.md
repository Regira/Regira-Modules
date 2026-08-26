# Regira Auth (front-end)

`@regira/modules/vue/auth` — JWT bearer authentication layered onto the shared
[axios instance](../http/README.md): login/token management, a Pinia auth store, a
permission-aware route guard, and login UI.

## What it provides

| Export                                                                                                                                                                                                   | Purpose                                                                                                                                                             |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `plugin` (auth)                                                                                                                                                                                          | Wires everything at startup: bearer interceptor, token validation, route guard, 401 auto-logout.                                                                    |
| `LocalStorageTokenManager` / `CookieTokenManager` / `MemoryTokenManager`                                                                                                                                 | Pluggable token storage (`ITokenManager`).                                                                                                                          |
| `useAuthStore`                                                                                                                                                                                           | Reactive auth state: `isAuthenticated`, `displayName`, `hasPermission`, `hasRole`, `login`, `logout`, …                                                             |
| `AuthService`                                                                                                                                                                                            | The HTTP calls: login, refresh, validate, change/forgot/reset password.                                                                                             |
| `routeGuard`                                                                                                                                                                                             | `beforeEach` guard reading `meta.allowAnonymous` / `permissions` / `policy`.                                                                                        |
| `useAuth`                                                                                                                                                                                                | The wiring object (`IAuth`): `enabled`, `clientApp`, `tokenManager`, `service` — no `authData`.                                                                     |
| `useGlobalAuth` / `$auth`                                                                                                                                                                                | The global auth object (`IGlobalAuth`): everything on `IAuth` plus `authData`, `isAuthenticated`, `isRequired`, read from the reactive store. Set up by the plugin. |
| `getAccountName`                                                                                                                                                                                         | Display label for the signed-in user: `displayName` ?? `name` ?? `email` from `authData`.                                                                           |
| `LoginForm` / `LoginModal` / `LogoutForm` / `ForgotPasswordModal` / `ChangePasswordForm` / `ResetPasswordForm`, `useLoginForm`, `useForgotPasswordForm`, `useChangePasswordForm`, `useResetPasswordForm` | The full account UI: sign in/out, forgot/reset/change password.                                                                                                     |

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
so provide a login view and a `forbidden` route.

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
