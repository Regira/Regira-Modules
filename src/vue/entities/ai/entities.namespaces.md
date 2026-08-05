# Regira Entities — Import Reference

Where every type comes from. JavaScript has import specifiers, not namespaces.

> **AI rule:** You MUST use the exact import specifiers below. Do **not** guess a path or invent a
> deep import — verify here, then check the signature in [entities.signatures.md](entities.signatures.md).

> **Entities is the only module with a separate import reference** — its surface is large enough to warrant
> one. Every other module carries its specifiers inline in its own `<module>.signatures.md`; there is no
> `<module>.namespaces.md` to look for, and none is missing.

## The one import you usually need

The barrel **`@regira/modules/vue/entities`** re-exports the entire entities surface (abstractions, config,
overview, details, form, filter, lean views, describers, navigation, pooling, preloading, tree, utilities). Prefer it:

```ts
import {
    EntityBase,
    EntityServiceBase,
    JSONService,
    SearchObjectBase,
    ArchivedFilter,
    PagingInfo,
    type IEntity,
    type IEntityService,
    type IConfig,
    type SearchResult,
    type SaveResult,
    useSearchView,
    useRouteOverview,
    useDetails,
    useForm,
    useFilter,
    createStore,
    DetailsSummary,
} from "@regira/modules/vue/entities"
```

The two non-entities modules the entities layer depends on for wiring:

```ts
import { ServiceProvider, get, type IServiceProvider } from "@regira/modules/vue/ioc"
import { initAxios, useAxios, createQueryString } from "@regira/modules/vue/http"
```

> **Cross-slice import rule:** a slice barrel re-exports its model as the default **`Entity`**, not under the
> class name. Import another slice's model aliased, with the fully erased form —
> `import type { Entity as Vehicle } from "@/entities/vehicles"` — and its `config` / `EntityService` /
> `Selector` / `InputSelector` by those same generic export names.
>
> ⚠️ **`import type { … }`, not `import { type … }`.** Under `verbatimModuleSyntax` the inline modifier keeps
> the import statement at runtime, so two slices referencing each other's model make a barrel cycle that
> `data/store.ts` trips by reading `Entity.name` during module evaluation. It fails only on the dev server —
> `vue-tsc` and `npm run build` stay green.

---

## Types by concern (barrel: `@regira/modules/vue/entities`)

| Concern                | Exports                                                                                                                                                                                                                    |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Entity contract        | `IEntity`, `EntityBase`                                                                                                                                                                                                    |
| Service                | `IEntityService`, `EntityServiceBase`, `JSONService`                                                                                                                                                                       |
| Result envelopes       | `DetailsResult`, `ListResult`, `SearchResult`, `SaveResult`, `SavedResult`, `DeleteResult`                                                                                                                                 |
| Search / paging / sort | `ISearchObject`, `SearchObjectBase`, `DefaultSearchObject`, `ArchivedFilter`, `IPagingInfo`, `PagingInfo`, `DEFAULT_PAGESIZE`, `ISortByInfo`, `SortByInfo`                                                                 |
| Config / descriptor    | `IConfig`, `NavTypes`, `EntityDescriptor`, `IEntityDescriptor`                                                                                                                                                             |
| Overview               | `useSearchView`, `useListView`, `useOverviewCore`, `useRouteOverview`, `OverviewEmits` (`OverviewProps` and `DEFAULT_DEBOUNCE` are internal — not re-exported)                                                             |
| Details                | `useDetails`, `DetailsSummary`, `DetailsSummaryProps`                                                                                                                                                                      |
| Form                   | `useForm`, `useModal`, `FormProps`, `FormEmits`, `FormStates`, `formDefaults`, `useOwnedCollection`, `useOwnedModal`, `useListInput`, `useListItemInput`, `InputSelectorInline` (+ `InputSelectorInlineProps/Emits/Slots`) |
| Filter                 | `useFilter`, `FilterIn`, `FilterEmits`, `FilterOut`                                                                                                                                                                        |
| Lean views             | `EntityOverview`, `EntityForm` (generic list/edit driven by `IEntityService`) + `useLeanOverview`, `useLeanForm`, `leanOverviewDefaults`, `LeanOverviewProps/Slots/Out`, `LeanFormProps/Emits/Slots/Out`                   |
| Pooling                | `createStore`, `usePooling`, `defaultPoolCache`, `PoolCache`, `PoolService`, `IPoolHandler`, `IPoolService`, `IPoolCache`                                                                                                  |
| Navigation             | `NavItem`, `NavGroup`, `INavItem`, `INavCore`, `createNavItem`, `createNavGroup`, `buildNavigationTree`, `importDashboard`, `importNavbar`, `isNavItem`                                                                    |
| Tree                   | `useTree`, `useDragDrop`                                                                                                                                                                                                   |
| Preloading             | `usePreloader`, `preloaderPlugin`                                                                                                                                                                                          |
| Utilities              | `cleanQueryParams`, `parseQueryParams`                                                                                                                                                                                     |

`Selector.vue` (entity picker) is not on the barrel — it is generated per slice as `selecting/Selector.vue`.

## Granular subpaths

**Prefer the main barrel `@regira/modules/vue/entities`** — it re-exports everything below. Only the subpaths
listed in `package.json` `exports` resolve as standalone imports; for anything else, import from the barrel.

| Published subpath                                   | Holds                                                                                                                                        |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `@regira/modules/vue/entities/abstractions`         | `IEntity`, `EntityBase`, `IEntityService`, `EntityServiceBase`, `JSONService`, result types, `IConfig`, `NavTypes`, search/paging/sort types |
| `@regira/modules/vue/entities/abstractions/IEntity` | `IEntity` alone (the contract)                                                                                                               |
| `@regira/modules/vue/entities/details`              | `useDetails`, `DetailsSummary`                                                                                                               |
| `@regira/modules/vue/entities/form`                 | `useForm`, `FormStates`, modal/owned/list-input composables + types                                                                          |

> Composables not listed above (`useFilter`, overview/tree/preloading/navigation, …) are reached through the
> **main barrel**, not a `…/<area>` subpath — those subpaths are not in `exports` and will fail to resolve.

## Wiring modules

| Specifier                        | Exports                                                                                                   | Used for                                                                                                                                   |
| -------------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `@regira/modules/vue/ioc`        | `ServiceProvider`, `get`, `IServiceProvider`, `plugin`                                                    | register/resolve services                                                                                                                  |
| `@regira/modules/vue/http`       | `initAxios`, `useAxios`, `AxiosWithFilesInstance`, `createQueryString`                                    | the shared axios instance + query strings                                                                                                  |
| `@regira/modules/vue/auth`       | `plugin`, `LocalStorageTokenManager`/`CookieTokenManager`/`MemoryTokenManager`, `useAuthStore`, `useAuth` | bearer-token auth on the shared axios                                                                                                      |
| `@regira/modules/vue/vue-helper` | `useVModelField`, `createFromComputedPool`, `useEventListener`                                            | pool-backed computed + DOM-listener helpers; `useVModelField` only where native `defineModel` can't go (composables taking `props`/`emit`) |

> **Deep specifiers in the advanced example.** The verbatim Vehicle slice
> ([entities.advanced.example.md](entities.advanced.example.md)) reaches two granular paths:
> `@regira/modules/vue/http/axios` for the `AxiosWithFilesInstance` **type** (also re-exported by the
> `vue/http` barrel above) and `@regira/modules/vue/ui/icons` for `IIconProvider`. Prefer the barrel where
> a symbol is re-exported; these deep paths are only needed for the few symbols that aren't.

> **Date serialization (not under `vue/`):** `import dateExtensions from "@regira/modules/extensions/date-extensions"`
> then call `dateExtensions.use()` once at startup to serialize `Date`s to JSON without a timezone shift.
> It lives under `extensions/`, not `vue/` — a common wrong guess.

---

## By use case (copy-paste)

```ts
// Define an entity
import { EntityBase } from "@regira/modules/vue/entities"

// Define a service
import { EntityServiceBase, type IConfig } from "@regira/modules/vue/entities"
import type { AxiosInstance } from "axios"

// Static/lookup data service (client-side cache)
import { JSONService } from "@regira/modules/vue/entities"

// Define a search object (ArchivedFilter only when the UI exposes archived rows)
import { SearchObjectBase, ArchivedFilter } from "@regira/modules/vue/entities"

// Register + resolve the service
import { get, type IServiceProvider } from "@regira/modules/vue/ioc"
import type { IEntityService } from "@regira/modules/vue/entities"

// Pinia store wrapping the pooled service
import { createStore } from "@regira/modules/vue/entities"

// Overview (list + search + URL sync)
import { useSearchView, useRouteOverview } from "@regira/modules/vue/entities"

// Details + Form + Filter
import { useDetails } from "@regira/modules/vue/entities"
import { useForm, type FormEmits, formDefaults, FormStates } from "@regira/modules/vue/entities"
import { useFilter } from "@regira/modules/vue/entities"

// Navigation from the collected configs
import { importDashboard, importNavbar, buildNavigationTree } from "@regira/modules/vue/entities"

// App startup
import { initAxios } from "@regira/modules/vue/http"
import { plugin as servicesPlugin } from "@regira/modules/vue/ioc"
```

## See also

- [entities.signatures.md](entities.signatures.md) — exact signatures for everything above
- [entities.instructions.md](entities.instructions.md) — the workflow
