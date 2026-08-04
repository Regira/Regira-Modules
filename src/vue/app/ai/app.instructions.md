# Regira App — AI Agent Instructions

The front-end app-lifecycle layer (`regira/vue/app`): a Pinia store tracking the app's
`AppStatus` (`Init` → `Loading` → `Mounting` → `Ready`) and culture, a Vue plugin that exposes them as
`$appStatus` / `$culture` / `$isReady` globals, and `onAppReady` / `whenAppReady` hooks for deferring
work until the app is ready. The [entities client](../../entities/ai/entities.instructions.md) and
[HTTP layer](../../http/ai/http.instructions.md) are typically initialized while the status moves toward
`Ready`.

> **Never guess** a signature — verify in [app.signatures.md](app.signatures.md).

## Import

```ts
import { plugin, useAppStore, AppStatus, useCulture, onAppReady, whenAppReady } from "regira/vue/app"
```

There is a single barrel export (`regira/vue/app`); there are no granular subpaths.

## The plugin

Register the `plugin` once. It reads the `useAppStore` Pinia store (so Pinia must be installed first) and
defines the global properties on `app.config.globalProperties`:

```ts
import { createApp } from "vue"
import { createPinia } from "pinia"
import { plugin } from "regira/vue/app"

const app = createApp(Root)
app.use(createPinia())
app.use(plugin, { culture: "nl-BE" }) // culture is optional
```

`install(app, { culture? })` calls `store.setCulture(culture)` and wires up:

- **`$culture`** (getter → `store.culture`) and **`$setCulture(value)`** → `store.setCulture(value)`
- **`$isReady`** (getter → `store.isReady`)
- **`$appStatus`** (getter → `store.status`) and **`$setAppStatus(value)`** → `store.setStatus(value)`

These are also declared on Vue's `ComponentCustomProperties`, so they are typed in templates and `this`.

## The store

`useAppStore()` is a Pinia store named `"AppStore"`:

- **`status`** — current `AppStatus`, starts at `AppStatus.Init`.
- **`culture`** — defaults to `navigator.language`.
- **`logo`** — optional logo string.
- **`isReady`** — computed, `true` only when `status === AppStatus.Ready`.
- **`setCulture(value?)`** — falls back to `navigator.language` when `value` is empty.
- **`setStatus(value)`**, **`setLogo(value)`** — setters.

Drive the lifecycle yourself during bootstrap, ending with `setStatus(AppStatus.Ready)`:

```ts
const store = useAppStore()
store.setStatus(AppStatus.Loading)
// … load runtime config, init axios, prime entity caches …
store.setStatus(AppStatus.Ready)
```

## Ready hooks

- **`onAppReady(func)`** — runs `func` immediately if already ready; otherwise watches `isReady` (`once`)
  and, inside a component, also re-checks on `onMounted`.
- **`whenAppReady()`** → `Promise<void>` that resolves once the app is ready (await it in setup/services).

```ts
onAppReady(() => console.log("ready"))
await whenAppReady()
```

## Culture helper

`useCulture()` returns the current `$culture` from the current component instance (or `undefined` outside
a component context). Inside setup with the store available, prefer `useAppStore().culture`.

## Gotchas

- **Pinia first.** `plugin.install` and every hook call `useAppStore()`, so install Pinia before this
  plugin and before calling `onAppReady` / `whenAppReady` / `useCulture`.
- **Nothing reaches `Ready` on its own.** `status` stays at `Init` until you call `setStatus(...)`;
  `isReady`, `onAppReady`, and `whenAppReady` only fire after you advance it to `AppStatus.Ready`.
- **`useCulture` needs a component.** It reads `getCurrentInstance()` and returns `undefined` when called
  outside a component (e.g. in a plain module). Use the store there instead.
- **Empty culture falls back.** `setCulture(undefined)` / `setCulture("")` resets to `navigator.language`,
  not to a blank value.

## See also

- [app.signatures.md](app.signatures.md)
- [app.examples.md](app.examples.md) — copy-paste snippets for plugin setup, lifecycle, and ready hooks
- [HTTP](../../http/ai/http.instructions.md) — the axios layer initialized during bootstrap
- [Entities](../../entities/ai/entities.instructions.md) — primed while the app reaches `Ready`
