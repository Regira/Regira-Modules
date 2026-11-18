# Regira Online — Examples

Verify signatures in [online.signatures.md](online.signatures.md).

## Install the plugin (startup)

Add it to `app` once in `main.ts`. The plugin registers the shared `isOnline` ref, seeded from
`navigator.onLine` and kept live by the window `online`/`offline` events, as `$isOnline` and `inject("isOnline")`:

```ts
import { plugin as isOnlinePlugin } from "@regira/modules/vue/online"

app.use(isOnlinePlugin)
```

## Offline banner component

The demo apps mount a tiny banner that reads the plugin's provided ref via `inject("isOnline")`:

```vue
<template>
    <div v-if="!isOnline" class="bg-danger text-white text-center p-2">OFFLINE</div>
</template>

<script setup lang="ts">
import { inject, type Ref } from "vue"

const isOnline = inject<Ref<boolean>>("isOnline")
</script>
```

Mount it near the top of `App.vue` so it shows on every page:

```vue
<template>
    <div class="page">
        <Offline />
        <!-- header, router-view, … -->
    </div>
</template>

<script setup lang="ts">
import Offline from "@/components/layout/Offline.vue"
</script>
```

## Read it in a template (Options API)

After the plugin is installed, `$isOnline` is a `Ref<boolean>` on every component:

```vue
<template>
    <span v-if="!$isOnline.value">You are offline</span>
</template>
```

## Gate work on the online state

The composable returns the same live ref everywhere — a component's `setup`, a store, a service:

```ts
import { useOnlineChecker } from "@regira/modules/vue/online"

const { isOnline } = useOnlineChecker()
if (!isOnline.value) {
    /* skip the request, show offline UI */
}
```

## Set it from request results

`navigator.onLine` knows the network, not the API. The ref is writable, so an interceptor can feed it:

```ts
import axios from "axios"
import { useOnlineChecker } from "@regira/modules/vue/online"

const { isOnline } = useOnlineChecker()
axios.interceptors.response.use(
    (response) => ((isOnline.value = true), response),
    (error) => {
        // no response: the API is out of reach; a request the app cancelled says nothing about the network
        if (!axios.isCancel(error)) isOnline.value = error.response != null
        return Promise.reject(error)
    }
)
```

## See also

- [online.instructions.md](online.instructions.md) · [online.signatures.md](online.signatures.md)
