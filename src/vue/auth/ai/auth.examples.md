# Regira Auth — Examples

Verify signatures in [auth.signatures.md](auth.signatures.md).

## Install the plugin (startup)

Run after the IoC/http and router are on `app`, passing the shared `axios` instance:

```ts
import { plugin as authPlugin, LocalStorageTokenManager } from "@regira/modules/vue/auth"

app.use(authPlugin, {
    enabled: true,
    axios, // the instance from initAxios
    tokenManager: new LocalStorageTokenManager(),
    clientApp: appConfig.clientApp,
    loginUrl: appConfig.loginUrl,
    onAuthenticationChange: (auth) => {
        if (auth.isAuthenticated) {
            // welcome / preload lookups / set culture / mark app ready
        } else {
            // logged out
        }
    },
})
```

## Protect routes

The guard reads route `meta`. Mark public pages `allowAnonymous`, gate others with `permissions` (or a
`policy` function), and provide a `forbidden` route to redirect to:

```ts
const routes = [
    { path: "/login", name: "login", component: LoginView, meta: { allowAnonymous: true } },
    { path: "/forbidden", name: "forbidden", component: ForbiddenView, meta: { allowAnonymous: true } },
    { path: "/users", name: "UserOverview", component: UserOverview, meta: { permissions: ["users.read"] } },
    { path: "/admin", name: "Admin", component: Admin, meta: { policy: (store) => store.hasRole("Admin") } },
]
```

`permissions` checks the `permissions` claim; a role-gated route (Identity roles in the JWT) uses a
`policy` with `store.hasRole(...)`, which probes all three role-claim spellings.

## Use the store in a component

```ts
import { useAuthStore } from "@regira/modules/vue/auth"

const auth = useAuthStore()
// auth.isAuthenticated, auth.displayName, auth.hasRole("Manager"), auth.hasPermission("users.write"), auth.authData.email
async function signOut() {
    auth.logout()
}
```

## Re-run work when a token arrives

```ts
import { onAuthenticated } from "@regira/modules/vue/auth"

onAuthenticated(() => reload())
// already fetching on mount (useRouteOverview / useDetails)? pass { immediate: false }
```

Covers all of it: signing in, a refresh (tenant switch included), a token restored from storage on a hard
reload, and mounting while already signed in. Re-validating the _same_ token does not re-run it.

⚠️ **Use this for anything that fetches on mount.** Views mount before a stored token is validated, and
restoring one dispatches `validateToken`, not `login` — so a hand-rolled `$onAction(… "login" …)` silently
never fires after F5. The 401 interceptor does not cover it either: with a valid stored token nothing 401s,
and a fetch guarded on `isAuthenticated` sent no request to catch.

`$onAction` still works and existing code needs no change. Listening for actions by name means keeping the
list complete (`["login", "refresh", "validateToken"]`); `onAuthenticated` has nothing to keep in sync.

## Login UI

Drop-in modal:

```vue
<script setup lang="ts">
import { LoginModal } from "@regira/modules/vue/auth"
</script>
<template>
    <LoginModal title="Sign in" @success="onSuccess" @forgot-password="showForgot" />
</template>
```

Or build a custom form with the composable:

```vue
<script setup lang="ts">
import { useLoginForm, type LoginFormEmits } from "@regira/modules/vue/auth"
const emit = defineEmits<LoginFormEmits>()
const props = defineProps<{ username?: string }>()
const { username, password, failed, signingIn, isLockedOut, handleSubmit, handleForgotPassword } = useLoginForm(props, emit)
</script>
<template>
    <form @submit.prevent="handleSubmit">
        <input v-model="username" /> <input v-model="password" type="password" />
        <button :disabled="signingIn || isLockedOut">Sign in</button>
        <a @click="handleForgotPassword">Forgot password?</a>
        <p v-if="failed">Sign-in failed</p>
    </form>
</template>
```

## Password operations

```ts
import { useAuth } from "@regira/modules/vue/auth"

const { service } = useAuth()
await service.changePassword({ currentPassword, newPassword })
// the API mails `siteUrl` with "?token=…" appended, so it must be the absolute url of YOUR RESET PAGE —
// passing location.origin lands the recovery link on the dashboard, where nothing reads the token
await service.forgotPassword({ username, siteUrl: `${location.origin}/reset-password`, siteName })
await service.resetPassword({ token, password }) // token from the reset email link (?token=…)
```

## See also

- [auth.instructions.md](auth.instructions.md) · [auth.signatures.md](auth.signatures.md)
