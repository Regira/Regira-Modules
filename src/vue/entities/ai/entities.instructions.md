# Regira Entities — AI Agent Instructions

> The browser-side CRUD client for the **Regira.Entities** API — a Vue 3 + Pinia + vue-router library
> (`@regira/modules/vue/entities`). Describe an entity once (model, service, config, views) and get a
> list/search overview, a details page, a create/edit form, and a filter, all wired through a shared HTTP
> client and a reactive entity cache.

This is the always-loaded spine. It situates the entities client among the other front-end modules,
gives the entity-building workflow, and points to the satellite files for exact imports, signatures, and
full code.

> **Reading order:** this file → [entities.setup.md](entities.setup.md) (new app) →
> [entities.namespaces.md](entities.namespaces.md) (exact imports) →
> [entities.signatures.md](entities.signatures.md) (exact signatures) →
> [entities.examples.md](entities.examples.md) (a **simple** `UnitType` slice, then a **standard** `Product`
> slice) / [entities.advanced.example.md](entities.advanced.example.md) (a **complex** `Vehicle` slice). Load
> [entities.patterns.md](entities.patterns.md) for individual recipes.
>
> **Never guess** an import path, signature, or option name. Verify in namespaces/signatures. If a detail
> is missing there, stop and ask — do not invent it.

---

## Modules

A front-end app is **assembled** from several `@regira/modules` packages. `vue/entities` is the CRUD
engine; the others provide the runtime it plugs into. This is the front-end counterpart of the back-end
package set — each module has its own guide (load it when you work in that area).

| Module                         | Import                                                                                            | Role                                                                                                                                                                                                                                                                                                                                   | Required?                                                                                 |
| ------------------------------ | ------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| **vue/entities**               | `@regira/modules/vue/entities`                                                                    | **This module.** The CRUD engine: `EntityBase`, `EntityServiceBase`/`JSONService`, `IConfig`, `createStore` (pooling), the overview/details/form/filter composables, navigation, preloading, tree.                                                                                                                                     | ✓ core                                                                                    |
| **vue/app**                    | [`@regira/modules/vue/app`](../../app/ai/app.instructions.md)                                     | App lifecycle + culture: `AppStatus` (Init→Mounting→Ready), `$setAppStatus`, `$culture`/`$setCulture`, `whenAppReady()`, the loading gate. The app's heartbeat.                                                                                                                                                                        | ✓ core                                                                                    |
| **vue/ioc**                    | [`@regira/modules/vue/ioc`](../../ioc/ai/ioc.instructions.md)                                     | Service container: register the shared `axios` + `PoolCache` here; every entity service is resolved from it by `Entity.name` via `get()`.                                                                                                                                                                                              | ✓ core                                                                                    |
| **vue/http**                   | [`@regira/modules/vue/http`](../../http/ai/http.instructions.md)                                  | The single shared axios: `initAxios({ api, includeCredentials })` (sets `baseURL`, credentials, file upload/download helpers).                                                                                                                                                                                                         | ✓ core                                                                                    |
| **vue/ui**                     | [`@regira/modules/vue/ui`](../../ui/ai/ui.instructions.md)                                        | Component + feedback kit (Bootstrap 5): `feedbackPlugin`, `loadingPlugin`/`LoadingContainer`, `iconPlugin`, `screenPlugin`, `DefaultModal`, inputs (`DateInput`, `NullableCheckBox`…), `Autocomplete`, paging, tabs — components are imported locally by default (opt-in app-wide registration via `configureGlobals` from `vue/ioc`). | ✓ core¹                                                                                   |
| **vue/auth**                   | [`@regira/modules/vue/auth`](../../auth/ai/auth.instructions.md)                                  | Login + bearer token layered on the shared axios: `authPlugin`, `LocalStorageTokenManager`, `useAuthStore`, login UI, route guard.                                                                                                                                                                                                     | ○ optional (see [Running without auth](entities.setup.md#running-without-authentication)) |
| **vue/lang**                   | [`@regira/modules/vue/lang`](../../lang/ai/lang.instructions.md)                                  | i18n: `langPlugin`, `useLang`, `$t`/`$tm`, key-first translations.                                                                                                                                                                                                                                                                     | ○ optional                                                                                |
| **vue/directives**             | [`@regira/modules/vue/directives`](../../directives/ai/directives.instructions.md)                | Global directives installed as plugins: `focus`, `grow` (textarea autosize), `clickOutside`.                                                                                                                                                                                                                                           | ○ optional                                                                                |
| **vue/online**                 | [`@regira/modules/vue/online`](../../online/ai/online.instructions.md)                            | Connectivity: `isOnlinePlugin` + `$isOnline`, drives an offline banner.                                                                                                                                                                                                                                                                | ○ optional                                                                                |
| **vue/formatters**             | [`@regira/modules/vue/formatters`](../../formatters/ai/formatters.instructions.md)                | Date/number formatting (`formatDateTime`, …) — used for display and config cache-busting.                                                                                                                                                                                                                                              | ○ optional                                                                                |
| **vue/debug**                  | [`@regira/modules/vue/debug`](../../debug/ai/debug.instructions.md)                               | Dev-only `debugPlugin` + `$isDebug`/`$setDebug`.                                                                                                                                                                                                                                                                                       | ○ optional                                                                                |
| **extensions/date-extensions** | [`@regira/modules/extensions/date-extensions`](../../../extensions/ai/extensions.instructions.md) | `dateSerializer.use()` once at startup — serialize `Date`s to JSON without a timezone shift. Lives under `extensions/`, **not** `vue/`.                                                                                                                                                                                                | ○ recommended                                                                             |
| **utilities**                  | [`@regira/modules/utilities`](../../../utilities/ai/utilities.instructions.md)                    | Pure helpers (`string-utility`, `array-utility`, `file-utility`, …).                                                                                                                                                                                                                                                                   | ○ as needed                                                                               |

> **Not in the common stack:** `@regira/modules/treelist` (`TreeList` / `IFindParents`) is a direct
> dependency only when you build an explicit client-side hierarchy with `useTree` — a load-on-demand
> recipe in [entities.patterns.md → Hierarchical (tree) entities](entities.patterns.md#hierarchical-tree-entities),
> not part of the app you assemble here. (The dashboard/navbar builders return a `TreeList` too, but you
> import those from `vue/entities`, not `treelist` directly.)

¹ _`vue/ui` is "core" because the standard app shell (`App.vue`) uses `Feedback` + `LoadingContainer` and
the views render icons. A pure headless data layer can skip it — see
[Choosing a service base](#choosing-a-service-base) and the data-layer-only note in
[entities.setup.md](entities.setup.md)._

The **plugin install order** that wires these together is fixed (verified across the reference apps) —
see [App startup](#app-startup-wiring-order) and the canonical `main.ts` in
[entities.setup.md → Bootstrap](entities.setup.md#bootstrap--maints).

---

## Scope & licensing

This is a **client library**. There is no license key and no service-registration budget on the
front-end (those are back-end concepts). You wire entities purely in app code.

## Quick Agent Playbook

| Task                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Go to                                                                                                                                            |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Stand up a new app** (full SPA: deps, full plugin stack, `main.ts`, `App.vue`, router, preloader, app shell, `app-config.ts`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | → [entities.setup.md](entities.setup.md)                                                                                                         |
| **Scaffold the app shell** (`scaffold.mjs --shell` → bootstrap, config, router, dashboard + navbar, layout, views; `--no-auth` variant)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               | → [entities.shell.template.md](entities.shell.template.md) · [setup §App shell](entities.setup.md#app-shell--components-infrastructure--styling) |
| **Add an entity**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | → [§Entity Implementation Workflow](#entity-implementation-workflow)                                                                             |
| **Scaffold a new entity** (`scaffold.mjs <Entity>` copies the full slice; `--api <path>` when the server route differs from the folder, `--rel <Related>` per displayed to-one relation, `--owns <Child>` per owned collection, `--overwrite-slice` to re-scaffold an existing slice — `--force` does not cover slices; then fill the `(c)` files). ⚠️ **Both `--rel` and `--owns` take a trailing `--as <field>`, and it is required whenever the JSON key is not the pluralised/camel-cased class name** — the wire contract follows the **C# property** name (`CreditRequest.Items` → `items`, not `creditRequestItems`). Pass it on the first run: correcting it afterwards needs `--overwrite-slice`, which replaces the 8 `(c)` files you have authored by then | → [entities.template.md](entities.template.md)                                                                                                   |
| **Scaffold file attachments** (`scaffold.mjs <Entity> --attachments` copies the shared offline file/upload slice — once per app — **and** wires it into that entity: the `attachments` field, the `insert`/`update` overrides and the `prepareItem` filter that drops rows marked for deletion. Only the form tab is left to place, and ⚠️ the attachments overview brings its own `FormSection`, so it goes in a tab or beside the form's section, never inside one)                                                                                                                                                                                                                                                                                                 | → [entities.attachments.template.md](entities.attachments.template.md)                                                                           |
| **See a worked slice, simplest first** (a **simple** `UnitType`, then a **standard** `Product`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | → [entities.examples.md](entities.examples.md)                                                                                                   |
| **See a complex slice — an aggregate root with attachments, owned child collections, a many-to-many link and sibling entities that reference it back** (`Vehicle`). Read this whenever your entity is the centre of its domain, even if you have already solved those features individually: the value is the _shape_, not the feature list                                                                                                                                                                                                                                                                                                                                                                                                                           | → [entities.advanced.example.md](entities.advanced.example.md)                                                                                   |
| **Implement one feature** (child collections, trees, JSON lookups, union search, navigation, custom endpoints, OpenAPI typing)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | → [entities.patterns.md](entities.patterns.md)                                                                                                   |
| **Run without authentication**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | → [entities.setup.md §Running without auth](entities.setup.md#running-without-authentication)                                                    |

## References

**Imports:** [entities.namespaces.md](entities.namespaces.md) — never guess or invent an import specifier.

**Signatures:** [entities.signatures.md](entities.signatures.md) — never guess a method name, parameter,
or return type; verify here.

---

## Core Understanding

### Architecture

Every entity is a thin vertical slice: a typed model, a service that calls the API, a config object, a
pooled Pinia store, and four views (overview / details / form / filter) driven entirely by composables.
You write almost no imperative logic — you implement `toEntity()` and bind templates.

```
Vue view  ──uses──▶  composable (useSearchView / useForm / useDetails / useFilter)
                          │
                     Pinia store  ──createStore──▶  PoolService (entity cache)
                          │
                     IEntityService  ◀──IoC get(Entity.name)──  EntityServiceBase<T> subclass
                          │
                     shared axios (initAxios) + IConfig.*Url  ──HTTP──▶  Regira.Entities Web API
```

- One **axios** instance is created once (`initAxios`) and shared; the auth plugin layers a bearer
  interceptor on it, so every entity request is authenticated automatically.
- Each service is registered in the **IoC** container keyed by `Entity.name` and resolved with `get()`.
- The store wraps the resolved service in a **pool** (`createStore`) so views share a reactive cache: a save
  through the pooled service updates the one shared instance, so an edit anywhere propagates to every view
  automatically.

### Generic type system

| Parameter | Constraint                    | Role                                                                            |
| --------- | ----------------------------- | ------------------------------------------------------------------------------- |
| `T`       | `extends IEntity`             | the entity model (`$id` = uniform identifier, `$title` = uniform display label) |
| `SO`      | `extends ISearchObject`       | the search/filter object (has `q`)                                              |
| —         | `IConfig`                     | endpoint URLs, paging, route prefix, titles, icon                               |
| —         | `IPagingInfo` / `ISortByInfo` | paging and sort directives                                                      |

### The API contract it mirrors

`EntityServiceBase<T>` builds requests from `IConfig` and expects **item-wrapped** envelopes — the exact
shape the back-end `Regira.Entities.Web` endpoints return (the **HTTP body** column below), then **unwraps
them for you**, so the method return types are _not_ these envelopes — see the note under the table.

| Method             | HTTP   | URL                                                    | HTTP body          |
| ------------------ | ------ | ------------------------------------------------------ | ------------------ |
| `details(id)`      | GET    | `{detailsUrl}/{id}`                                    | `{ item }`         |
| `list(so)`         | GET    | `{listUrl}?{query}`                                    | `{ items }`        |
| `search(so)`       | GET    | `{searchUrl}?{query}`                                  | `{ items, count }` |
| `searchUnion(sos)` | POST   | `{searchUrl}?{query}` (body = array of search objects) | `{ items, count }` |
| `insert(item)`     | POST   | `{saveUrl}`                                            | `{ item }`         |
| `update(item)`     | PUT    | `{saveUrl}/{$id}`                                      | `{ item }`         |
| `remove(item)`     | DELETE | `{deleteUrl}/{$id}`                                    | —                  |

> **The methods return _unwrapped_ values, not these envelopes.** `list()` resolves to `Array<T>` (not `{ items }`), `details()` to `T | undefined`, `search()`/`searchUnion()` to `SearchResult<T>` (`{ items, count }`), `save()`/`insert()`/`update()` to `SaveResult<T>`/`T | undefined`. Destructure accordingly — `const items = await service.list()`, never `const { items } = await service.list()`. Verify in [entities.signatures.md](entities.signatures.md).

`save(item)` dispatches: **insert** when `$id` is an unsaved sentinel — `null`, `undefined`, `"new"`, `""`,
or a **non-positive number** (`0`, or the negative temp ids owned/related collections mint for new rows) via
the exported `isNewEntity($id)` predicate, otherwise **update**; it returns `SaveResult` = `{ saved, isNew }`.
A model whose `$id` returns a bare `this.id` therefore inserts correctly at `id <= 0`. The `*Url` fields default off `config.api` and are **relative** to the
axios `baseURL` (set from app config).

> **Owned/related children can be built on an unsaved parent.** New child rows carry negative temp-id
> sentinels, so a form may add them _before_ the parent is saved — `save(parent)` inserts the parent and its
> pending children together. Don't gate "add a child" on saving the parent first. (A child modelled as a
> **first-class entity** with its own service does need the parent's real id, so it saves after — see
> [entities.patterns.md → Owned (child) collections](entities.patterns.md#owned-child-collections).)

> Each `*Url` is a **resource base**, not a literal endpoint: `update` appends `/{$id}` (`PUT {saveUrl}/{$id}`)
> and `remove` appends `/{$id}` (`DELETE {deleteUrl}/{$id}`). Leave them at `config.api` (or a sub-resource);
> never set `saveUrl` to a `/save` path or **updates 404 while inserts still pass** — a silent half-working trap.

> **`includes` doesn't apply to the Details GET.** The client `includes` flags (via
> `baseQueryParams.includes`) drive eager-loading on `list`/`search` only; the single-item `details(id)`
> endpoint (`GET {detailsUrl}/{id}`) ignores them and eager-loads **every include registered in the API's
> `e.Includes(...)`** (the OR of all flags — the server default, opt-out per entity). Set
> `baseQueryParams.includes` only to hydrate related collections in List/Search rows; a relation missing
> on the detail form means it isn't registered in the API's `Includes(...)` — fix the back-end, not the
> client.

#### Automatic query behaviour (`list` / `search`)

`fetchItems` builds the query string by merging `config.baseQueryParams` with the search object — **the search
object wins per key** (`{ ...baseQueryParams, ...so }`), so a request overrides a config default and
`includes: []` deliberately _suppresses_ one. That is the way to keep one view's fetch lean (a board that saves
on drag wants `Related()` to see `null`, not a stale array) without touching the slice config. Then:

- **`pageSize`** defaults to `config.defaultPageSize` (`DEFAULT_PAGESIZE` = 10). `pageSize: 0` returns **all
  rows, capped by the server's `MaxPageSize`** (100 under `UseDefaults()`) — send a positive `pageSize` to
  page, and for sets larger than `MaxPageSize` use the `Autocomplete` selector (server-side search).
- **`archived`** is passed through untouched; unset it is omitted and the server hides archived rows — in
  lists **and** in included collections. Ask for them with `ArchivedFilter.only` / `.included`.
- **`page`** is omitted from the URL when ≤ 1.
- keys starting with **`$`** are stripped (treat them as private/meta).
- array values serialize as **repeated keys** (`includes=A&includes=B`).
- a **`Date`** serializes as ISO-8601 with the local offset (`2026-07-29T07:00:00.000+02:00`) — the same
  wall-clock convention `dateExtensions.use()` gives request bodies, and what ASP.NET's `DateTime` binder
  expects. So a date filter can be typed `Date` (as the scaffolded `SearchObject` does) or as an ISO string;
  what it must not be is a hand-built `String(date)`, which yields `"Wed Jul 29 2026 …(CEST)"` and 400s.

> **`GET /search` (with `count`) is on every controller — simple and complex.** A simple entity pages just
> like a complex one: set `searchUrl: api + "/search"` and use `useSearchView`. _Complex_ adds only typed
> `?sortBy=`/`?includes=` and the batch `POST /list`/`POST /search` — not the count. Leave `searchUrl` at
> `config.api` (no `/search`) and `service.search()` falls back to `GET /` → `{ items }` with no `count`, so
> use `useListView` there. **Let dataset size drive the simple-vs-complex choice.**

#### Item hydration

- `processItem` converts the string fields **`created`** and **`lastModified`** into `Date` instances
  on every fetched/saved item. Other date fields are not auto-converted (convert them in `toEntity` —
  see [entities.patterns.md → Date hydration](entities.patterns.md#date-hydration)). To **bind** a date to
  an `<input type="date">`, don't hand-roll a bridge — use the ejectable `DateInput` skin, or the
  `dateInputString(date?)` formatter (`yyyy-MM-dd`) from `@regira/modules/vue/formatters`.
- `prepareItem` strips **top-level** `_`-prefixed properties before sending — use them for transient
  client-only state. The strip does **not** recurse, so a `_deleted` child row is still sent; drop such rows
  in a per-collection `prepareItem` override to delete them ([entities.patterns.md → Transient client-only
  fields](entities.patterns.md#transient-client-only-fields)).
- **Nested included relations are plain JSON objects** — only the root item runs through `toEntity`, so on an
  included relation the `EntityBase` getters (`$id`, `$title`, …) are `undefined`. Either bind the **plain DTO
  field** the API projects (`item.vehicle?.title`), or resolve the relation through the pool —
  `fromPool(item.vehicle)?.$title` — which rehydrates it into the shared reactive model so the getters work
  (the preferred path for display; see
  [entities.patterns.md → Resolving relations with `fromPool`](entities.patterns.md#resolving-relations-with-frompool)).
  What you must **not** do is read `item.vehicle?.$title` off the **raw** relation.
- ⚠️ **A nested COLLECTION needs lifting, and its dates are the part that bites.** `fromPool` answers the
  to-one case; for `?includes=Sessions` there is no pooled parent to route through, so `event.sessions[]`
  arrives as an array of plain JSON: no getters, no computed fields, and **every date is still a `string`**.
  `a.startTime?.getTime()` therefore throws _"getTime is not a function"_ — and Vue swallows it into an
  opaque `Unhandled error during execution of render function`, pointing nowhere near the cause. The scaffold
  hides this because `--rel` routes list-row relations through `fromPool()`; it surfaces the moment a custom
  view (an agenda, a timeline, a chart) touches a nested model directly. Give the child model a
  `static create(values?)` that normalizes its dates and lifts its own relations, and call it from the
  parent's `toEntity` — the same lifting the owned-collection recipe prescribes
  ([entities.patterns.md](entities.patterns.md#owned-rows-with-scalar-fields--the-inline-table)):

    ```ts
    override toEntity(item: object): Entity {
        const entity = item instanceof Entity ? item : Object.assign(this.createInstance(Entity as new () => Entity), item || {})
        // dates → Date, getters restored. Guarded: `toEntity` runs inside computeds, and an unconditional
        // map builds a fresh array every call — the `Maximum recursive updates exceeded` trap below.
        if (entity.sessions?.some((x) => !(x instanceof Session))) entity.sessions = entity.sessions.map((x) => Session.create(x))
        return entity
    }
    ```

    Also expect **`[NotMapped]` fields to be `null` on nested rows**: a back-end processor runs only in its own
    entity's read pipeline, so a count the child's own endpoint fills is absent when the child arrives nested.
    Render `null` as "unknown", not as `0`. Back-end mappers behave the same way — an after-mapper populating a
    `DisplayName` does not run on a nested projection, so compose such a label client-side from the fields the
    API actually projects.

---

## Decision Guidelines

### How much to build

**Default to the full reference scaffold — whatever the app type.** It's the path that scales to many
entities and stays production-ready (typed slices, server-side relation pickers, pooling, navigation), and
implementing the full building-block set is what makes it so. A storefront, demo, or embed still defaults to
the full scaffold: the **app type is not a downgrade signal**. A lighter tier is a sound choice only when the
**user asks for a lighter build** — pick it deliberately and state which tier and why.

> **The user has the final say.** These tiers are strong defaults, not rules — if the user wants a custom,
> hand-rolled, or creative UI, build it their way. The building blocks exist to make the default path scale, not
> to fence off other approaches.

| Tier                                    | You build                                                                                                              | Files you edit | Pick when                                                             |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | -------------- | --------------------------------------------------------------------- |
| **Full reference scaffold** _(default)_ | the per-entity slice (`config`/`data`/`overview`/`details`/`filter`/`selecting`/`setup`) + app shell (nav/layout/auth) | ~8 of ~23      | any app with no explicit lighter ask — storefronts and demos included |
| **Lean (generic views)**                | the data layer + the library's `EntityOverview` / `EntityForm` bound via slots; skip the slice scaffold                | ~4             | the user asks for a lighter build with standard lists                 |
| **Headless data-layer**                 | `initAxios` + `EntityServiceBase<T>` subclasses + your own views; no plugin stack                                      | 1–2            | the user asks for data-only access or a fully custom/bespoke UI       |

The full tier _generates_ ~23 files/entity but you edit only the **8** marked `(c)` — the other 15 are
`vue-tsc`-verified boilerplate you never touch. Compare the authored ~8, not the generated ~23, against lean's ~4.

Scaffold the full tier by copying the shipped slice template — don't hand-write the files:
`node node_modules/@regira/modules/_template/scaffold.mjs <Entity>` (see [slice template](entities.template.md)).
The lean tier pairs the same data layer with `EntityOverview` / `EntityForm`
([entities.setup.md → Lean tier](entities.setup.md#lean-tier-generic-views)).

> **The full scaffold is the low-risk default; hand-rolling views is the expensive path** — and this holds
> for small and non-CRUD apps too:
>
> - **It type-checks green out of the box — and more entities don't compound that.** Each slice is generated
>   and `vue-tsc`-verified independently, so a 5-entity app is not 5× the type-check risk of one. `scaffold.mjs
<Entity>` emits ~23 files; you edit only the **8** marked `(c)`, and the rest is verified boilerplate. File
>   count is not effort — you are not signing up to debug generated code.
> - **The relation pickers are the payoff.** `selecting/Autocomplete.vue` is a server-searchable picker: it
>   selects one row out of thousands without loading them all (a plain dropdown can't). Hand-rolled forms
>   re-hit that problem and rebuild the picker, modal, and pager the kit already ships.
> - **The plugin stack is a one-time app-shell cost, not per-entity.** It installs once in `main.ts`, and
>   every slice composable (`useForm`/`useFilter`/`useSearchView`) needs it — so going headless to "skip
>   plugins" is a false economy the moment you want one real form. The data layer, pooling, and preloader are
>   one tested whole; opting out of one piece means re-implementing the others.
> - **A non-grid UX is still the slice.** A category-tree filter, an active/inactive toggle, or a storefront
>   card list is normal customization of `Filter.vue` / `List.vue` / `ListItem.vue`.
> - **The look is yours — the behaviour isn't.** The scaffold fixes the _wiring_, not the _design_: freely
>   restructure the markup, columns, and layout and restyle the views. The **app-owned shell components**
>   (`layout/`, `entity-navigation/`, the views) go further — they are _default implementations_ you may
>   **replace outright** with your own design, keeping the capabilities in
>   [_Functionality contract_](#functionality-contract--what-a-custom-design-must-keep) available
>   ([entities.shell.template.md](entities.shell.template.md) → _Default implementations, not requirements_).
>   But a few behaviours live in the
>   components, not their CSS — navbar dropdowns (a Vue toggle, not Bootstrap JS), dashboard route-tiles, the
>   library `FormButtonsRow`, `_deleted` marking for rendered join/owned child rows (kept until save), and modal teleport into `#modals`.
>   Restyle the markup; keep the behaviour, or reuse the component. Per-file checklists:
>   [entities.template.md](entities.template.md) (slice), [entities.shell.template.md](entities.shell.template.md) (shell).
>
> **A lighter tier drops the scaffold, not the UI kit.** Lean and headless builds still import
> `vue/ui` (paging, loading, feedback, modal, tabs, autocomplete, confirm buttons), `vue/formatters`
> (dates/currency), and `treelist` (hierarchies) à la carte — no plugins or slice required. Hand-rolling
> those primitives is a deviation to declare, not part of going lean
> ([entities.setup.md → UI building blocks without the scaffold](entities.setup.md#ui-building-blocks-without-the-scaffold)).

### Functionality contract — what a custom design must keep

The scaffolded components are **default implementations**, free to replace with your own design
([shell](entities.shell.template.md#default-implementations-not-requirements) ·
[slice](entities.template.md)). What a replacement may **not** quietly drop is the _functionality_ —
these capabilities stay available however you render them:

| Capability                         | Must remain available                                                                                                                                                          | Default implementation                                                               |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| **Every entity manageable**        | browse/search, create, open/edit and delete each entity the app exposes, reached from navigation **or an equivalent affordance** (a tile, a launcher, an in-context link)      | `Dashboard` / `NavBar` + each slice's `Overview`                                     |
| **Navigation from the config map** | new slices appear on their own — nav built from `useNavigation()` (`$configs` + `config.json → navigation`), not a hand-written link list                                      | `useNavigation()` + `importDashboard` / `importNavbar`                               |
| **Scalable lists**                 | paging, a total count, and filter/search on any list that can outgrow a page — server-side, never a full fetch sliced in the client                                            | `useSearchView` + `Paging` + `ResultSummary` + `Filter` / `FilterAdv`                |
| **Create / edit**                  | a deep-linkable Details **page** per `config.isComplex: true`; the modal form only for a very basic entity                                                                     | `Details` route · `FormModalButton`                                                  |
| **Confirmed delete**               | deletes ask first; removing a persisted owned/join row marks `_deleted` (tinted, undoable until save) instead of splicing it                                                   | `ConfirmButton` · `InputSelectorInline` / `useListItemInput`                         |
| **Related records navigable**      | every displayed relation offers a way to open that record — a bare text label is the exception, not the default                                                                | the related slice's `FormModalButton` beside its pooled label (`--rel` generates it) |
| **Relation picking scales**        | pick one row out of thousands by server-side search, with create-on-the-spot and browse — never a load-every-row dropdown                                                      | `InputSelector` (autocomplete + `FormModalButton` + browse modal)                    |
| **Pooling stays intact**           | displayed relations resolve through the owning slice's `fromPool`, so editing a record anywhere relabels it everywhere; views use the pooled store service                     | `createStore` / `PoolCache`                                                          |
| **Feedback & loading**             | every save, error and busy state is visible — a `useForm` feedback object that nothing renders shows the user nothing                                                          | `<Feedback>` · `LoadingContainer`                                                    |
| **Auth (when requested)**          | the **full** account surface — sign in, forgot password, reset password, change password, sign out — and the login prompt shown to anonymous users instead of an unusable page | `vue/auth` (`auth.instructions` → _Account UI_)                                      |
| **Attachments**                    | upload, download and remove files on entities that own them                                                                                                                    | the `entity-attachments` slice + `FileDropZone`                                      |
| **Actions match the caller**       | when the API gates writes by role or row ownership, the UI offers only what that identity may do — an affordance whose 403 was predictable is a defect                         | `useAccess()` allow-list + `readonly` threaded through the slice                     |
| **i18n (when multilanguage)**      | a visible language selector, and translations for every `langs` entry                                                                                                          | `LangSelector` (`vue/lang`)                                                          |
| **Error routes**                   | 401 / 403 / 404 land on real views                                                                                                                                             | the shell's error views                                                              |
| **Responsive**                     | the main views stay usable at a mobile viewport                                                                                                                                | Bootstrap grid + `useScreen`                                                         |

**Unless the user asks otherwise.** This is the contract for the functionality you were asked to build,
not a mandate to build more: if the user wants a read-only view, no delete, a single-entity app, or drops
a capability outright, build what they asked. What this rules out is losing a capability **by accident** —
as a side effect of redesigning the component that used to provide it. Declare deviations; don't leave
them silent.

### Choosing a service base

| Use                         | Base                   | Why                                                                                                                                                                         |
| --------------------------- | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Normal server-backed entity | `EntityServiceBase<T>` | one request per operation against the API                                                                                                                                   |
| Small static / lookup list  | `JSONService<T>`       | fetches the list once, then filters/pages/saves in memory (shared cache keyed by `key`) — see [entities.patterns.md](entities.patterns.md#static--lookup-data--jsonservice) |

### Page vs modal — `isComplex`

`isComplex` decides where the entity's **own** create/edit form lives, and it is the lever behind the
"forms shouldn't be popups" rule:

| `isComplex`            | The entity's own form                                                                   | Set it for                                                                                                  |
| ---------------------- | --------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| **`true`** _(default)_ | a **Details page** (row-edit + "new" navigate there; tabs, deep-links, `showToggleAdv`) | every real business entity — anything with relations, an owned collection, or more than a handful of fields |
| **`false`**            | a **modal** (`FormModalButton`)                                                         | only a **very basic** entity — a few scalar fields, no relations, no tabs (a lookup/reference row)          |

Default to the page. A modal per real entity does not scale — no deep-link, no tab strip, cramped on
mobile — so reserve `isComplex: false` for the trivial case. This is **separate** from quick-editing a
_related_ entity: a chip/badge that opens a neighbour's `FormModalButton` is always fine, whatever that
neighbour's own `isComplex`. Both tiers still page the overview via `/search`; `isComplex` changes only the
form surface and form richness. (Back-end simple/complex is a licensing concept — aligning the two is
recommended but not enforced.)

> **Data-layer only?** On a user-requested headless build (no CRUD scaffolding), you can skip the heavy
> plugin stack: `initAxios({ api })` once + `EntityServiceBase<T>` subclasses + your own
> views. `service.search(so)` still merges `baseQueryParams`, strips `$`-keys, serializes arrays as
> repeated keys, and defaults `pageSize`. The reference apps all wire the full stack — this
> is the minimal variant, not the norm.
>
> When you construct `EntityServiceBase` directly, the `*Url` fields default from `config.api`.
> Model `id` as `id?: number` (an `id: null` would still serialize and a
> non-nullable int InputDto rejects it).

### Overview: `useListView` vs `useSearchView`

Both simple and complex controllers expose `/search`, so the choice is a fetch-shape decision, not a
question of which endpoint exists:

| Composable                           | Calls              | Expects            | Use when                                       |
| ------------------------------------ | ------------------ | ------------------ | ---------------------------------------------- |
| `useSearchView` + `useRouteOverview` | `service.search()` | `{ items, count }` | counted paging + filters (the usual list UI)   |
| `useListView`                        | `service.list()`   | `Array<T>`         | a plain list is enough — no total count needed |

Both expose the same overview surface (`items`, `pagingInfo`, `itemsCount`, `isLoading`, `applySave`,
`handleSave`, `handleRemove`); only the fetch + handler names differ (`searchHandler` /
`debouncedSearchHandler` vs `listHandler` / `debouncedListHandler`).

**Neither is coupled to a slice or a route.** `useSearchView({ service, searchObject, defaultPageSize })`
takes a service and a search object and nothing else — use it in any view that lists entities, including a
hand-written one with its own layout, its own query shape and its own URL (a storefront catalogue, a picker,
a report). Only `useRouteOverview` reaches for `vue-router` and assumes the slice's route names; drop it and
sync the URL yourself while keeping the fetch, paging, loading and feedback plumbing. Hand-rolling a
`service.search()` loop because the view is not a scaffolded `Overview.vue` is a deviation with nothing to
gain.

⚠️ **Neither fetches on mount.** The scaffolded `Overview.vue` gets its first search from `useRouteOverview`,
a *separate* composable — take `useSearchView` alone and the initial fetch is yours. Trigger it with
`onAuthenticated(() => searchHandler(true))`, which is also the correct token timing (views mount before a
stored token is validated), and do **not** add an `onMounted` fetch beside it. A hand-written view that only
watches its filters renders its empty state forever, against data that is plainly there.

> `searchObject` goes **in** as a plain instance (`new SearchObject()`) and comes back **out** as a `Ref<SO>`
> — the ref is what the view binds and mutates. Passing a ref in is only caught when you write the type
> arguments (`useSearchView<Product, SearchObject>({ … })` → *TS2559: has no properties in common with type
> 'SearchObject'*); let them infer and `SO` binds to the ref itself, so it compiles and hands back a
> `searchObject` a level deeper than the view expects.

> **→ See:** [entities.signatures.md](entities.signatures.md#5-overview-composables) — exact composable signatures.

---

## App Creation Workflow

Standing up a new app — deps, runtime config, the shared axios, the plugin install order, the app shell —
is a one-time **project-setup** task. Author `package.json` from the known-good dependency set
([entities.setup.md → Install](entities.setup.md#install)), `npm install`, then scaffold everything else in
one command: `node node_modules/@regira/modules/_template/scaffold.mjs --shell` (`--no-auth` for a no-auth app).

> **→ See:** [entities.shell.template.md](entities.shell.template.md) — every generated shell file ·
> [entities.setup.md](entities.setup.md) — the full project template (`main.ts`, `App.vue`,
> router, plugin install order, required-vs-optional plugins, running with/without auth, app shell).

---

## Entity Implementation Workflow

Every entity is a self-contained vertical slice under `src/entities/<name>/` — the **same folder set for
every entity** (a lookup keeps every folder, just with thinner files).

> **→ See:** [entities.setup.md → Entity slice anatomy](entities.setup.md#entity-slice-anatomy) — every
> file with its one-line purpose and the `(c)` markers for the files you customize per entity.
>
> **→ See:** [entities.template.md](entities.template.md) — a **blank scaffold**: the file tree plus a
> placeholder skeleton for each `(c)` file to fill in (use this to start a new slice from nothing).
>
> **→ See:** [entities.examples.md](entities.examples.md) — start with the **simple** `UnitType` slice
> (every file), then the **standard** `Product` slice (what a richer entity adds).
> For the complex case (attachments / many-to-many link / owned child collection) see
> [entities.advanced.example.md](entities.advanced.example.md) (`Vehicle`); trees and the
> `useOwnedCollection` composable are recipes in [entities.patterns.md](entities.patterns.md).

### Minimal slice (happy path)

Most entities follow the same 12 steps below — one file per step. **Scaffold all of them at once** with
`node node_modules/@regira/modules/_template/scaffold.mjs <Entity>`, then fill the `(c)` files in this order.
The folder, client route and `api` path derive as the kebab-case plural of the class name, matching the
conventional `[Route(...)]`; pass `--api <path>` when the server exposes the resource under a different name,
and `--rel <Related>` per to-one relation shown in the overview — it generates the pooled column and the model
fields, and leaves `baseQueryParams` empty because a to-one on every row should be eager-loaded server-side
(`e.Includes(...)`), not requested per call. A differently-named FK takes a trailing `--as <field>`
(`--rel Employee --as assignedToEmployee` binds `assignedToEmployeeId`/`assignedToEmployee`, still the Employee slice).
A **lookup** entity keeps the folders but drops the list UI (omit the views and `createRoutes()`; the
`install` only registers the service/icon and `$configs[Entity.name]`; `SearchObject` may be empty; consider
`JSONService` for static data):

> **The files you actually edit** are the eight marked `(c)`: `data/Entity.ts`, `config/config.ts`,
> `filter/SearchObject.ts`, `filter/FilterAdv.vue`, `overview/List.vue`, `overview/ListItem.vue`,
> `details/Form.vue`, `selecting/SelectorList.vue`. Everything else is verbatim boilerplate the scaffold writes;
> a **lookup** drops the overview trio (`List`/`ListItem`/`FilterAdv`).
>
> **Edit the `(c)` views in lockstep with the model.** The scaffold seeds them binding a placeholder
> `title` / `searchObject.title` — whenever you change `Entity.ts` or `SearchObject.ts`, rebind
> `Form.vue` / `FilterAdv.vue` / `List(Item).vue` in the same pass, or the next `vue-tsc` build fails on
> the stale placeholder bindings.

1. **Model** — `data/Entity.ts` (c): `extends EntityBase` with concrete fields; `override get $id()`
   (`this.id || "new"`) and `override get $title()`. Export the class, `export const Entity = …`, and a default.
   ⚠️ API-projected fields must be plain assignable properties — a class getter named after a JSON key makes
   `Object.assign` hydration throw at runtime (`Cannot set property … which has only a getter`); `vue-tsc`
   stays green. Keep derived values in `$`-getters or names the API never serializes.
2. **Config** — `config/config.ts` (c): a `const config: IConfig` — `key`, `routePrefix`, `api`, the `*Url`
   fields, `defaultPageSize`, `icon`, titles, and `baseQueryParams` — usually `{}`; add
   `{ includes: ["Lines"] }` only for a collection the API gates behind its named `[Flags]` enum.
3. **Service** — `data/EntityService.ts`: `extends EntityServiceBase<Entity>`; ctor `super(axios, config)`;
   implement **only** `toEntity(item)` (override `prepareItem` / add bespoke endpoints if needed).
4. **Store** — `data/store.ts`: a Pinia store around `createStore<Entity>(get(Entity.name)!, Entity.name)`.
   Views use the **pooled** `service` from this store, never the raw IoC service. The pooled handler exposes
   the full `IEntityService` surface (`details` / `list` / `search` / `searchUnion` / `save` / `remove` —
   `save` dispatches insert vs update) plus the cache accessors (`get` / `getMany` / `set` / `setMany` /
   `fromPool` / `fromCache`) — exact shapes in [entities.signatures.md §7](entities.signatures.md#7-pooling-entity-cache).
5. **Search object** — `filter/SearchObject.ts` (c): `extends SearchObjectBase` with filter fields.
6. **Filter** — `filter/`: `Filter.vue` (inline bar + advanced-modal shell), `FilterInline.vue`,
   `FilterAdv.vue` (c) — all call `useFilter`.
7. **Overview** — `overview/`: `Overview.vue` (`useSearchView` + `useRouteOverview` → counted `/search`, so
   the overview pages for simple **and** complex entities; swap to `useListView` only for a lookup that needs
   no count) + `List.vue` (c) + `ListItem.vue` (c).
8. **Details & form** — `details/`: `Details.vue` (`useDetails`, loads `:id`, hosts `Fiche`/`Form`),
   `Form.vue` (c) (`useForm`), `FormModalButton.vue` (`useModal`). **If the entity owns a collection, its
   editor ships here too** (chips or table — see the form checklist below), not as a later add-on.
9. **Selecting** — `selecting/`: the relation-picker set built on the store; only `SelectorList.vue` (c) is
   per-entity, the rest is verbatim boilerplate. See
   [entities.patterns.md](entities.patterns.md#entity-selector-relation-picker--selecting).
10. **Barrel** — `index.ts`: re-export the slice's public API (config, Entity, service, views, Selector, plugin).
11. **setup.ts**: `createRoutes()` (Overview + Details with `Fiche`/`Form` children), `addServices()`,
    `addIcons()`, and a default plugin whose `install(app, { routes })` pushes routes, registers
    services/icons, and sets `app.config.globalProperties.$configs[Entity.name] = config`.
12. **Register** — add the plugin to the `plugins` array in the `src/entities/index.ts` aggregator
    ([entities.setup.md → App shell](entities.setup.md#app-shell--components-infrastructure--styling)).

Keep every view thin: bind the refs the composables return.

### Form design checklist — built-ins first

Run through this before writing any `Form.vue`; each row is a shipped composable/component, and
hand-rolling one is a deviation to declare (recipes: [entities.patterns.md](entities.patterns.md)):

| The form has…                                                                                | Reach for                                                                                                                                                                                                                                                             |
| -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2+ related collections / many fields                                                         | `TabContainer` + `Tab.create` tabs — not one long column or a fixed-width table                                                                                                                                                                                       |
| an editable child/join **relation** (rows link to another entity)                            | **`InputSelectorInline`** chips (`_deleted` mark + `exclude`) + a `prepareItem` filter — never the hard-removing `Selector`, never per-row `DELETE` calls                                                                                                             |
| editable owned rows with **scalar fields** (nothing to pick)                                 | an inline **table** via `useOwnedCollection` (add-row + `_deleted`) + the same `prepareItem` filter — [recipe](entities.patterns.md#owned-rows-with-scalar-fields--the-inline-table)                                                                                  |
| rows carrying **both** — a relation **and** scalars (quantity, sort order, role, valid-from) | the **table**, with an `InputSelector` in the relation column. Very common on join rows; the chips form has nowhere to put the scalars                                                                                                                                |
| **files / pictures** on the entity                                                           | the `entity-attachments` slice in a tab: `FileDropZone` drop, offline add/rename/remove (`_deleted`), flush on save via `useAxios().upload` — never `FileHelper.send` — [recipe](entities.patterns.md#attachments-files--offline-add--rename--remove-confirm-on-save) |
| a related entity displayed anywhere                                                          | that entity's **`FormModalButton`** (chip/badge that opens its form in a modal) — a bare label is the exception, not the default                                                                                                                                      |
| "add related entity" controls                                                                | `InputSelector` with `:filter-defaults="{ exclude: currentIds }"` (hides already-added rows)                                                                                                                                                                          |
| any save/remove path                                                                         | a rendered `<Feedback :feedback="feedback" />` — `useForm`'s own, or `useFeedback()` for custom calls                                                                                                                                                                 |
| relation labels                                                                              | `fromPool(item.relation)?.$title` via the sibling store — not the raw DTO field                                                                                                                                                                                       |
| tricky state while developing                                                                | `<Debug :modelValue="…" />` — self-gates on `$isDebug`, inert in production                                                                                                                                                                                           |
| breakpoint-dependent layout                                                                  | CSS/flex first; `useScreen` when the structure itself changes (e.g. dropping a tab)                                                                                                                                                                                   |
| any component you drop in                                                                    | **deliberate spacing** — wrap fields in `FormSection`, give each `mb-2`/`mb-3` + margins; scaffolded markup ships tight on purpose (overriding a Bootstrap `!important` utility needs `!important` back)                                                              |

> **An owned collection is done only when it's editable.** If the parent's back-end `e.Related(...)` owns a
> collection, its add/edit/remove editor (the chips or table row above) is **part of this slice** — shipping the
> collection read-only (badges, a static list) is an _incomplete_ slice, not a valid simplification. Build it in
> Step 8 alongside the form; the `_deleted` mark + `prepareItem` filter is what makes one parent `save()` persist
> adds, edits, and removals together. For the scalar-row table, `scaffold.mjs <Entity> --owns <Child>` generates
> the editor sub-slice and prints the three wiring lines (field, `<…Overview>`, `prepareItem` filter).

> **Verify after wiring a slice:** the service resolves (`get<IEntityService>(Entity.name)` non-null after
> startup); the overview lists and pages (archived rows hidden unless `searchObject.archived` is set);
> save round-trips (new `$id === "new"` inserts, existing updates — bind to `saved`); routes resolve
> (`${key}Overview`, `${key}Details` → `${key}Form`/`${key}Fiche`). Then **drive each feature at runtime** — a
> green `npm run build` only proves it compiles. Against the live API, exercise every entity once, don't just
> load it: **open a navbar dropdown**, **save the same record twice** (a `Related()`/m2m re-sync is the classic
> 2nd-save 500), **toggle a status flag**, **apply a filter and reopen it** (multi-value restore), and **delete
> a referenced row** (FK-block feedback). Wiring/contract bugs surface only here — `vue-tsc` never exercises them.

> **Never guess a composable's shape — the signatures are indexed (mind the module split).** Feedback, tabs,
> breakpoints, loading and `DefaultModal` live in **`ui.signatures.md`** (`useFeedback` → `pending`/`success`/
> `fail`/`reset` — there is no `loading()`; `Tab.create("form", { title: translate("form"), icon })`, where
> `translate` comes from `const { translate } = useLang()` in **`@regira/modules/vue/lang`** — the first
> arg seeds `key` _and_ `title`, and **`TabNavigation` renders `tab.title` verbatim, no `$t()`**, so always
> supply a translated `title` in `values`; `useScreen` → `screen.isLarge`);
> `useForm`/`useSearchView`/`useModal`/`FormModalButton`/`usePreloader` live in **`entities.signatures.md`**.
> Pull the signature (or `get_type`) before wiring — don't reverse-engineer it from the `.d.ts` by trial.

---

## App startup (wiring order)

The plugin install order is fixed (verified identical across the reference apps). The full `main.ts` lives in
[entities.setup.md → Bootstrap](entities.setup.md#bootstrap--maints); the order is:

```
createPinia → appPlugin (vue/app) → servicesPlugin (vue/ioc; adds axios + PoolCache, creates $configs)
  → iconPlugin → screenPlugin → isOnlinePlugin → debugPlugin → loadingPlugin → feedbackPlugin
  → langPlugin → directives (focus/grow/clickOutside)
  → entityPlugins (collect routes) → routerFactory([...entityRoutes]) → preloaderPlugin → authPlugin
  → (app-local userPlugin) → mount → whenAppReady()
```

The entities-specific constraints to remember: the `$services` / `$configs` / `$icons` globals must
already exist (Pinia + `appPlugin` + `servicesPlugin` + `iconPlugin` installed) **before** any entity
plugin installs; the router must be built **after** the entity plugins have collected their routes; and
`authPlugin` installs **after** the router (it reads `$router` for its route guard).

## Route & key conventions

- Route names derive from **`config.key`**: `${key}Overview`, `${key}Details`, `${key}Fiche`, `${key}Form`.
- IoC service and `$configs` map are keyed by **`Entity.name`** (the class name). By convention
  `config.key === Entity.name`, but they are conceptually distinct.

---

## Feature recipes → entities.patterns.md

Load [entities.patterns.md](entities.patterns.md) when implementing one of these:

- **Soft delete / archived rows** — `archived` on the search object; `handleRestore` in the form.
- **State toggle (activate/deactivate)** — a dedicated endpoint + custom service method for a visible status flag.
- **Date hydration** — convert non-`created`/`lastModified` date fields in `toEntity`.
- **Transient client-only fields** — `_`-prefixed props (e.g. `_deleted`) stripped before save.
- **Paging** — `pagingInfo` + `itemsCount`; `pageSize: 0` returns all rows capped by the server's `MaxPageSize` (send a positive `pageSize` to page).
- **Union search** — `searchUnion` (OR across filters).
- **Custom endpoints on a service** — reach the raw `get<EntityService>(Entity.name)`, not the pooled store.
- **Entity selector (relation picker)** — the `selecting/` set for picking related entities in forms; to bind a **many-to-many join** to a multi-select, see [entities.patterns.md → Editing a many-to-many join](entities.patterns.md#editing-a-many-to-many-join--use-inputselectorinline). A relation is entity-backed even when the set is small — prefer the `Selector` (it searches server-side and scales past one page).
- **Overview list layout** — responsive columns so the list row fits the viewport ([entities.patterns.md](entities.patterns.md#overview-list-layout-avoiding-horizontal-scroll)).
- **Feedback for custom saves** — `useFeedback` + `<Feedback>` around any `service.save()`/`remove()` you call outside the standard composables ([entities.patterns.md](entities.patterns.md#feedback-for-custom-saves-outside-useform)).
- **Tabbed forms** — split a heavy form into `TabContainer` tabs, driven by the form's `initialTab` + URL-hash nav ([entities.patterns.md](entities.patterns.md#tabbed-forms)).
- **Debug panel** — the global `<Debug>` component + `$isDebug`/`$setDebug` for a dev-only payload dump ([entities.patterns.md](entities.patterns.md#debug-panel-dev-only)).
- **Owned (child) collections** — the numbered `InputSelectorInline` recipe (chips, `_deleted`, `exclude`, `prepareItem`); `useOwnedCollection` / `useOwnedModal` / `useListInput` for heavier master-detail.
- **Attachments (files)** — the `entity-attachments` slice (`scaffold.mjs <Entity> --attachments` scaffolds it and wires that entity up): offline add (drop zone) / rename / remove, all confirmed on the parent's save (`FileDropZone` + `useAxios().upload` → `POST {api}/{id}/files`, field `file`).
- **Restyling & overriding the built-ins** — CSS hooks, component wrappers, app-wide modal replacement; the default styling is deliberately plain and **improving it is encouraged**.
- **Hierarchical (tree) entities** — `useTree` + `useDragDrop`.
- **Static / lookup data** — `JSONService`.
- **Pooling & the shared cache** — `createStore` / `PoolService` / `PoolCache`.
- **Permission-gated UI** — mirror the API's write tiers so the SPA offers only what the caller may do: a `useAccess()` allow-list, `readonly` threaded through the slice, and a locked form that says why.
- **Navigation from the config map** — `importDashboard` / `importNavbar` / `buildNavigationTree`.
- **Custom query params (the `$` rule)** — `$`-prefixed keys are stripped before the request.
- **Type the client from the API's OpenAPI** — generate DTO types and feed them into the models.

## Domain blueprints → entities.blueprints.md

SPA counterparts of the back-end domain blueprints (`get_package(id: "Regira.Entities", section: "blueprints")`). Load [entities.blueprints.md](entities.blueprints.md) when building one of these:

- **Labels editor** — draggable inline label/tag rows in the owner's form; client-side type detection; `_deleted` + `prepareItem` strip.
- **Tenant switcher** — active tenant derived from the JWT `tenant` claim; switching = `authStore.refresh({ tenantId })`.
- **Family tree view** — flat rows from the tree endpoints → `TreeList` → mutually recursive `TreeView ⇄ TreeViewItem` components with drag-move.
- **Polymorphic entity** — one flattened client class + discriminator field over a TPH back-end (Person/Organization parties).
- **Contact data & address editors** — phone/email rows (type-sniffed `tel:`/`mailto:` actions) and address lists (`GMapButton`, shared formatter) as owned-collection editors in the owner's form.

---

## Quick reference

| I want to…                         | Use                                                              |
| ---------------------------------- | ---------------------------------------------------------------- |
| Define a model                     | `extends EntityBase` (`$id`, `$title`)                           |
| Call the API                       | `extends EntityServiceBase<T>` → implement `toEntity`            |
| Static lookup list                 | `extends JSONService<T>`                                         |
| List + search + URL sync (counted) | `useSearchView` + `useRouteOverview`                             |
| Plain list (no count)              | `useListView`                                                    |
| Load one item                      | `useDetails`                                                     |
| Create/edit/delete form            | `useForm` (modal: `useModal`)                                    |
| Tabbed form                        | `TabContainer` + `Tab.create` (`initialTab`)                     |
| Debug panel (dev-only)             | `<Debug :modelValue>` · `$isDebug` / `$setDebug`                 |
| Filter UI                          | `useFilter`                                                      |
| Reactive shared cache              | `createStore` (Pinia store)                                      |
| Owned/join chips (marked delete)   | `InputSelectorInline` (+ `prepareItem` filter)                   |
| Child collections                  | `useOwnedCollection` / `useOwnedModal` / `useListInput`          |
| File attachments (offline staging) | `entity-attachments` slice: `FileDropZone` + `useAxios().upload` |
| Hierarchy                          | `useTree`                                                        |
| Navigation from configs            | `importDashboard` / `importNavbar` / `buildNavigationTree`       |
| Lean overview/form (no scaffold)   | `EntityOverview` / `EntityForm`                                  |

---

## Gotchas

### Gotchas — loading & rendering

| Symptom                                                             | Cause                                                                                                                                                                                                                                                                                                                       | Fix                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `v-for` over `items` throws a null error on first render            | Overview refs are **lazy** — `items` / `itemsCount` are `undefined` until `searchHandler`/`listHandler` runs (the types say so: `Ref<Array<T> \| undefined>`)                                                                                                                                                               | Guard every template use: `v-for="x in items ?? []"`, `:count="itemsCount ?? 0"`, `(items?.length ?? 0) === 0`                                                                                                                                                                                                                                                                                                        |
| `Fiche`/`Form` receive `undefined`                                  | `useDetails().item` is `undefined` until the `onMounted` load resolves                                                                                                                                                                                                                                                      | Gate the child: `<RouterView v-if="item" v-model="item" …>`                                                                                                                                                                                                                                                                                                                                                           |
| Nested collections empty on the overview (List/Search)              | On complex entities the API loads a gated navigation only when the request sends `?includes=`                                                                                                                                                                                                                               | Name the flag in `config/config.ts` — `baseQueryParams: { includes: ["Lines"] }` — List/Search then send it on every request; `["All"]` is the last resort, since it pulls every gated collection onto every row. **Complex API entities only** — a **simple** entity ignores `?includes=`, so eager-load on the back-end (`e.Includes(...)`) instead, which is also the right answer for a to-one shown on every row |
| Nested collection empty on a detail/edit form                       | Details ignores `?includes=` and loads what the API registered in `e.Includes(...)` — the relation isn't registered there (or the API opted out of Details-loads-all)                                                                                                                                                       | Register the relation in the API's `Includes(...)` (back-end), or fetch children with a dedicated call                                                                                                                                                                                                                                                                                                                |
| `Maximum recursive updates exceeded`, blamed on a library component | A `toEntity` that mutates unconditionally — a date (`item.created = new Date(item.created)`) or, just as often, an owned-collection lift (`item.lines = item.lines?.map(Line.create)`), where the fresh array is the mutation. It runs inside a computed (`FormModalButton.modalTitle`/`fromPool`), so it retriggers itself | Make `toEntity` **idempotent** — return the instance untouched when it already is one, and guard every conversion: `typeof x === "string"` for dates, `lines?.some((row) => !(row instanceof Line))` before reassigning a collection                                                                                                                                                                                  |

### Gotchas — saving

| Symptom                                                            | Cause                                                                                                                                                        | Fix                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Save result binds to nothing / wrong shape                         | Binding to `item` instead of `saved`                                                                                                                         | `SaveResult` exposes `saved` (not `item`); `SaveResult` and the raw server `SavedResult` differ — bind to `saved`                                                                                                                                                                                                                                                                                                                                                                            |
| New entity not treated as insert                                   | `$id` returns a non-sentinel value for a fresh model                                                                                                         | `save()` inserts when `$id` is `null`/`undefined`/`"new"`/`""` or `≤ 0` (`isNewEntity` — covers the negative temp ids of new related rows), so a bare `this.id` getter is fine (`this.id \|\| "new"` is the convention); new-entity routes use `:id = "new"`                                                                                                                                                                                                                                 |
| Updates 404 while inserts pass                                     | `saveUrl` set to a literal `/save` path                                                                                                                      | Leave `*Url` at `config.api` (a resource base); `update`/`remove` append `/{$id}` themselves                                                                                                                                                                                                                                                                                                                                                                                                 |
| `update`/`remove` hit `/{id}/undefined` (400/404 that type-checks) | Spreading a model (`{ ...item }`) copies only own-enumerable props, dropping the `$id`/`$title` **prototype getters**; an `as Entity` cast hides it          | Never spread a model — mutate the instance (`item.x = …; await service.update(item)`). `update`/`remove` throw a named error when `$id` is missing                                                                                                                                                                                                                                                                                                                                           |
| Guid/string key: `selecting/*` type errors, or a create that 400s  | The scaffolded **entity slice** is key-generic (`idValue?: number \| string`) and `insert()` drops an unsaved key from the payload, so neither should happen | Keep `id: string = ""` on the model (`strictPropertyInitialization`) and `$id → this.id \|\| "new"`. If a hand-written component still declares `number`, widen it to `number \| string` — that is the whole change. ⚠️ **Owned child rows stay int-keyed**: `useOwnedCollection<T extends IEntity & { id: number }>` mints negative temp ids, so a `--owns` sub-slice keeps `id: number = 0` even under a Guid-keyed parent (the child's own key is server-side and never picked in the UI) |

### Gotchas — filtering, paging & list layout

| Symptom                                                                                | Cause                                                                                                                                                                                                                                | Fix                                                                                                                                                                                                                                                                                                             |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Advanced filter shows results that contradict its own controls                         | `useFilter`'s `handleUpdate` isn't bound to the input. Native `<input>`s can still work by accident (attribute fallthrough on the filter's root element), custom components never do                                                 | Bind it explicitly on **every** input: `@change="handleUpdate"` on a native input, `@select`/`@update:modelValue="handleUpdate"` on `InputSelector` / `NullableCheckBox` / `DateInput`. Not a deep `watch` — that refetches per keystroke                                                                       |
| Archived rows missing from a list, a count, or an included collection                  | the server hides them unless the search object asks otherwise                                                                                                                                                                        | Set `archived` on the search object: `ArchivedFilter.only` (recycle bin) or `.included` (both)                                                                                                                                                                                                                  |
| A deleted row 404s when its details page is opened, so it can never be restored        | `GET /{id}` 404s on an archived row; a hand-rolled loader omitted `archived`                                                                                                                                                         | `useDetails`/`useModal` already load archived-inclusive; a custom loader needs `service.details(id, { archived: ArchivedFilter.included })`. Also keep `isArchived` on the entity/DTO — hide the field in the form, never drop it                                                                               |
| Pager-less overview shows only 10 rows                                                 | `defaultPageSize` of `0`/unset falls back to 10 in the overview composables                                                                                                                                                          | Set `defaultPageSize` to a large number (up to the server's `MaxPageSize`); `pageSize: 0` at the service layer returns all rows capped by `MaxPageSize`, and larger sets use the `Autocomplete` selector                                                                                                        |
| Overview total wrong / count missing                                                   | `useSearchView` bound to an endpoint that returns `{ items }` without `count`                                                                                                                                                        | Use `useListView` for a plain list, or read from the counted `/search` ([composables](#overview-uselistview-vs-usesearchview))                                                                                                                                                                                  |
| Overview list row scrolls horizontally / the page scrolls sideways                     | A fixed `width` on a `.row` child: Bootstrap makes `.row > *` `flex-shrink: 0` with `.75rem` border-box padding, so `width: 3rem` leaves 24px for a 42px `.btn` — and nothing shrinks. Or too many columns visible at one breakpoint | Bare `col-auto` for action cells (≥ 4.5rem if you must set a width), `col text-truncate` for text, and reveal extra columns progressively (`d-md-block` → `d-lg-block` → `d-xl-block`). See [entities.patterns.md → Overview list layout](entities.patterns.md#overview-list-layout-avoiding-horizontal-scroll) |
| An autocomplete dropdown is clipped, or `position: sticky` stops working inside a list | An `overflow-x` on the list container: with `overflow-y: visible` it computes to `auto` on **both** axes, creating a scroll container                                                                                                | Don't set `overflow` on `.entity-list` — the library rule deliberately omits it. Make the row fit instead; opt one list in with the shipped `.entity-list--scroll-x`                                                                                                                                            |

### Gotchas — collections, relations & feedback

| Symptom                                                           | Cause                                                                                  | Fix                                                                                                                                                                                                                                                                                                       |
| ----------------------------------------------------------------- | -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Deleting a chip/row removes it instantly (no undo, no `_deleted`) | The multi-`Selector` hard-removes on its delete icon — it cannot deliver marked-delete | Render join/owned rows with `InputSelectorInline` (toggle `_deleted`, filter in `prepareItem`) — [entities.patterns.md → owned-m2m recipe](entities.patterns.md#the-owned-m2m-recipe--inputselectorinline)                                                                                                |
| A checkbox/radio list used to pick related entities (m2m)         | An entity relation modelled like a serviceless enum                                    | Prefer the entity `Selector` + join bridge for service-loaded relations — even a small closed set (it scales server-side); a checkbox group suits a serviceless enum. See [entities.patterns.md → Editing a many-to-many join](entities.patterns.md#editing-a-many-to-many-join--use-inputselectorinline) |
| A custom save/toggle/checkout shows no feedback                   | Only `useForm`/`useSearchView`/`useDetails` auto-drive feedback                        | Drive your own `useFeedback()` + `<Feedback>` around the direct `service.save()`/`remove()` call. See [entities.patterns.md → Feedback for custom saves](entities.patterns.md#feedback-for-custom-saves-outside-useform)                                                                                  |
| Standard form/details save shows no confirmation                  | The composable drives `feedback`, but the view renders no `<Feedback>`                 | Render `<Feedback :feedback="feedback" />` (the scaffolded `Form.vue`/`Details.vue` do; a hand-rolled form must add it)                                                                                                                                                                                   |

### Gotchas — imports, types & services

| Symptom                                                                                                                                                                       | Cause                                                                                                                                                                                                                                                                                                                                                                     | Fix                                                                                                                                                                                                                                                                                                                                                                         |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Import not found / wrong path                                                                                                                                                 | Guessed an import specifier                                                                                                                                                                                                                                                                                                                                               | Look it up in [entities.namespaces.md](entities.namespaces.md) — never guess                                                                                                                                                                                                                                                                                                |
| Wrong method name/params/return                                                                                                                                               | Guessed a signature                                                                                                                                                                                                                                                                                                                                                       | Look it up in [entities.signatures.md](entities.signatures.md)                                                                                                                                                                                                                                                                                                              |
| Custom service method not found on the store `service`                                                                                                                        | The store's `service` is a **pooled** `PoolService` (only the `IEntityService` surface)                                                                                                                                                                                                                                                                                   | Resolve the raw service: `get<EntityService>(Entity.name)` (registered under `Entity.name`)                                                                                                                                                                                                                                                                                 |
| `TS1284: An export default must reference a value` on a type-only module                                                                                                      | `verbatimModuleSyntax` (prescribed by the shell tsconfig) forbids `export default X` when `X` is an `interface`/`type`                                                                                                                                                                                                                                                    | `export type { X as default }` — and import it as `import type X from "./x"`                                                                                                                                                                                                                                                                                                |
| Attachment images/thumbnails 401 in `<img>` tags                                                                                                                              | `<img src>` sends no `Authorization` header; the download endpoint is guarded                                                                                                                                                                                                                                                                                             | Back-end concern: expose the download anonymously — `Regira.Entities` → `entities.patterns` → _Public (anonymous) attachment downloads_                                                                                                                                                                                                                                     |
| `TS2554: Expected 1 arguments, but got 2` on template lines the scaffold wrote (`@save="$emit('save', $event)"`), after adding a custom event to an **`OverviewEmits`** slice | ⚠️ **`OverviewEmits` is the one contract declared as tuple properties** (`save: [SaveResult<T>]`); every other one (`FormEmits`, `FilterEmits`, …) is a call-signature interface. `defineEmits<T>` maps tuple properties only while `T` has no call signature of its own, so adding one — by intersection or inside the interface body — drops the seven inherited events | **Match the shape you extend.** Call-signature contracts take `(e: "reload"): void`, as the library's own `FormModalEmits extends FormEmits` does. `OverviewEmits` alone takes a tuple member: `interface Emits extends /* @vue-ignore */ OverviewEmits<Entity> { "reload": [] }` — arguments go in the array (`"picked": [Entity]`) — then the bare `defineEmits<Emits>()` |

> **Dormant code — do not use:**
>
> - `@regira/modules/entities` (the `src/entities/*` folder) is fully commented-out; its `package.json`
>   `./entities` export resolves to an empty module. Use `@regira/modules/vue/entities`.
> - `EntityDescriptor` (`/config`) is unused by the demos — the plain `IConfig` + IoC + `$configs`
>   wiring above is the supported path.
> - `src/identity/*` is a separate legacy stack, unrelated to `vue/auth`.

---

## See also

- [entities.setup.md](entities.setup.md) — new-project template + app shell · [entities.namespaces.md](entities.namespaces.md) — imports ·
  [entities.signatures.md](entities.signatures.md) — signatures
- [entities.template.md](entities.template.md) — blank slice scaffold · [entities.shell.template.md](entities.shell.template.md) — app-shell scaffold (`--shell`) ·
  [entities.examples.md](entities.examples.md) — simple (`UnitType`) + standard (`Product`) slices ·
  [entities.advanced.example.md](entities.advanced.example.md) — complex slice (`Vehicle`) ·
  [entities.patterns.md](entities.patterns.md) — feature recipes
