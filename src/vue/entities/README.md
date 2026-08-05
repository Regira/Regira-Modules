# Regira Entities (front-end)

The browser-side CRUD client for the **Regira.Entities** API — a Vue 3 + Pinia + vue-router library
published as `regira/vue/entities`. You describe an entity once (model, service, config, views)
and get a list/search overview, a details page, a create/edit form, and a filter, all wired through a
shared HTTP client and a reactive entity cache.

## Core concepts

| Piece       | What it is                                                                                                     |
| ----------- | -------------------------------------------------------------------------------------------------------------- |
| **Entity**  | A model class extending `EntityBase` with `$id` (uniform identifier) and `$title` (uniform label for display). |
| **Service** | `EntityServiceBase<T>` — issues the HTTP calls; you implement `toEntity`.                                      |
| **Config**  | An `IConfig` object: endpoint URLs, paging, route prefix, titles, icon.                                        |
| **Store**   | A Pinia store wrapping the service in a pooled, reactive cache (`createStore`).                                |
| **Views**   | Overview / Details / Form / Filter, each driven by a composable.                                               |

## Architecture

```
Vue view → composable (useSearchView / useForm / useDetails / useFilter)
         → Pinia store (createStore) → PoolService (entity cache)
         → IEntityService (resolved from IoC by Entity.name)
         → shared axios + IConfig.*Url → Regira.Entities Web API
```

A single axios instance (`initAxios`) is shared across all services; the auth plugin adds the bearer
token via an interceptor, so every entity request is authenticated. **Auth is optional.** Services are
registered in a small IoC container keyed by `Entity.name` and resolved with `get()`.

## Quick start

Starting a new app? A running app wires `main.ts`, `App.vue`, the router, the plugin install order
(with or without authentication), the required-vs-optional plugin set, an entity slice per model, and an
app-level entity aggregator.

Pick a **build tier** first — the lean tier (the data layer + the library's `EntityOverview` / `EntityForm`)
or the full per-entity scaffold. Every tier keeps the [UI kit](../ui/README.md) à la carte — paging,
loading, feedback, modals, tabs, autocomplete and the [formatters](../formatters/README.md) import
individually, with no scaffold or plugins required.

A complete entity slice lives under `src/entities/<name>/` with the standard folder set
(`config/ data/ details/ filter/ overview/ selecting/` + `index.ts` + `setup.ts`). Build one step by step
with the [checklist](docs/checklist.md). For a complete working example, see the public sample app
[Regira-PIM-Admin](https://github.com/Regira/Regira-PIM-Admin).

## API contract

The client mirrors the back-end Web endpoints and expects item-wrapped envelopes
(`{ item }`, `{ items, count }`), with `GET` for reads, `POST`/`PUT` for save, `DELETE` for remove. The
full table is in [services.md](docs/services.md#http-contract).

## The module stack

`vue/entities` is one module in a `regira` set. A running front-end app assembles these siblings;
the table below is the human-facing mirror of the spine's `## Modules` table (grounded in the reference
apps — PIM-Manager and both Fleet apps confirm the same stack and plugin order). "Required" means an
entities app will not run without it.

| Module              | Import                                                     | Role                                                                                                                                                                                                                                  | Required? |
| ------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| **entities**        | `vue/entities`                                             | This module: models, services, configs, views, the entity cache.                                                                                                                                                                      | yes       |
| **app**             | [`vue/app`](../app/README.md)                              | App lifecycle / `AppStatus` (`appPlugin`); gates startup until auth/data is ready.                                                                                                                                                    | yes       |
| **ioc**             | [`vue/ioc`](../ioc/README.md)                              | `ServiceProvider` / `get` — services registered + resolved by `Entity.name` (`servicesPlugin`).                                                                                                                                       | yes       |
| **http**            | [`vue/http`](../http/README.md)                            | `initAxios` shared axios instance (+ file helpers `getFile`/`upload`), `createQueryString`.                                                                                                                                           | yes       |
| **ui**              | [`vue/ui`](../ui/README.md)                                | Icons, screens, modals, loading, feedback (`iconPlugin`/`screenPlugin`/`loadingPlugin`/`feedbackPlugin`).                                                                                                                             | yes       |
| **auth**            | [`vue/auth`](../auth/README.md)                            | Bearer-token interceptor + route guard (`authPlugin`, installed **after** the router).                                                                                                                                                | optional  |
| **lang**            | [`vue/lang`](../lang/README.md)                            | `translate()` / `langPlugin` for i18n labels and titles.                                                                                                                                                                              | optional  |
| **directives**      | [`vue/directives`](../directives/README.md)                | `focus` / `grow` / `clickOutside` form directives.                                                                                                                                                                                    | optional  |
| **online**          | [`vue/online`](../online/README.md)                        | `isOnlinePlugin` — online/offline awareness.                                                                                                                                                                                          | optional  |
| **formatters**      | [`vue/formatters`](../formatters/README.md)                | Date / number / currency display formatters.                                                                                                                                                                                          | optional  |
| **debug**           | [`vue/debug`](../debug/README.md)                          | `debugPlugin` — dev-only diagnostics overlay.                                                                                                                                                                                         | optional  |
| **date-extensions** | [`extensions/date-extensions`](../../extensions/README.md) | `dateSerializer.use()` once at startup (`dateSerializer` = the default deep import; the `extensions` barrel exports it as `dateExtensions`) — serialize `Date`s to JSON without a timezone shift (`main.ts` calls it before plugins). | optional  |
| **utilities**       | [`utilities`](../../utilities/README.md)                   | File / array / query helpers (`file-utility`, `array-utility`, …).                                                                                                                                                                    | optional  |

> `regira/treelist` is **not** part of the common stack — it's a direct dependency only for
> explicit client-side hierarchies built with `useTree`.

Also required at runtime but not Regira modules: **Pinia** (stores) and **vue-router** (routes).

## Overview

1. [Abstractions](docs/abstractions.md) — `IEntity`/`EntityBase`, search/paging/sort, `IConfig`
2. [Services](docs/services.md) — `EntityServiceBase`, `JSONService`, the HTTP contract
3. [Config](docs/config.md) — `IConfig` fields, URL derivation, descriptors
4. [Views](docs/views.md) — overview, details, form, filter composables
5. [Built-in features](docs/built-in-features.md) — pooling, preloading, navigation, trees, utilities
6. [Attachments](docs/attachments.md) — file upload/download UI: the attachment service, file fields, download URLs
7. [Checklist](docs/checklist.md) — add a new entity, step by step
