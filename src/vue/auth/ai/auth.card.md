# regira_modules.vue.auth — index card (front-end)

> The must-know bullets before wiring SPA authentication. Full guide: `auth.instructions`; exact TS
> surfaces: `auth.signatures` (never guess); worked wiring: `auth.examples`. Back-end counterpart:
> `Regira.Security` (`get_package_card(id: "Regira.Security")`) — its _Roles end-to-end_ recipe
> (`how_to` key `roles-end-to-end`) is the full Identity → JWT → SPA chain.

- **Install order is load-bearing:** `app.use(authPlugin, {...})` **after** the router is on `app` and
  after `initAxios` — pass that **same axios instance** plus a token manager
  (`LocalStorageTokenManager` is the usual choice). `install` is async and validates any saved token.
- **`clientApp` = the JWT audience.** Set it in the plugin options; `login()` appends `?clientApp=` itself.
  It must equal the API's `Authentication:Jwt:Audience` or every authenticated call 401s. Leave `loginUrl`
  alone unless the login endpoint isn't `auth`; never write a `{clientApp}` placeholder into a URL.
- **Store surface** (`useAuthStore`): `isAuthenticated`, `authData`, `displayName`, `hasRole(r)`,
  `hasPermission(p)`, `hasClaim(type, value?)`, `getClaimValue(type)`; actions `login`, `validateToken`,
  `refresh`, `logout` (client-side only), `setClientApp`.
- **⚠️ Anything that fetches on mount uses `onAuthenticated(() => load())`.** Views mount _before_ a stored
  token is validated, so a fetch guarded on `isAuthenticated` never runs and never errors — a blank panel,
  no failed request. Restoring a token is the `validateToken` action, not `login`, so a hand-rolled
  `$onAction(… "login" …)` misses it. Pass `{ immediate: false }` where the view already fetches on mount
  (`useRouteOverview` / `useDetails` — the scaffolded views do).
- **⚠️ `$auth` is a union** (`IGlobalAuth | { enabled: false }`), so `$auth.isAuthenticated` alone is a
  TS2339 build failure — narrow with `$auth.enabled && …`, as the scaffolded shell does, or read the
  already-resolved `authStore.isAuthenticated`.
- **⚠️ Role checks are `hasRole`, not `hasPermission`.** The SPA decodes the **raw** token; roles arrive as
  `role` (self-issued JWT), `roles` (Entra) or the `ClaimTypes.Role` URI (Identity default) — `hasRole`
  probes all three. `hasPermission` reads a **`permissions`** claim the standard Identity recipe never
  mints; role-gating with it silently answers `false` (invisible buttons, forbidden redirects).
- **Route guard** (installed by the plugin): `meta.allowAnonymous` bypasses; `meta.permissions: string[]`
  checks `hasPermission`; role-gated routes use `meta.policy: (store) => store.hasRole("Admin")`.
  Unauthenticated navigation is **allowed** (popup model — gate content and show `LoginModal`); only
  `permissions`/`policy` failures redirect, to a route named `forbidden`.
- **Build the full account surface, not just login:** `LoginModal`, `ForgotPasswordModal` (+ your own form),
  `ResetPasswordForm` on an `allowAnonymous` `/reset-password` route, `ChangePasswordForm`, `LogoutForm` —
  the entities app shell (`scaffold.mjs --shell`) wires all five.
- **Never log a raw auth error.** An axios error carries the request that produced it — the bearer header,
  the posted password, a token in the query. This module masks all of that internally and never logs the
  token; in your own `catch` blocks log `ex.message` / `ex.response?.status`, never `{ ex }`. The response
  interceptor logs every failed request the app makes, so **register the app's own credential endpoints** —
  `credentialUrls: ["users/*/password", …]` on the plugin, or `registerCredentialUrls(...)` — or their
  bodies are logged in full. See _Logging_ in `auth.instructions`.
- **Top traps:** `siteUrl` for recovery is the reset _page_, not the origin; read the mailed token via
  vue-router `route.query.token` (URLSearchParams corrupts base64 `+`); gate `LoginModal` with `v-if`, not
  visibility; a 401 on non-`auth/` URLs auto-triggers re-validation + the login popup (403 does not).
