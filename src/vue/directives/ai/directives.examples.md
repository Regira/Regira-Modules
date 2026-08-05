# Regira Directives — Examples

Verify signatures in [directives.signatures.md](directives.signatures.md).

## Register the plugins (startup)

The barrel exports are **plugins** (objects with `install`), so register them with `app.use` — not
`app.directive`. Each one wires up its template directive (`v-focus`, `v-grow`, `v-click-outside`):

```ts
import { focus, grow, clickOutside } from "@regira/modules/vue/directives"

// global directives
app.use(focus)
app.use(grow)
app.use(clickOutside)
```

## Autofocus an input (`v-focus`)

Drop `v-focus` on the element that should grab focus when it mounts (focus is applied ~250 ms later):

```vue
<template>
    <input v-focus v-model.trim="item.value" maxlength="256" class="form-control" />
</template>
```

## Close a dropdown on outside click (`v-click-outside`)

Bind a handler that runs when a click lands outside the element. Toggle from a separate element so the
opening click doesn't immediately close it:

```vue
<script setup lang="ts">
import { ref } from "vue"
const showMenu = ref(false)
function handleCloseMenu() {
    showMenu.value = false
}
</script>
<template>
    <a href="#" @click.prevent="showMenu = !showMenu">Account</a>
    <ul class="dropdown-menu" :class="{ show: showMenu }" v-click-outside="handleCloseMenu">
        <li>…</li>
    </ul>
</template>
```

## Auto-grow a textarea (`v-grow`)

Add `v-grow` to a `<textarea>`; it raises `minHeight` as newlines are added, up to `maxGrow` (default 7).
`maxGrow` is a plugin-level option set at install time, not per-element — override it on `app.use`:

```ts
app.use(grow, { maxGrow: 10 })
```

```vue
<template>
    <textarea v-grow v-model="notes" class="form-control"></textarea>
</template>
```

## See also

- [directives.instructions.md](directives.instructions.md) · [directives.signatures.md](directives.signatures.md)
