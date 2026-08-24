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

Failed requests are logged with every credential masked — the bearer header, and the body, `params` and
query string of a credential-bearing endpoint (the `auth` family plus a configured `loginUrl`). The masking
is internal; since an axios error carries the request that produced it, log the error's own fields in your
own `catch` blocks rather than `{ ex }`, and never log the token.
