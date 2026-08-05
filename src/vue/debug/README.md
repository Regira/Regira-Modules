# Regira Debug (front-end)

`@regira/modules/vue/debug` — a `<Debug>` display component for dumping values on screen, plus a Vue
plugin that adds `$isDebug` / `$setDebug` globals to control when that output shows.

## What it provides

| Export                    | Purpose                                                                                                                                                                              |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `plugin` (default)        | Vue plugin; installs the `$isDebug`/`$setDebug` global properties. Options: `{ isDebug, Debug? }` — `Debug?` swaps the component registered app-wide when global registration is on. |
| `Debug`                   | Component that renders `title` + `modelValue` (as pretty JSON) only when `$isDebug` is true.                                                                                         |
| `$isDebug`                | Global getter — `enableDebug` && (the `?debug` query param when present, else the `isDebug` option).                                                                                 |
| `$setDebug(value = true)` | Global master switch; `false` hides all debug output.                                                                                                                                |

## How it fits

```
app.use(plugin, { isDebug })
   ├─ $isDebug  ← reads ?debug query (via $router) and the isDebug option
   └─ $setDebug ← master enable/disable switch
```

`Debug` is imported locally where used (it bundles its own `Icon`). With
`configureGlobals({ registerComponentsGlobally: true })` (from `@regira/modules/vue/ioc`) set before
`app.use(plugin)`, the plugin also registers `Debug` app-wide. Requires vue-router — the `$isDebug`
getter reads the current route.
