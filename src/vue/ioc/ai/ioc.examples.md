# Regira JsLib IoC — Examples

Verify signatures in [ioc.signatures.md](ioc.signatures.md).

## Install the plugin (startup)

In `main.ts`, register the shared singletons in `configure` — typically the `axios` instance and the
pool cache. `add` is chainable, so the callback returns the provider:

```ts
import { plugin as servicesPlugin, type IServiceProvider } from "regira/vue/ioc"
import { defaultPoolCache, PoolCache } from "regira/vue/entities"

const axios = initAxios({ api, includeCredentials })

app.use(servicesPlugin, {
    configure: (sp: IServiceProvider) => sp.add("axios", () => axios).add(PoolCache.name, () => defaultPoolCache),
})
```

## Register an entity service

Each entity `setup.ts` registers its service keyed by `Entity.name`, resolving its `axios` dependency
from the same provider:

```ts
import type { IServiceProvider } from "regira/vue/ioc"
import type { AxiosWithFilesInstance } from "regira/vue/http/axios"

export function addServices(sp: IServiceProvider) {
    sp.add(Entity.name, (sp) => new EntityService(sp.get<AxiosWithFilesInstance>("axios")!, config))
}
```

## Resolve in a Pinia store

Outside components, use the standalone `get` against the default singleton. The key is the same
`Entity.name` used to register:

```ts
import { get } from "regira/vue/ioc"
import { createStore, type IEntityService } from "regira/vue/entities"

export const useEntityStore = defineStore(Entity.name, () => {
    const service = get<IEntityService<Entity>>(Entity.name)!
    return createStore<Entity>(service, Entity.name)
})
```

## Resolve in a component

The same `get` works inside `<script setup>`:

```ts
import { get } from "regira/vue/ioc"
import type { IEntityService } from "regira/vue/entities"

const entityService = get<IEntityService<Entity>>(Entity.name)!
const search = (q: string) => entityService.list({ q, pageSize: 10 })
```

> `get(key)` re-runs the factory every call, so a factory that does `new …()` yields a fresh instance.
> Register shared singletons (like `axios`) by returning the same instance from the factory.

## Opt into global component registration

Plugins import their components locally by default. To restore app-wide registration, flip the flag
before installing the plugins — then the tags resolve without local imports:

```ts
import { configureGlobals } from "regira/vue/ioc"

configureGlobals({ registerComponentsGlobally: true })

app.use(iconPlugin)
app.use(loadingPlugin, { img })
app.use(pagingPlugin)
app.use(modalPlugin)
app.use(debugPlugin)
// <Icon>, <IconButton>, <Loading>, <Paging>, <MyModal>, <Debug> … now resolve app-wide
```

## See also

- [ioc.instructions.md](ioc.instructions.md) · [ioc.signatures.md](ioc.signatures.md)
