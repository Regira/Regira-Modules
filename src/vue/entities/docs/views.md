# Views

Each view is a thin Vue component that delegates to a composable.

## Route structure

`setup.ts` builds two routes per entity:

- **Overview** — `/{routePrefix}`, name `${key}Overview`.
- **Details** — `/{routePrefix}/:id`, name `${key}Details`, with nested children **Fiche**
  (`DetailsSummary`, read-only) and **Form** (`${key}Form`, edit); it redirects to the Form by default.
  Creating uses `:id = "new"`.

## Overview — `useSearchView` + `useRouteOverview`

`useSearchView({ service, searchObject, defaultPageSize })` returns the list state and handlers:
`searchObject`, `pagingInfo`, `items`, `itemsCount`, `isLoading`, `feedback`, `searchHandler`,
`applySave`, `applyRemove`, `handleSave`, `handleRemove`. `useRouteOverview({ searchObject, pagingInfo,
handler, defaultPageSize })` keeps those in sync with the URL query and re-searches on navigation,
returning `updateOverviewRoute`. (`useOverviewCore` is the shared base.)

`applySave` and `applyRemove` raise failures through `feedback` rather than throwing, and report them in
their return value — `SaveResult<T> | undefined` and `boolean`. Guard the list mutation on it:

```ts
if (await applyRemove(item)) handleRemove(item)
```

Calling `handleRemove(item)` unconditionally removes the row even when the server refused the delete
(a 409 while the row is still referenced), so the list and the failure message contradict each other
until the next fetch.

**`useSearchView` vs `useListView`** — a fetch-shape choice (every controller exposes `/search`): use
`useSearchView` when you want counted paging + filters (`service.search()` → `{ items, count }`), and
`useListView` when a plain list is enough (`service.list()` → `Array<T>`, already unwrapped — never
destructure `{ items }` from it). Both send the current search object merged with the paging info, and
`useListView` derives `itemsCount` from the rows it got back rather than from a server total.

> **Guard the lazy refs.** `items` / `itemsCount` are `undefined` until the first fetch, so bind
> `v-for="x in items ?? []"` and `:count="itemsCount ?? 0"`.

> **Overlapping calls settle predictably.** `searchHandler`, `listHandler`, `applySave` and `applyRemove`
> share one "newest wins" gate: only the newest of them writes `items`, `itemsCount`, `feedback` and
> `isLoading`, so a slower earlier call is dropped when it lands. They really do overlap: a filter change or
> fast paging starts a second fetch, the slice's login/refresh reload hook can search again while
> `useRouteOverview`'s mount fetch is still in flight, and a row saved or deleted from the list settles
> against whichever of those is on the wire. Only the shared state is gated — `applySave` and `applyRemove`
> still return what the server said, so `handleSave` / `handleRemove` apply to the list either way.

## Details — `useDetails`

`useDetails(service)` loads the item for the route `:id` and returns `item`, `isLoading`, `overviewUrl`,
`load`, and `feedback`. The Details component renders a nested `<RouterView>` for the Fiche/Form child,
passing `item`. `item` is `undefined` until the `onMounted` load resolves — gate the child with
`<RouterView v-if="item" …>`.

## Form — `useForm` (and `useModal`)

`useForm({ entityService, props, emit })` returns `item` plus `handleSubmit`, `handleCancel`,
`handleRemove`, `handleRestore`, and `feedback`. Note the form's `handleRemove()` takes **no arguments**
(it removes the bound `item.value`) — unlike the overview's `handleRemove(item)`. Define props with `withDefaults(defineProps<FormProps &
…>(), { ...formDefaults })` and emits via `FormEmits<T>`; `FormStates` enumerates pending/saved/removed/
error. `useModal` is the in-modal variant for editing without leaving the page.

For child/owned collections inside a form, render the rows with **`InputSelectorInline`** — chips that
mark _persisted_ removals `_deleted` (undoable until save, filtered out in the service's `prepareItem`
override), remove rows added this session outright (nothing to undo; override the detection via the
`isNew` prop), and hand the picker slot an `exclude` list. The heavier per-row editors are `useOwnedCollection`,
`useOwnedModal`, `useListInput`, and `useListItemInput`. The multi-`Selector`
hard-removes on delete, so it does not fit collections that need the marked-delete UX.

## Filter — `useFilter`

`useFilter({ searchObject, emit, Constructor })` takes the search object as a `Ref` (the filter component
supplies it via `defineModel<SearchObject>`) and
returns `handleUpdate`, `handleFilter`, `handleReset`, `handleToggle`, and `filterIsActive`. Pass the
slice's search-object class as `Constructor` — the scaffold's filter components call
`useFilter({ searchObject, emit, Constructor: SearchObject })` — because `filterIsActive` compares the
model's non-null keys against a `new Constructor()`'s own keys; without it the fallback
`DefaultSearchObject` has no own runtime keys, so `filterIsActive` is always `false`. Emit
`filter` to trigger a search; the overview calls `updateOverviewRoute(true)` in response.

## Selector

`Selector.vue` (generated per slice under `selecting/`) is a reusable entity picker for choosing
related entities in forms.

## Overview

1. [Abstractions](abstractions.md)
2. [Services](services.md)
3. [Config](config.md)
4. [Views](views.md)
5. [Built-in features](built-in-features.md)
6. [Attachments](attachments.md)
7. [Checklist](checklist.md)
