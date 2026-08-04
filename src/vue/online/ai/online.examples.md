# Regira JsLib Online — Examples

Verify signatures in [online.signatures.md](online.signatures.md).

## Install the plugin (startup)

Add it to `app` once in `main.ts`. The plugin seeds one reactive `isOnline` ref from
`navigator.onLine` and keeps it live via the window `online`/`offline` events:

```ts
import { plugin as isOnlinePlugin } from "regira/vue/online"

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

Use the composable when you just need a one-off seed of the current value (it reads
`navigator.onLine` but does not stay in sync — see the gotchas in the instructions):

```ts
import { useOnlineChecker } from "regira/vue/online"

const { isOnline } = useOnlineChecker()
if (!isOnline.value) {
    /* skip the request, show offline UI */
}
```

## See also

- [online.instructions.md](online.instructions.md) · [online.signatures.md](online.signatures.md)
