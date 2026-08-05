# Regira Online (front-end)

`@regira/modules/vue/online` — online/offline detection for the app: the `useOnlineChecker` composable
plus a Vue plugin that keeps one reactive `isOnline` ref in sync with the browser and exposes it
app-wide as `$isOnline`. Use it to gate calls to the [HTTP layer](../http/README.md) and
[entities client](../entities/README.md) when the network is down.

## What it provides

| Export                             | Purpose                                                                                                                         |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `plugin` (also the default export) | Vue plugin: creates one `isOnline` ref, wires `online`/`offline` listeners, registers `$isOnline` and `provide("isOnline", …)`. |
| `useOnlineChecker()`               | Composable returning `{ isOnline }`, a `Ref<boolean>` seeded from `navigator.onLine`.                                           |
| `IsOnline`                         | The `{ isOnline: Ref<boolean> }` return type of `useOnlineChecker`, exported from the barrel.                                   |
| `$isOnline`                        | `Ref<boolean>` on `ComponentCustomProperties` — available in templates and the Options API after the plugin is installed.       |

> Note: each `useOnlineChecker()` call returns a **fresh, one-time snapshot** ref — the
> `online`/`offline` listeners are wired only to the plugin's own instance, so a ref you create
> yourself never updates. For the live value, read `$isOnline` or `inject("isOnline")` provided by
> the plugin.
