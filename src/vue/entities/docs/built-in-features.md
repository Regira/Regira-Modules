# Built-in features

Ready-to-use pieces beyond the basic CRUD slice.

## Pooling

`createStore(service, Entity.name)` wraps a service in a `PoolService`, backed by a shared `PoolCache`,
so all views see one reactive, de-duplicated set of entities (`Ref<T>` keyed by id). Views use the
**store's** pooled `service`, never the raw IoC service. A save through the pooled `service` updates the
shared `Ref<T>` in place, so an edit anywhere (e.g. a `FormModalButton`) re-renders every view that pooled
that entity — live, with no refetch. No cache registration is required — `usePooling` (and thus
`createStore`) defaults to the module-level `defaultPoolCache` singleton; the app shell registers that
same singleton in IoC by convention, so other code can resolve it:

```ts
app.use(servicesPlugin, { configure: (sp) => sp.add("axios", () => axios).add(PoolCache.name, () => defaultPoolCache) })
```

`usePooling(service, type, cache?, persistent?)` is the lower-level primitive; mark never-expiring types
via `cache.persistentTypes`. `PoolCache` accepts `{ interval, expires, maxItems }`.

Views read the cache through two store accessors. **`fromPool(entityOrRelation)`** (single or array) runs the
input through `toEntity` and returns the shared, deduplicated instance for its `$id` — rehydrating a plain
nested relation into a real model so `$id`/`$title` work, and pooling it on first sight (a single unsaved
input passes through untouched; items inside an array are pooled regardless). Alias a sibling store's `fromPool` to display a relation's label —
`const { fromPool: getUnitType } = useUnitTypeStore()`, then bind `getUnitType(item.unitType)?.$title` in a
template — passing the relation **object**, not its id. **`fromCache(id?)`** is read-only: an id returns that `Ref<T>` (or
`undefined`), no argument returns all cached refs of the type; it never fetches.

## Preloading

`usePreloader()` (and `preloaderPlugin`) warm caches for lookup entities right after login, so forms
open with their dropdowns already populated. Preload the entities a form depends on before navigating to it.

## Navigation

Each `setup.ts` registers its `IConfig` in `app.config.globalProperties.$configs`. Build menus from that
map with `importDashboard`, `importNavbar`, and `buildNavigationTree`; `createNavItem(config)` /
`createNavGroup(...)` produce `NavItem` / `NavGroup` (`INavItem` / `INavCore`).

## Trees

`useTree<T>()` builds a `TreeList` from flat data and exposes `tree`, `nodes`, `ancestors`, `offspring`,
`family`, and `init(values, data, findParents)`. Pair with `useDragDrop` for move/reparent interactions.

## Describers

`useEntityDescribers(ns?)` is an alternative, namespaced registry (config + pooling store factory +
component bag per entity). It is independent of the `$configs`/IoC wiring the demos use; reach for it
only if you are building a registry-driven UI.

## Utilities

- `cleanQueryParams(params)` — drops null/`$`-prefixed keys and `page` ≤ 1 before building a query string.
- `parseQueryParams(query)` — splits a route query into `{ searchObject, pagingInfo }`.

## Wiring modules

The entities layer depends on two sibling modules:

- **`regira/vue/ioc`** — `ServiceProvider` / `get` (factory-based container; `get` re-runs the
  factory each call). Entity services are registered/resolved by `Entity.name`.
- **`regira/vue/http`** — `initAxios({ api, includeCredentials })` creates the shared instance
  (set `baseURL`, credentials, file helpers); `useAxios()` returns it; `createQueryString(obj)` builds
  the query string (arrays → repeated keys). The `regira/vue/auth` plugin layers the bearer
  token onto the same instance.

## Overview

1. [Abstractions](abstractions.md)
2. [Services](services.md)
3. [Config](config.md)
4. [Views](views.md)
5. [Built-in features](built-in-features.md)
6. [Attachments](attachments.md)
7. [Checklist](checklist.md)
