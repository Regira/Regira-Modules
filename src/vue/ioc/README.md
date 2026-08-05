# Regira IoC (front-end)

`@regira/modules/vue/ioc` — a tiny inversion-of-control container that wires the app's services. Entity
services are registered and resolved through it. It also holds the library's cross-plugin
**global options**.

## What it provides

| Export             | Purpose                                                                              |
| ------------------ | ------------------------------------------------------------------------------------ |
| `ServiceProvider`  | Container: `add(key, factory)` to register, `get<T>(key)` to resolve.                |
| `get<T>(key)`      | Resolve from the shared default provider (used outside components).                  |
| `plugin`           | Vue plugin: exposes the provider as `$services` and `provide("services", …)`, initializes the `$configs` container (for entity `IConfig` registrations), and runs a `configure(sp)` callback. |
| `IServiceProvider` | The container interface.                                                             |
| default export     | The shared `ServiceProvider` singleton.                                              |
| `globalOptions`    | Shared, mutable options object read by plugins at install time.                      |
| `configureGlobals` | Setter that merges into `globalOptions`; call once before `app.use(...)`.            |
| `GlobalOptions`    | The options shape.                                                                   |

## Global component registration

Plugins import their sub-components locally by default. To opt back into app-wide registration —
so `<Icon>`, `<Loading>`, `<Paging>`, `<Debug>`, `<MyModal>`, … resolve without local imports —
turn on the flag before installing the plugins:

```ts
import { configureGlobals } from "@regira/modules/vue/ioc"

configureGlobals({ registerComponentsGlobally: true })
// then app.use(iconPlugin) / loadingPlugin / pagingPlugin / modalPlugin / debugPlugin
```

`globalOptions` is a plain module-level object (default `registerComponentsGlobally: false`), so the
flag is honored regardless of `app.use` order. When on, `iconPlugin` registers `Icon`/`IconButton`,
`loadingPlugin` registers `Loading`/`LoadingButton`/`LoadingContainer`, `pagingPlugin` registers
`Paging`, `modalPlugin` registers `MyModal`, and `debugPlugin` registers `Debug`.

## Key behaviour

Registration is **factory-based and transient** — `get(key)` re-runs the factory on every call, so a
factory that does `new …()` returns a fresh instance each time. Reactive entity caching is handled
separately by the entities pooling layer, not here.

## How it fits

```
// servicesPlugin is this module's `plugin` export:
// import { plugin as servicesPlugin } from "@regira/modules/vue/ioc"
app.use(servicesPlugin, { configure: sp =>
    sp.add("axios", () => axios)              // the shared HTTP instance (@regira/modules/vue/http)
      .add(PoolCache.name, () => defaultPoolCache) })

// each entity setup.ts:
sp.add(Entity.name, sp => new EntityService(sp.get("axios")!, config))
// stores/components:
const service = get<IEntityService<Entity>>(Entity.name)!
```
