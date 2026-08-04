# Config

`IConfig` is the per-entity configuration object — the front-end "descriptor". One `const config: IConfig`
per entity drives its service, routes, and navigation.

## Fields

```ts
const api = "/products"
const config: IConfig = {
    key: "Product", // route-name prefix + icon key
    routePrefix: "products", // URL path segment
    isComplex: true, // entity with child collections / heavier form
    baseQueryParams: { includes: ["Facets"] }, // merged into every list/search
    initialQuery: { isRoot: true }, // route query for the GENERATED nav link only — not a request default
    overviewTitle: "products",
    detailsTitle: "product",
    description: "product.description",
    icon: "bi bi-box-seam",
    defaultPageSize: 10,
    api,
    detailsUrl: api,
    listUrl: api,
    searchUrl: api + "/search", // dedicated search endpoint; use `api` when there is none
    saveUrl: api,
    deleteUrl: api,
}
```

`IConfig extends Record<string, any>`, so apps may add extra fields (e.g. `id`, `nav`) without type errors.

`defaultPageSize` seeds each overview's page size; the overview composables fall back to 10 when it is `0`
or unset. `pageSize: 0` at the service layer (`service.list`/`search`) returns **all rows, capped by the
server's `MaxPageSize`** (100 under `UseDefaults()`); for a pager-less "show all" overview set
`defaultPageSize` to a large value up to that cap. For datasets larger than `MaxPageSize`, use the
`Autocomplete` selector (server-side search) rather than a truncated page.

## URL derivation

The `*Url` fields are **relative** paths resolved against the axios `baseURL` (set from app config at
startup). The common convention is to base them all on `api`, with `searchUrl` pointing at a dedicated
`/search` endpoint when one exists. A service builds, e.g., `GET {listUrl}?{query}` and
`PUT {saveUrl}/{$id}` — see [services.md](services.md#http-contract).

## `key` vs `Entity.name`

Two distinct keys, conventionally equal:

- **`config.key`** names routes: `${key}Overview`, `${key}Details`, `${key}Fiche`, `${key}Form`.
- **`Entity.name`** (the class name) keys the IoC service and the `$configs` map.

Keep them aligned unless you have a reason not to.

## `baseQueryParams` & `initialQuery`

`baseQueryParams` is merged into **every** list/search request (e.g. server-side `includes`) — though only a
**complex** API entity (`For<…, TSortBy, TIncludes>`) binds `?includes=` on List/Search; a **simple** entity
ignores it (eager-load the relation on the back-end instead), while Details always eager-loads.
Arrays serialize as repeated query keys, and keys starting with `$` are stripped before the request.

`initialQuery` is a different thing despite the neighbouring name: it has exactly one consumer, `createNavItem`,
which copies it into the **route query of the generated dashboard/navbar link**. Nothing reads it on the request
path, so it applies only when the user arrives by clicking that link — it is lost on refresh, on a deep link,
on back-navigation and on any `router.push`. Anything that must hold for every request (a default `sortBy`,
`includes`, a mandatory filter) belongs in `baseQueryParams`, or in the server-side default.

## `EntityDescriptor` (alternative API)

The library also exports an `EntityDescriptor` class that bundles the entity constructor, a
`serviceBuilder` factory, the `IConfig`, and the four view controls. The demo apps do **not** use it —
they wire entities with the plain `IConfig` object plus IoC registration and the `$configs` map (the
approach documented here). Prefer that path unless you are deliberately adopting descriptors.

## Overview

1. [Abstractions](abstractions.md)
2. [Services](services.md)
3. [Config](config.md)
4. [Views](views.md)
5. [Built-in features](built-in-features.md)
6. [Attachments](attachments.md)
7. [Checklist](checklist.md)
