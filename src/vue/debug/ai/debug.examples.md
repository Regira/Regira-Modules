# Regira Debug — Examples

Verify signatures in [debug.signatures.md](debug.signatures.md).

## Install the plugin (startup)

Install after vue-router (the `$isDebug` getter reads the current route). Pass `isDebug` from your
loaded config:

```ts
import { plugin as debugPlugin } from "regira/vue/debug"

app.use(debugPlugin, { isDebug: config.isDebug }) // isDebug defaults to false
```

This installs the `$isDebug` / `$setDebug` global properties that the `Debug` component reads.

## A debug bar that only shows in debug mode

Import `Debug` where used. With no `modelValue` it just acts as a slot for debug-only chrome (it
renders nothing unless `$isDebug` is true):

```vue
<script setup lang="ts">
import { Debug } from "regira/vue/debug"
</script>
<template>
    <section>
        <Feedback :feedback="$feedback" />
        <Debug />
    </section>
</template>
```

## Dump a value in a component

Pass any object/array as `modelValue`; it is pretty-printed as JSON when debug is on:

```vue
<template>
    <section>
        <List :items="items" />
        <Debug :modelValue="items" />
    </section>
</template>
```

Combine several things into one object to inspect them together:

```vue
<template>
    <Debug
        :modelValue="{
            searchObject,
            pagingInfo,
            items,
        }"
    />
</template>
```

## Gate your own debug-only UI

Use the `$isDebug` getter to show extra markup, and `$setDebug(false)` to switch debug output off:

```vue
<script setup lang="ts">
import { IconButton } from "regira/vue/ui"
</script>
<template>
    <div v-if="$isDebug" class="debug">
        <span>{{ $router.currentRoute.value.name }}</span>
        <IconButton icon="close" @click="$setDebug(false)" />
    </div>
</template>
```

To force debug on without rebuilding, append `?debug=1` to the URL — it overrides the `isDebug`
install option (any other `?debug` value forces it off).

## See also

- [debug.instructions.md](debug.instructions.md) · [debug.signatures.md](debug.signatures.md)
