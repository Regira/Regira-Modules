# Regira Online — AI Agent Instructions

The front-end online/offline layer (`@regira/modules/vue/online`): a tiny `useOnlineChecker` composable
plus a Vue plugin that keeps a single reactive `isOnline` ref in sync with the browser and exposes it
app-wide as `$isOnline`. Use it to gate calls to the [entities client](../../entities/ai/entities.instructions.md)
or [HTTP layer](../../http/ai/http.instructions.md) when the network is down.

> **Never guess** a signature — verify in [online.signatures.md](online.signatures.md).

## Import

```ts
import { useOnlineChecker, plugin } from "@regira/modules/vue/online"
import onlinePlugin from "@regira/modules/vue/online" // default export === plugin
```

There are no granular subpaths — everything is re-exported from the package root.

## The plugin and `$isOnline`

Install the plugin once at startup. It creates one `isOnline` ref (seeded from `navigator.onLine`),
listens to the window `online`/`offline` events to keep it current, and registers it two ways:

```ts
app.use(onlinePlugin)
// in any component option API:  this.$isOnline.value
// in any setup/inject:          inject("isOnline") as Ref<boolean>
```

`$isOnline` is typed on `ComponentCustomProperties`, so `this.$isOnline` is a `Ref<boolean>` in templates
and the Options API. The same ref is also `provide`d under the injection key `"isOnline"`.

## The composable

`useOnlineChecker()` returns `{ isOnline }`, a `Ref<boolean>` initialised from `navigator.onLine`.

```ts
const { isOnline } = useOnlineChecker()
if (!isOnline.value) {
    /* skip the request, show offline UI */
}
```

## Gotchas

- **The composable alone does not stay in sync.** `useOnlineChecker()` only seeds the ref from
  `navigator.onLine` once; it attaches no event listeners. Only the **plugin** wires up the
  `online`/`offline` listeners that keep the value live. For a reactive flag, use the plugin's
  `$isOnline` / `inject("isOnline")` ref, not a standalone `useOnlineChecker()` call.
- **Each `useOnlineChecker()` call returns a new ref.** They are independent — they do not share state
  with the plugin's ref or with each other.
- **Browser-only.** It reads `navigator.onLine` and `window`, so it must run client-side.

## See also

- [online.examples.md](online.examples.md)
- [online.signatures.md](online.signatures.md)
- [HTTP](../../http/ai/http.instructions.md) · [Entities](../../entities/ai/entities.instructions.md) — what you typically gate on the online state
