# Regira App (front-end)

`@regira/modules/vue/app` — app lifecycle and culture for a Regira Vue app: a Pinia `AppStore` tracking
`AppStatus` (`Init` → `Loading` → `Mounting` → `Ready`) and culture, a plugin that exposes them as
`$appStatus` / `$culture` / `$isReady` globals, and `onAppReady` / `whenAppReady` hooks to defer work
until the app is ready.

## What it provides

| Export             | Purpose                                                                                                                                                  |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `plugin`           | Vue plugin; reads the store and defines `$culture` / `$setCulture` / `$isReady` / `$appStatus` / `$setAppStatus` globals (`install(app, { culture? })`). |
| `useAppStore()`    | Pinia store `"AppStore"`: `status`, `culture`, `logo`, computed `isReady`, plus `setCulture` / `setStatus` / `setLogo`.                                  |
| `AppStatus`        | Enum of lifecycle states: `Init`, `Loading`, `Mounting`, `Ready`.                                                                                        |
| `useCulture()`     | Read the current `$culture` from the active component (or `undefined` outside one).                                                                      |
| `onAppReady(func)` | Run `func` now if ready, otherwise once the app becomes ready.                                                                                           |
| `whenAppReady()`   | `Promise<void>` that resolves once the app is ready.                                                                                                     |

## How it fits

```
app.use(createPinia())
app.use(plugin, { culture })          →  $appStatus / $culture / $isReady globals
   bootstrap: setStatus(Loading) … setStatus(Ready)
   onAppReady(fn) / await whenAppReady()   fire once status === Ready
```

The status is driven by the app's own bootstrap (load config, `initAxios`, prime entities); nothing
advances to `Ready` until you call `setStatus(AppStatus.Ready)`.
