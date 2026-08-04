# Regira JsLib IoC — AI Agent Instructions

A tiny inversion-of-control container (`regira/vue/ioc`): register service factories with `add`,
resolve them with `get`. Entity services are registered and resolved through it.

> **Never guess** a signature — verify in [ioc.signatures.md](ioc.signatures.md).

## Import

```ts
import { ServiceProvider, get, plugin as servicesPlugin, type IServiceProvider } from "regira/vue/ioc"
```

## Container

`ServiceProvider` holds a `Map` of `key → factory`. `add(key, factory)` registers a factory and returns
the provider (chainable); `get<T>(key)` returns `factory(this)` or `undefined` when the key is unknown. A
module-level **default singleton** backs the standalone `get<T>(key)` function and the Vue plugin.

> **Resolution is transient.** `get(key)` re-invokes the factory **every call**, so each `get` of a
> service that does `new …()` yields a _new_ instance. Data caching/sharing is handled by the entities
> pooling layer (`createStore`), not by the container.

## Vue plugin

`plugin.install(app, { configure })` sets `app.config.globalProperties.$services` and
`provide("services", …)` to the default provider, then runs the optional `configure(sp)` callback — the
place to register shared singletons:

```ts
app.use(servicesPlugin, {
    configure: (sp) => sp.add("axios", () => axios).add(PoolCache.name, () => defaultPoolCache),
})
```

`$services` is typed on Vue's `ComponentCustomProperties`, so `this.$services` is available in components.

## How entities use it

Each entity `setup.ts` registers its service keyed by `Entity.name`:

```ts
sp.add(Entity.name, (sp) => new EntityService(sp.get<AxiosInstance>("axios")!, config))
```

and resolves it (e.g. inside the Pinia store) with the standalone `get`:

```ts
const service = get<IEntityService<Entity>>(Entity.name)!
```

Keys are arbitrary (`"axios"`, `PoolCache.name`, `Entity.name`); use the same key to add and get.

## Global options

`globalOptions` is a shared, mutable module-level object holding cross-plugin flags; `configureGlobals`
merges a partial into it. Plugins read it at install time, so set it **before** `app.use(...)`:

```ts
import { configureGlobals } from "regira/vue/ioc"

configureGlobals({ registerComponentsGlobally: true })
```

Components are imported locally by default. With `registerComponentsGlobally: true`, the component
plugins re-register their components app-wide: `iconPlugin` → `Icon`/`IconButton`, `loadingPlugin` →
`Loading`/`LoadingButton`/`LoadingContainer`, `pagingPlugin` → `Paging`, `modalPlugin` → `MyModal`,
`debugPlugin` → `Debug`. Because `globalOptions` is a plain module object, the flag is honored
regardless of `app.use` order. Each plugin accepts matching component options (`modalPlugin { Modal? }`,
`loadingPlugin { Loading?, … }`, `pagingPlugin { Paging? }`, `iconPlugin { Icon?, IconButton? }`,
`debugPlugin { Debug? }`) so a replacement skin — not the library default — is what gets registered.

## See also

- [ioc.examples.md](ioc.examples.md)
- [ioc.signatures.md](ioc.signatures.md)
- [regira_modules.vue.http](../../http/ai/http.instructions.md) — the `"axios"` registration
- [Entities](../../entities/ai/entities.instructions.md) — service registration & resolution
