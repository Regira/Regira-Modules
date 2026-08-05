# Regira Directives (front-end)

`@regira/modules/vue/directives` — three small Vue custom directives, each shipped as a Vue plugin.
The barrel exports the **plugins** (each file's `default`), not the directive objects themselves, so
registration goes through `app.use`:

```ts
import { focus, clickOutside, grow } from "@regira/modules/vue/directives"

app.use(focus) // registers v-focus
app.use(clickOutside) // registers v-click-outside
app.use(grow, { maxGrow: 7 }) // registers v-grow
```

The named directive objects are not reachable from the barrel, so `app.directive("focus", focus)`
would register the plugin object (which has no directive hooks) and silently do nothing. `grow` must
be installed via `app.use` in any case — its options are only initialized inside `install()`.

## What it provides

| Export         | Purpose                                                                                                                   |
| -------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `focus`        | Plugin registering `v-focus`: calls `el.focus()` ~250 ms after mount.                                                     |
| `clickOutside` | Plugin registering `v-click-outside`: runs the bound handler when a click lands outside the element.                      |
| `grow`         | Plugin registering `v-grow`: auto-grows a `<textarea>`'s `minHeight` as newlines are added (option `maxGrow`, default 7). |
