# Regira Auth — Examples

Verify signatures in [auth.signatures.md](auth.signatures.md).

## Install the plugin (startup)

Run after the IoC/http and router are on `app`, passing the shared `axios` instance:

```ts
import { plugin as authPlugin, LocalStorageTokenManager } from "regira/vue/auth"

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
    { path: "/admin", name: "Admin", component: Admin, meta: { policy: (store) => store.hasPermission("admin") } },
]
```

## Use the store in a component

```ts
import { useAuthStore } from "regira/vue/auth"

const auth = useAuthStore()
// auth.isAuthenticated, auth.displayName, auth.hasPermission("users.write"), auth.authData.email
async function signOut() {
    auth.logout()
}
```

## Re-run work on login / refresh

```ts
const auth = useAuthStore()
auth.$onAction(({ name, after }) => ["login", "refresh"].includes(name) && after(() => auth.isAuthenticated && reload()))
```

## Login UI

Drop-in modal:

```vue
<script setup lang="ts">
import { LoginModal } from "regira/vue/auth"
</script>
<template>
    <LoginModal title="Sign in" @success="onSuccess" @forgot-password="showForgot" />
</template>
```

Or build a custom form with the composable:

```vue
<script setup lang="ts">
import { useLoginForm, type LoginFormEmits } from "regira/vue/auth"
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
import { useAuth } from "regira/vue/auth"

const { service } = useAuth()
await service.changePassword({ currentPassword, newPassword })
// the API mails `siteUrl` with "?token=…" appended, so it must be the absolute url of YOUR RESET PAGE —
// passing location.origin lands the recovery link on the dashboard, where nothing reads the token
await service.forgotPassword({ username, siteUrl: `${location.origin}/reset-password`, siteName })
await service.resetPassword({ token, password }) // token from the reset email link (?token=…)
```

## See also

- [auth.instructions.md](auth.instructions.md) · [auth.signatures.md](auth.signatures.md)
