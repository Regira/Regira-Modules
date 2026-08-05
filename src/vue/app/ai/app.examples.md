# Regira App — Examples

Verify signatures in [app.signatures.md](app.signatures.md).

## Install the plugin (startup)

Register `appPlugin` once, after Pinia, passing the `culture`. Pinia must be installed first because the
plugin reads `useAppStore` (from `main.ts`):

```ts
import { createApp } from "vue"
import { createPinia } from "pinia"
import { AppStatus, plugin as appPlugin, whenAppReady } from "@regira/modules/vue/app"

const app = createApp(App)
app.use(createPinia())
app.use(appPlugin, { culture: processedConfig.culture }) // culture is optional
```

## Drive the lifecycle during bootstrap

Nothing reaches `Ready` on its own — advance the status yourself. Mark `Mounting` before `app.mount`,
then move to `Loading` → `Ready` once data is primed (here inside the auth callback):

```ts
app.config.globalProperties.$setAppStatus(AppStatus.Mounting)
app.mount("#app")

// later, once authenticated and lookups are preloaded:
app.config.globalProperties.$setAppStatus(AppStatus.Loading)
// … preload entity caches …
app.config.globalProperties.$setCulture(auth.culture!)
app.config.globalProperties.$setAppStatus(AppStatus.Ready)
```

## Wait for ready before mounting work

`whenAppReady()` returns a promise that resolves once status is `Ready` — await it in `main.ts` after
`mount`, or in a component's `onMounted` before loading cached data:

```ts
app.mount("#app")
await whenAppReady()
```

```ts
import { onMounted } from "vue"
import { whenAppReady } from "@regira/modules/vue/app"

onMounted(async () => {
    await whenAppReady()
    items.value = fromCache()!.map((x) => x.value)
})
```

## Re-run work on ready (and on login/refresh)

`onAppReady(func)` runs `func` now if already ready, otherwise once the app becomes ready (from a CRM
sidebar component):

```ts
import { onAppReady } from "@regira/modules/vue/app"

onAppReady(async () => {
    await load()
})
```

## Read status/culture in a component

Use `useAppStore()` for `isReady` / `culture`, or the `$appStatus` global in templates:

```vue
<script setup lang="ts">
import { watchEffect } from "vue"
import { AppStatus, useAppStore } from "@regira/modules/vue/app"

const appStore = useAppStore()
watchEffect(() => {
    if (appStore.isReady) {
        // appStore.culture is also available here
    }
})
</script>
<template>
    <LoadingContainer :isLoading="$appStatus != AppStatus.Ready">…</LoadingContainer>
</template>
```

## See also

- [app.instructions.md](app.instructions.md) · [app.signatures.md](app.signatures.md)
