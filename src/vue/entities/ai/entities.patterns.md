# Regira Entities — Feature Patterns

Recipes for individual features. Each is one focused snippet + notes. Verify signatures in
[entities.signatures.md](entities.signatures.md); see a full slice in [entities.examples.md](entities.examples.md).

## Soft delete / archived rows

`DELETE /{id}` on an archivable entity flags the row instead of erasing it — same 200, real affected
count, idempotent. Visibility afterwards is driven by one search-object field, `archived`:

| `searchObject.archived`   | Sent as              | Result                                                                                        |
| ------------------------- | -------------------- | --------------------------------------------------------------------------------------------- |
| unset                     | _omitted_            | the server's default — archived rows invisible, in lists, counts **and included collections** |
| `ArchivedFilter.excluded` | `?archived=excluded` | same, forced per request                                                                      |
| `ArchivedFilter.only`     | `?archived=only`     | archived rows only — the recycle-bin view                                                     |
| `ArchivedFilter.included` | `?archived=included` | live and archived rows together                                                               |

```ts
import { SearchObjectBase, ArchivedFilter } from "@regira/modules/vue/entities"

class EntitySearchObject extends SearchObjectBase {
    archived?: ArchivedFilter
}
// ... searchObject.archived = ArchivedFilter.only   // recycle bin
```

`GET /{id}` **404s on an archived row**, so `useDetails` and `useModal` load archived-inclusive — that is
what puts an archived row in front of `FormButtonsRow`'s Restore button. A hand-rolled loader needs the
same second argument: `service.details(id, { archived: ArchivedFilter.included })`.

`useForm.handleRestore` then clears the entity's own `isArchived` and saves; the write path resolves
archived rows server-side, so the save needs no query parameter.

> ⚠️ **`isArchived` stays on the entity and the input DTO.** It reads like a server-owned flag, but
> dropping it strands the row: lists hide it, `GET /{id}` 404s, and no payload can clear it. A form
> **hides** the field, it never removes it. The entity property `isArchived` and the search-object field
> `archived` are different things — `handleRestore` writes the former, filters set the latter.

## State toggle (activate / deactivate)

A visible status flag like `isActive` differs from archiving: the row stays in lists, just marked. Give it
its own search-object field for filtering, and flip it through a **dedicated endpoint** so the update
touches that one field server-side and leaves the entity's other fields intact. The method reuses the
injected `axios` + `config.api`, like any [custom endpoint](#custom-endpoints-on-a-service):

```ts
export class EntityService extends EntityServiceBase<Entity> {
    override toEntity(item: object): Entity {
        /* … */
    }

    async setActive(id: number, isActive: boolean): Promise<void> {
        await this.axios.post(`${this.config.api}/${id}/${isActive ? "activate" : "deactivate"}`)
    }
}
```

Call it through the **raw** IoC service (the pooled store exposes only the `IEntityService` surface), then
reload the row:

```ts
const svc = get<EntityService>(Entity.name)!
await svc.setActive(item.id, !item.isActive)
```

This is a custom save, so wrap it in feedback (`pending` → `success`/`fail`) like any call outside `useForm` —
see [Feedback for custom saves](#feedback-for-custom-saves-outside-useform).

`isArchived` / `handleRestore` ([Soft delete](#soft-delete--archived-rows)) stay reserved for true removal.

## Date hydration

`EntityServiceBase.processItem` converts the server strings **`created`** and **`lastModified`** to
`Date` automatically. Type them as `Date` on the model; do not parse them yourself. Any other date
field arrives as a string — convert it in `toEntity`:

```ts
override toEntity(item: object): Entity {
    const e = item instanceof Entity ? item : Object.assign(this.createInstance(Entity as new () => Entity), item || {})
    if (typeof (e as any).publishedOn === "string") e.publishedOn = new Date((e as any).publishedOn)
    return e
}
```

⚠️ The `typeof … === "string"` guard is mandatory, not style. `toEntity` runs inside computeds
(`fromPool`, the library `FormModalButton.modalTitle`), so an unconditional `new Date(x)` mutates the
computed's own dependency and throws `Maximum recursive updates exceeded` **against the library
component** — the error names the wrong code. Keep `toEntity` idempotent.

The same rule governs **every** conversion in the override, including the owned-collection lift
([Owned rows with scalar fields](#owned-rows-with-scalar-fields--the-inline-table)) — a fresh array counts
as a mutation just as a fresh `Date` does, so guard the reassignment rather than mapping unconditionally:

```ts
if (e.orderLines?.some((row) => !(row instanceof OrderLine))) e.orderLines = e.orderLines.map((row) => OrderLine.create(row))
```

## Transient client-only fields

`prepareItem` strips **top-level** properties whose key starts with **`_`** before sending — use them for
UI-only state, most importantly **`_deleted`** to flag a child row for removal:

```ts
class OrderLine extends EntityBase {
    id = 0
    _deleted = false /* … */
}
```

**Marking is not deleting.** The strip is root-only — it does **not** recurse, so a `_deleted` child row is
still sent, and `e.Related(...)` keeps every row it receives. The delete happens by **omission**: filter the
marked rows out so they are **absent** from the payload, then `Related(...)` removes them on save. Do it in a
per-collection `prepareItem` override on the parent's service:

```ts
protected override prepareItem(item: Order): Order {
    item.orderLines = item.orderLines?.filter((x) => !x._deleted) ?? []
    return super.prepareItem(item) // keep the root `_`-strip
}
```

For an owned/join collection like this, removal is a **mark**, not a splice — but only `useListItemInput` toggles `_deleted` for you (on a
per-row `handleRemove`). `useOwnedCollection` / `useListInput` just expose the writable collection, so you set
`row._deleted = true` yourself in the template. The override is what turns that mark into a delete.

**Show the pending state.** A `_deleted` row stays in the list until save, so render it visibly tinted /
struck-through — otherwise the delete looks like a no-op and invites splicing the row out (which skips the
server-side delete). Toggle the flag so it doubles as undo:

```vue
<tr :class="{ 'table-danger text-decoration-line-through': row._deleted }">
    <!-- … --><IconButton icon="delete" @click="row._deleted = !row._deleted" />
</tr>
```

## Paging

Paging is automatic: `pageSize` defaults to `config.defaultPageSize` (`DEFAULT_PAGESIZE` = 10) and
`page` is omitted from the URL when ≤ 1. `pageSize: 0` returns **all rows, capped by the server's
`MaxPageSize`** (100 under `UseDefaults()`); for a pager-less "show all" set `defaultPageSize` to a large
number up to that cap, and for datasets larger than `MaxPageSize` use the `Autocomplete` selector
(server-side search) instead of a truncated page. The overview composables expose `pagingInfo` (a
`Ref<IPagingInfo>`) and `itemsCount`; bind a `Paging` control to them and call the route handler on change:

```ts
const { pagingInfo, itemsCount, searchHandler } = useSearchView({ service, searchObject, defaultPageSize: config.defaultPageSize })
const { updateOverviewRoute } = useRouteOverview({ searchObject, pagingInfo, handler: searchHandler, defaultPageSize: config.defaultPageSize })
// Paging @change → updateOverviewRoute()
```

## Overview list layout (avoiding horizontal scroll)

`overview/List.vue` (headers) and `overview/ListItem.vue` (rows) render one Bootstrap `.row` per line. A
fixed-width `col-auto` column does **not** shrink, so stacking several of them (plus a few flexible `col`s)
pushes the row past narrow viewports. Design the row to fit:

- **Flex + clip text columns** — `class="col text-truncate"`, not a fixed width.
- **Reveal secondary columns progressively** — the 2nd field at `d-none d-md-block`, the 3rd at
  `d-none d-lg-block`, the 4th at `d-none d-xl-block`. Stacking them all at `d-md-block` reproduces the
  overflow at every size above `md`.
- **Action cells are bare `col-auto`** — an icon/edit button, a `ConfirmButton`. Let them size to content.
- **Headers and cells must use the same breakpoint classes**, or columns stop lining up.

⚠️ **A fixed `width` on a `.row` child is the classic overflow bug.** Bootstrap sets `.row > *` to
`flex-shrink: 0` with `.75rem` horizontal padding under `box-sizing: border-box`, so the declared width is
the **border** box: `<div class="col-auto" style="width: 3rem">` offers a 24px content box, while the
library's `ConfirmButton` / `IconButton` renders a 42px `.btn`. Neither shrinks, so the row overflows the
page. Budget **≥ 4.5rem** for any cell holding one `.btn` — or drop the `width` and let `col-auto` do it.

The library's own `.entity-list` rule (in `@regira/modules/style.css`) backs this up — it zeroes the `.row`
gutter margins and sets `min-width: 0` on the cells so `text-truncate` can actually clip. Do not redeclare
it in `theme.scss`. It deliberately sets **no** `overflow-x`: with `overflow-y` left at `visible` an
`overflow-x: auto` computes to `auto` on both axes, turning the list into a scroll container that clips
absolutely-positioned descendants (an autocomplete dropdown in an inline-edit row) and disables
`position: sticky` inside it. A row that still doesn't fit has too many columns — cut one, or opt that one
list in with the shipped `.entity-list--scroll-x` class.

```vue
<!-- List.vue header cell + ListItem.vue body cell — identical column classes, mirrored 1:1. A foreign
     relation's label goes through the sibling store's fromPool (const { fromPool: getBrand } =
     useBrandStore()) so it stays reactive to edits — see "Resolving relations with fromPool" below. -->
<div class="col text-truncate">{{ item.$title }}</div>
<div class="col d-none d-md-block text-truncate">{{ getBrand(item.brand)?.$title }}</div>
<div class="col d-none d-lg-block text-truncate">{{ item.model }}</div>
<div class="col d-none d-xl-block text-truncate">{{ item.status }}</div>
<div class="col-auto">
    <ConfirmButton icon="delete" :modal-type="ModalType.danger" @confirm="$emit('request-remove', item)" />
</div>
```

The `Vehicle` slice in [entities.advanced.example.md](entities.advanced.example.md) §9–10 is the worked
example (a multi-column list that stays inside the viewport).

## Two presentations of one entity (public face + back office)

A slice has exactly one `Overview`, so a storefront card grid and an admin table over the same `Product`
cannot both be `List.vue`. Customising the slice into the public face costs the back office its list, which
the functionality contract still requires — every entity stays manageable.

**Keep the slice as the back office and add app-owned views for the public face.** The public view is a
plain view under your own folder (`src/shop/views/CatalogView.vue`), routed by your own routes, and it
reuses the slice's machinery rather than re-implementing it:

```ts
const service = get<EntityService>(Product.name) // the same registered service the slice uses
const { items, pagingInfo, itemsCount, isLoading, searchHandler } = useSearchView<Product, SearchObject>({
    service,
    searchObject, // your own shape — facets, a slug from the path, whatever the page needs
    defaultPageSize: 24,
})
```

- **Share the service, not the components.** Resolve it from the container under `Entity.name` so both faces
  read through one pooled cache — a save in the back office is visible to the storefront without a refetch.
- **`useSearchView` carries over; `useRouteOverview` does not** (it assumes the slice's route names). Sync
  your own URL and keep the fetch/paging/loading/feedback plumbing — see §Overview: `useListView` vs
  `useSearchView` in the instructions.
- **Reuse the kit directly** — `Paging`, `ResultSummary`, `LoadingContainer`, `Feedback` and `ConfirmButton`
  are `@regira/modules/vue/ui` exports and work anywhere; only `#modals` has to exist in `index.html`. The
  slice's own generated components (`selecting/InputSelector.vue`, `details/FormModalButton.vue`) are app
  source and carry no slice assumptions either — import them from their folder and they work in your view.
- Leave the slice registered in `src/entities/index.ts` either way: that is what keeps the entity in the
  config-driven navigation and gives the admin face its forms for free.

## Union search (OR across filters)

`searchUnion` POSTs an **array** of search objects and returns the union as one `{ items, count }`:

```ts
const { items, count } = await service.searchUnion(
    [{ q: "blue" }, { q: "red" }],
    { sortBy: "title" } // optional IPagingInfo | ISortByInfo
)
```

## Custom endpoints on a service

Add methods that reuse the injected axios and `config.api`:

```ts
export class EntityService extends EntityServiceBase<Entity> {
    override toEntity(item: object): Entity {
        /* … */
    }

    async getFamily(ids: Array<number>): Promise<Array<Entity>> {
        const { data } = await this.axios.get(`${this.config.api}/family`, { params: { ids } })
        return data.items.map((x: object) => this.toEntity(x))
    }
}
```

**Calling a custom method from a view.** The store's `service` is a **pooled** `PoolService` exposing
only the `IEntityService` surface — your custom method is _not_ on it. Resolve the raw service from IoC
(it is registered under `Entity.name`):

```ts
import { get } from "@regira/modules/vue/ioc"

const svc = get<EntityService>(Entity.name)!
const family = await svc.getFamily([1, 2, 3])
```

Use the pooled store `service` for ordinary CRUD (so views share the reactive cache); reach for the raw
`get<EntityService>(Entity.name)` only to call bespoke endpoints like this.

## Feedback for custom saves (outside useForm)

`useForm` / `useSearchView` / `useDetails` each drive a `FeedbackOut` (pending → success/fail), but a view
shows it only where it **renders** `<Feedback :feedback="feedback" />` — the scaffolded `Form.vue` / `Details.vue`
do (a form that renders none saves silently). `FormButtonsRow` takes the same `feedback` only to disable its
Save/Delete/Restore buttons while an operation is in flight. The global `$feedback` (`feedbackPlugin`, shown once in `App.vue`) is a **separate**
instance for app-level notices — route cross-cutting messages there via `inject("feedback")`, not the form's.

Anything you save **yourself** — an inline row toggle, a quantity edit, a custom action button, a storefront
checkout that calls `service.save()` / `remove()` directly — gets none of the composable's feedback. Give it its
own so the user sees the result; a bare `await service.save()` reads as a no-op (and swallows the error path):

```ts
import { useFeedback } from "@regira/modules/vue/ui" // useFeedback, Feedback, FeedbackStatus all live here
const feedback = useFeedback()

async function toggleActive(row: Row) {
    feedback.pending("Saving…")
    try {
        row.isActive = !row.isActive
        await service.save(row)
        feedback.success("Saved")
    } catch (ex: any) {
        feedback.fail("Save failed", ex.response?.data?.errors ?? ex.response?.data?.message ?? ex.message)
    }
}
```

Render it with `<Feedback :feedback="feedback" />` (styling + the 400 field-map in
[Form validation & error handling](#form-validation--error-handling)), or reuse the surrounding form's
`feedback` (`useForm` returns it) instead of minting a second one.

## Entity selector (relation picker) — `selecting/`

**Which one:** single FK on a form → `InputSelector`; free-text filter field → `Autocomplete`; join/owned rows edited in a form → **`InputSelectorInline`** (marked-delete — the default for m2m, [below](#owned-child-collections)); multi-value over a **fixed option set (enum, no service)** → a checkbox group rather than a native `<select multiple>` ([below](#multi-value-over-a-fixed-option-set-enum)); a plain entity array where instant removal is genuinely wanted → `Selector`.

> **A single-FK `InputSelector` needs BOTH bindings to show a value:** `v-model` (the related **object**, which
> the control displays via its `$title`) **and** `v-model:idValue` (the **FK** that is saved). Bind only
> `idValue` and a populated form renders the control blank — the most common "why is the picker empty" bug.
> In dev the control `console.warn`s when it sees `idValue` without `v-model`.
>
> ```vue
> <BrandSelector v-model="item.brand" v-model:idValue="item.brandId" />
> ```
>
> Bind `item.brand` **straight off the entity**. The generated control runs `modelValue` through its own
> slice's `fromPool`, which rehydrates the plain nested DTO and returns the shared instance, and it back-fills
> from `idValue` on mount when the relation was not included. A local `ref` fed by a `watch`, or a writable
> computed wrapping `fromPool`, is redundant here — pool by hand only for relations you render yourself.

> **⚠️ Delete semantics differ.** The multi-`Selector` **hard-removes** on its delete icon — the row leaves
> the array immediately, so it cannot deliver the marked-deleted UX (visible, undoable until save). For any
> join/owned collection edited in a form, marked-delete is the **default**: use `InputSelectorInline`
> (`@regira/modules/vue/entities`), not `Selector`.

> **Adding to a collection? Exclude what's already in it.** Pass the current ids as a filter default so
> picked rows disappear from the picker — omitting this is the classic "duplicate add" UX bug:
>
> ```vue
> <InputSelector v-model="newItem" :filter-defaults="{ exclude: item.articleCategories?.map((x) => x.categoryId) }" @select="handleSelect" />
> ```

> **Entity-backed = has a service/store — even a short, fully-loaded set** (a dozen intervention types, an
> article's categories). Prefer the `Selector` here: it searches server-side and shares the pooled cache, so it
> scales past one page where a checkbox/radio group loaded from `service.list()` / `service.search()` won't. A
> checkbox group is the natural fit for a **serviceless** union/enum (no id, no service) — see
> [Multi-value over a fixed option set (enum)](#multi-value-over-a-fixed-option-set-enum).

Each entity ships a thin **`selecting/Selector.vue`** so other entities' forms can pick it (e.g. choosing
an Article's categories, or a list's shopper). It `v-model`s the related entity and resolves it through
the **pooled** store, so the picked value shares the reactive cache:

```vue
<!-- src/entities/categories/selecting/Selector.vue -->
<script setup lang="ts">
import { computed } from "vue"
import type Category from "../data/Entity"
import useEntityStore from "../data/store"

const model = defineModel<Category | undefined>()
const { service, fromPool } = useEntityStore() // pooled service + shared cache
const selected = computed<Category | undefined>({
    get: () => fromPool(model.value) as Category | undefined,
    set: (v) => (model.value = v),
})
// back the picker UI with `service.search({ q })`; render the barrel's <Selector> (entity picker)
// or your own autocomplete that emits the chosen Category into `selected`.
</script>

<template>
    <!-- e.g. an autocomplete bound to `selected`, options from service.search({ q }) -->
    …
</template>
```

Re-export it from the slice `index.ts` (`export { default as Selector } from "./selecting/Selector.vue"`)
so forms do `import { Selector as CategorySelector } from "@/entities/categories"`. For a multi-select
(an Article's many categories) bind an **array** of related entities and add/remove picks; the shipped
`Selector` rebuilds that array, and the server's `e.Related(...)` re-syncs the join from its contents.

> **The picker only emits — you add.** `@select` (and the `v-model` set) fire with the chosen row; the bound
> array does not change until _you_ push into it. A selector that "adds nothing on pick" is a missing handler,
> not a broken component:
>
> ```ts
> function handleSelect(picked: Category) {
>     if (!items.value.some((c) => c.$id === picked.$id)) items.value.push(picked)
> }
> const handleRemove = (row: Category) => (items.value = items.value.filter((c) => c.$id !== row.$id))
> ```
>
> Rebuilding the array is right for a **plain entity/id set**. When you instead **render join/owned rows** (a join
> entity carrying extra fields, or an inline child editor) and want a visible pending-delete with undo, keep the
> row and toggle `_deleted` — [Transient client-only fields](#transient-client-only-fields) /
> [Owned collections](#owned-child-collections) — filtered out in `EntityService.prepareItem`.

Type optional relations `Category | undefined`, not `| null` — selector/autocomplete `v-model`s are
`T | undefined` (JSON `null` still deserializes fine).

### Editing a many-to-many join — use `InputSelectorInline`

The entity carries **join rows** (`{ categoryId, category? }`). Edit them inline with **`InputSelectorInline`**
([the owned-m2m recipe](#the-owned-m2m-recipe--inputselectorinline)): it binds the join array directly, its
delete toggle marks `_deleted` (visible, undoable), and `#selector`'s `add()` appends a new row. This is the
default for **every** join/owned collection edited in a form — including a plain id-set link like this one.

> **Do not bridge it to a multi-`Selector`.** The obvious-looking alternative — flatten the join rows to a
> `Category[]`, bind a multi-`Selector`, rebuild on change — **hard-removes** (its delete icon splices the
> array), so it can never show a pending/undoable delete and its `_deleted` handling is dead on removal. Reach
> for it only when instant, no-undo removal is genuinely wanted.

> **Key the new row on the plain `id`/FK, never `$id`.** A nested `category` from an included relation is
> un-hydrated JSON — its `$id`/`$title` getters are `undefined`. Reading `$id` writes `categoryId: undefined`,
> which the server rejects on the **second** save (`Related()` re-syncs the join rows). The `.id` field is
> always present.

### Multi-value over a fixed option set (enum)

A `Status`-style field has no entity/service behind it, so the entity `Selector` doesn't apply — and a native
`<select multiple>` is the wrong reach. Model the values as an erasableSyntaxOnly-safe union and bind a
checkbox group to an array (Regira APIs accept enum members **by name**):

```vue
<script setup lang="ts">
type Status = "Planned" | "Scheduled" | "InProgress" | "Completed"
const STATUSES: Status[] = ["Planned", "Scheduled", "InProgress", "Completed"]
const model = defineModel<Status[]>({ default: () => [] })
const toggle = (s: Status) => (model.value = model.value.includes(s) ? model.value.filter((x) => x !== s) : [...model.value, s])
</script>

<template>
    <div v-for="s in STATUSES" :key="s" class="form-check">
        <input class="form-check-input" type="checkbox" :id="s" :checked="model.includes(s)" @change="toggle(s)" />
        <label class="form-check-label" :for="s">{{ s }}</label>
    </div>
</template>
```

For a chip UI instead of checkboxes, feed the same static array to an `Autocomplete` (options from the array,
not `service.search`) and bind the picked list — same model, richer control.

## Owned (child) collections

**This is the blessed end-to-end pattern for every collection edited inside a parent's form** (order
lines, join rows, shares/members). One decision on the back-end drives the whole chain — decide it
_before_ scaffolding (`Regira.Entities` → `entities.instructions` → Step 0):

| Layer    | Piece                                                                                                                       |
| -------- | --------------------------------------------------------------------------------------------------------------------------- |
| back-end | `e.Related(x => x.Rows)` on the **parent** — the child gets no `.For<>()`, no controller, no budget slot                    |
| contract | the rows ride on the parent's DTO/InputDto; one `save(parent)` persists adds, edits, and deletes together                   |
| form     | **`InputSelectorInline`** chips (below); heavier per-row editing → `useOwnedCollection` / `useOwnedModal`                   |
| removal  | persisted row → mark `_deleted` (visible, undoable); row added this session → remove outright; never per-row `DELETE` calls |
| service  | a per-collection `prepareItem` override drops `_deleted` rows so `Related()` deletes by omission                            |

For rows only ever edited inside the parent's form, modelling them first-class instead (own
service/routes, separate `DELETE` flushes) is the classic expensive rework — the parent's `Related()`
sync overwrites them on every save. The genuine owned-vs-first-class trade-off is below.

### The owned-m2m recipe — `InputSelectorInline`

Four numbered steps, one per layer:

1. **Model** — the join rows live on the parent: `articleCategories?: Array<ArticleCategory>` where the
   row type carries `categoryId`, the nested `category?`, and `_deleted?: boolean`. New rows need no id —
   `Related()` inserts rows that arrive without one.
2. **Render** — `InputSelectorInline` (`@regira/modules/vue/entities`) renders each row as a chip with a
   delete button (persisted rows toggle the `_deleted` mark — tinted, click again to restore; rows added
   this session via `add` are removed outright — tracked by identity, so the join-row shape needs no `id`)
   and hands the `#selector` slot an `add` function plus the `exclude` id list:

    ```vue
    <script setup lang="ts">
    import { InputSelectorInline } from "@regira/modules/vue/entities"
    import {
        InputSelector as CategorySelector,
        FormModalButton as CategoryButton,
        type Entity as Category,
        useEntityStore as useCategoryStore,
    } from "@/entities/categories"
    import type Article from "../data/Entity"

    const item = defineModel<Article>({ required: true })

    // nested rows from ?includes= are plain DTOs; rehydrate through the sibling pool so a chip edit
    // relabels live. fromPool is a pass-through, so widen the narrow join-DTO to the entity type here.
    const { fromPool } = useCategoryStore()
    const hydrate = (c?: Partial<Category>): Category | undefined => fromPool(c as Category)
    </script>

    <template>
        <InputSelectorInline v-model="item.articleCategories" :row-key="(r) => r.categoryId" :exclude-key="(r) => r.categoryId">
            <template #chip="{ row }">
                <CategoryButton :modelValue="hydrate(row.category)" />
                {{ row.category?.title }}
            </template>
            <template #selector="{ add, exclude }">
                <CategorySelector :filter-defaults="{ exclude }" @select="(c?: Category) => c && add({ categoryId: c.id!, category: c })" />
            </template>
        </InputSelectorInline>
    </template>
    ```

    The chip embeds the related entity's `FormModalButton` (an edit affordance) — don't simplify it to a
    bare label. `hydrate` widens the join-DTO and pools it in one step, so an edit through the chip's own
    modal relabels it live; `Object.assign(new Category(), row.category)` hydrates too but yields a detached
    copy whose label goes stale until a reload.

3. **Purge on save** — the `prepareItem` override from [Transient client-only fields](#transient-client-only-fields)
   filters `_deleted` rows per collection; `Related()` then deletes by omission. Purge **every nesting
   level** that carries the flag:

    ```ts
    protected override prepareItem(item: Party): Party {
        item.addresses = item.addresses?.filter((x) => !x._deleted)
        item.parentRelationships = item.parentRelationships
            ?.filter((x) => !x._deleted)
            .map((x) => ({ ...x, contactData: x.contactData?.filter((cd) => !cd._deleted) })) // nested level too
        return super.prepareItem(item)
    }
    ```

4. **Verify** — save the **same record twice** and reopen the form: the second save is where a mis-modelled
   join re-syncs and 500s, and reopening proves the Details eager-load returns the rows.

### Owned rows with scalar fields — the inline table

When the rows carry **their own scalar fields** and pick no other entity (order/invoice lines, request
items, contact rows), there is nothing for `InputSelectorInline` to select — render an **editable table**
instead. It is still owned via `e.Related(...)`, still removed by a `_deleted` **mark** (never a splice),
and still purged in `prepareItem`. `useOwnedCollection` supplies the array + add-row over the parent's
collection — bind the child editor to the **array**, not the parent. Scaffold the whole editor with
`scaffold.mjs <Entity> --owns <Child>` (it emits this component + the child model and prints the wiring),
then replace the placeholder scalar fields:

```vue
<script setup lang="ts">
import { useOwnedCollection } from "@regira/modules/vue/entities"
import OrderLine from "./Entity" // the child row model — a plain EntityBase with scalar fields + `_deleted?: boolean`

const props = defineProps<{ modelValue?: Array<OrderLine> }>()
const emit = defineEmits<{ "update:modelValue": [Array<OrderLine>] }>()
// items: writable computed over the collection (never undefined — [] until the parent has one)
// newItem: the add-row · handleSave: appends it with a negative temp id and mints the next one
// createRow: mints the add-row from the model, so its field defaults and getters are present — the add-row
//            never passes through toEntity, so without this it is a bare { id: 0 } and defaults are missing
const { items, newItem, handleSave } = useOwnedCollection<OrderLine>({ props, emit, createRow: () => new OrderLine() })
</script>

<template>
    <div v-for="row in items" :key="row.id" class="row mb-1" :class="{ 'is-deleted': row._deleted }">
        <div class="col"><input v-model="row.description" class="form-control" /></div>
        <div class="col-3"><input type="number" v-model.number="row.quantity" class="form-control" /></div>
        <button type="button" class="btn btn-outline-danger" @click="row._deleted = !row._deleted">×</button>
    </div>
    <div v-if="newItem" class="row">
        <!-- add-row -->
        <div class="col"><input v-model="newItem.description" class="form-control" @keyup.enter="handleSave({ saved: newItem, isNew: true })" /></div>
        <button type="button" class="btn btn-success" @click="handleSave({ saved: newItem, isNew: true })">+</button>
    </div>
</template>
```

Parent form binds it to the array: `<OrderLineOverview v-model="item.orderLines" />`.

> ⚠️ **The rows are raw objects, not model instances.** `items` comes straight off `props.modelValue` and only
> the **root** item passes through `toEntity`, so a stored child arrives as the plain JSON the API sent; and
> `newItem` is minted as a literal `{ id: 0 }`, never `new Child()`. Class getters read `undefined` and field
> defaults are absent — the scaffolded editor only works because it binds plain scalars.
>
> **Lift the collection in the parent service's `toEntity`** — the one hook every read path already goes
> through (`details`/`list`/`search` all call it, and so does `fromPool`), so one override covers the whole
> slice:
>
> ```ts
> // data/EntityService.ts — the owning entity's service
> override toEntity(item: object): Entity {
>     const entity = item instanceof Entity ? item : Object.assign(this.createInstance(Entity), item || {})
>     // OrderLine.create is the child's named constructor (scaffolded with the owned slice). Only reassign
>     // when a row still needs lifting, and map to a NEW array — the incoming one belongs to the caller
>     if (entity.orderLines?.some((row) => !(row instanceof OrderLine)))
>         entity.orderLines = entity.orderLines.map((row) => OrderLine.create(row))
>     return entity
> }
> ```
>
> Three details. Guard for absence (`?.`) because `toEntity` also runs for `newEntity({})`, where the
> collection is missing. Call the factory from an arrow rather than passing it to `map` bare, so `map`'s index
> argument can never land on a second parameter. And ⚠️ **guard the reassignment with `.some(row => !(row
> instanceof OrderLine))`** — this is the collection form of the
> [`toEntity` idempotency rule](#date-hydration), and it is load-bearing, not style: an unconditional `map`
> builds a fresh array on every call, and `toEntity` runs inside computeds (`fromPool`, the library
> `FormModalButton.modalTitle`), so the new array mutates the computed's own dependency and Vue aborts with
> `Maximum recursive updates exceeded` **against the library component**. The slice builds green and every
> page renders; the error names the wrong file.
>
> ⚠️ **That covers the stored rows, not the add-row.** `newItem` never passes through any `toEntity` — it is
> minted by the composable — so if it needs defaults or a real prototype, seed it after **both** mount and
> every add, because `handleSave` calls `resetNewItem()` on each successful append and puts a bare
> `{ id: 0 }` back:
>
> ```ts
> watch(newItem, (row) => row && !(row instanceof OrderLine) && (newItem.value = OrderLine.create(row)))
> ```
>
> Or skip `newItem` altogether, as the demo apps do: add through the child's `FormModalButton` with
> `defaultValues`, and `handleSave` appends the result.
>
> Either way, keep per-row computations in **plain functions** (`lineTotal(row)`) rather than model getters:
> that stays correct whichever shape a row happens to have.
>
> Lifting in `toEntity` is not the `Object.assign` snapshot the pooling rule warns about: an owned row has no
> pool to go stale against — no `.For<>()`, no service, no store, so nothing is keyed by its type — and it is
> saved with its parent. Pooling still governs any **other entity a row displays** (a line's product, a
> policy's department): resolve those through that slice's `fromPool` so an edit anywhere relabels them here.
> Since `fromPool` runs the parent's `toEntity`, a pooled parent already carries lifted children. A child that
> needs its own pool is not owned — see _Owned vs first-class child_ below.

> ⚠️ **The field name must equal the back-end navigation's JSON key** — camelCase (`orderLines` for
> `Order.OrderLines`), never derived from the child class name or the lowercase folder. A mismatch fails
> **silently**: no type error, no runtime error — the collection just never round-trips and nothing
> persists. Verify the key against an actual API response before binding (`scaffold.mjs --owns … --as
<fieldName>` sets it explicitly).

New rows mint
**negative temp ids** and insert with the parent's single `save()`; `_deleted` rows drop in the `prepareItem`
filter above. Use `useOwnedModal` when each row is edited in a modal instead of inline; `useListInput` /
`useListItemInput` are the lower-level primitives (`useListItemInput`'s `handleRemove` toggles `_deleted`
for you). **Table when there's nothing to pick; `InputSelectorInline` chips when rows link to another entity.**

**Owned vs first-class child — and the "add before the parent is saved" consequence.** An **owned** collection
(`useOwnedCollection`, embedded in the parent DTO, persisted via `e.Related(...)` on save) can be edited on a
brand-new parent: its rows mint negative temp ids and insert together with the parent, so a form adds children
before the first save. A child promoted to a **first-class entity** (its own service/store/routes — e.g. to
toggle one row with a single `PATCH`) instead needs the parent's real id for its FK, so its editor only works
after the parent exists. Pick owned for "edit the whole graph in one form" (no save-first gate); pick
first-class for "operate on one row independently" (accept the save-first step, or persist the parent silently
on open).

**Both at once — reordered through the parent, one field patched on its own.** The common business shape
(list items that drag to reorder but toggle active individually; invoice lines that reorder but flip a
status) is a hybrid: the rows stay **owned**, and only the independently-managed field gets its own narrow
endpoint. That is the default split below; two alternatives follow for when it does not fit.

- **Reorder rides the parent's save.** Drag over the owned array and mirror the index into `sortOrder`
  after every move, then save the parent once — the server takes order from array position.
- **The toggle does not** — it calls its own endpoint and updates the row in place. It must then survive
  the parent's next save, and this is where the shape is usually got wrong: the `Related()` re-diff
  rewrites matched rows **from the payload**, so dropping the field from the child input DTO resets it to
  default rather than protecting it. Either restore it in a prepper from `original`
  (`EntityPrepperBase<T>.Prepare(modified, original)`), or keep the whole collection out of the parent's
  input DTO so the sync short-circuits. Sending a stale client value fails the same way, just as quietly.
- **Only persisted rows can be patched.** A row added this session carries a negative temp id and does not
  exist server-side yet, so its toggle has to stay local until the parent's save gives it a real id.

The default split on top of the inline table above — the drag mechanism is yours (native handlers or a drag
library); only the two functions shown are load-bearing:

```vue
<script setup lang="ts">
import { useOwnedCollection } from "@regira/modules/vue/entities"
import { useAxios } from "@regira/modules/vue/http"
import OrderLine from "./Entity"

const props = defineProps<{ modelValue?: Array<OrderLine> }>()
const emit = defineEmits<{ "update:modelValue": [Array<OrderLine>] }>()
const { items } = useOwnedCollection<OrderLine>({ props, emit })
const axios = useAxios()

// call after every move — order travels as array position; mirroring it into sortOrder also survives a
// host prepareItem that hands back a freshly rebuilt array
function applyOrder() {
    items.value.forEach((row, index) => (row.sortOrder = index))
}

// not part of the parent's save — its own endpoint, then reflect what the server returned
async function toggleActive(row: OrderLine) {
    if (row.id < 0) {
        row.isActive = !row.isActive // unsaved row: local until the parent's save mints a real id
        return
    }
    const { data } = await axios.patch(`/order-lines/${row.id}`, { isActive: !row.isActive })
    row.isActive = data.isActive
}
</script>
```

**Alternative — two narrow endpoints (order _and_ state).** Give reordering its own call too, typically one
that takes `[{ id, sortOrder }]`, and leave the parent's save for add/remove. Choose it when order must
persist immediately without a form save, when the list is long enough that resaving the whole graph per drag
is wasteful, or when the parent form is expensive to submit. The rows stay owned — still `Related()`, still
no controller, still no extra registration slot — and the survive-the-parent-save rule above now applies to
both fields.

**Alternative — a separate endpoint for the child.** Promote it to its own registration when the rows are
managed on their own screen, need their own permissions, or are numerous enough to page. It costs a
registration slot, gives up editing rows before the parent is first saved, and creates a second write path
— safe only while the parent's input DTO omits the collection, which is exactly what the startup
write-authority warning checks.

Pick by **who owns the write**, not by which is least code: the default keeps one writer and one round trip,
the alternatives buy immediacy or independence and pay for it in endpoints and in fields you must protect.

**Verify the interaction, not the pieces** — whichever split you pick: change the independent field, then
reorder and save, then reopen. Each action passes on its own while the combination silently drops one of
them, so a test that exercises only one proves nothing about the split.

The server-side half of this contract (which writer owns which field, and the startup warning when two
of them claim the same rows) is in `Regira.Entities` → `entities.patterns` → _Owned children that are
both sortable and individually togglable_.

## Attachments (files) — offline add / rename / remove, confirm on save

File/picture management on an entity, staged **offline**: the user adds (browse or drop), renames, and
removes files inside the form, and **nothing hits the server until the parent is saved** — the `_deleted`
marked-delete discipline of an owned collection, extended to the upload/rename round-trip. It ships as a
shared **`entity-attachments` slice** — scaffold it once, then bind it in a tab on every file-owning entity:

```bash
node node_modules/@regira/modules/_template/scaffold.mjs <Entity> --attachments   # the slice + its wiring
node node_modules/@regira/modules/_template/scaffold.mjs --attachments            # → src/entities/entity-attachments/
```

The generated slice (full source: [entities.attachments.template.md](entities.attachments.template.md))
builds on four **shipped** primitives — never hand-roll them (verify in
[namespaces](entities.namespaces.md) / [signatures](entities.signatures.md)):

| Primitive                               | From                                     | Role                                                                                         |
| --------------------------------------- | ---------------------------------------- | -------------------------------------------------------------------------------------------- |
| `FileDropZone`                          | `@regira/modules/vue/ui`                 | drag-drop zone — emits `drop-files: Array<Blob>`, scoped slot `{ isDropping }`               |
| `useAxios().upload(url, [blob], data?)` | `@regira/modules/vue/http`               | multipart upload on the **shared, baseURL-aware** axios; field name defaults to **`"file"`** |
| `useAxios().getFile(url)`               | `@regira/modules/vue/http`               | authenticated download → `Blob`                                                              |
| `formatFileSize`, `fileToBlob`          | `@regira/modules/utilities/file-utility` | size label; re-wrap a blob under a new name                                                  |

> **Use `useAxios().upload`, not `FileHelper.send`.** `FileHelper.send` uses a **bare axios** — no
> `baseURL`, no auth interceptor — and its field name defaults to **`"files"`**. The attachment endpoint
> binds a parameter named **`file`**; upload against a relative URL with credentials. This mismatch (bare
> axios / absolute URL / `"files"`) is the classic attachment-upload trap.

**How it stages:** a picked/dropped file becomes a row with a **negative temp id** (like any new owned
row), its raw `Blob` held in memory, and an object `uri` for instant preview. Rename edits `newFileName`
(existing file) or `fileName` (new); remove toggles `_deleted` (undoable). On the parent's save, the flush
helpers re-wrap each blob under its edited name and `POST` it to `{api}/{id}/files`; existing rows marked
`_deleted` drop from the payload and are deleted by omission.

**Wire it into each file-owning entity** — the join field, the flush overrides + `_deleted` filter, and a
tab. The owner's service takes an `AxiosWithFilesInstance` (see [advanced example §13](entities.advanced.example.md)):

```ts
// data/Entity.ts
import type { Entity as EntityAttachment } from "../../entity-attachments"
attachments?: Array<EntityAttachment>
```

```ts
// data/EntityService.ts — flush on save; drop marked rows (deleted by omission)
import { insertWithAttachments, updateWithAttachments } from "../../entity-attachments/data/functions"
override async insert(item: Owner): Promise<Owner | undefined> {
    // the follow-up update sends the attachments in display order — the server assigns SortOrder from array position
    return await insertWithAttachments(this.config.api, item, () => super.insert(item), (saved) => super.update(saved))
}
override async update(item: Owner): Promise<Owner | undefined> {
    return await updateWithAttachments(this.config.api, item, () => super.update(item))
}
protected override prepareItem(item: Owner): Owner {
    item.attachments = item.attachments?.filter((x) => !x._deleted)
    return super.prepareItem(item)
}
```

```vue
<!-- details/Form.vue — attachments get their own tab -->
<template #files><EntityAttachments v-model="item.attachments" :readonly="readonly" /></template>
<!-- import { Overview as EntityAttachments } from "../../entity-attachments" -->
```

> **`<img src>` on a guarded download 401s** — the tag sends no `Authorization` header. Either preview from
> the in-memory `uri` (object URL) before upload, or expose the download **anonymously** on the back-end
> (`Regira.Entities` → _Public (anonymous) attachment downloads_). The list DTO nests file metadata under
> `attachment.*` (`item.attachment?.fileName`), not on the row root — read it there.

## Form validation & error handling

`useForm` returns the `feedback: FeedbackOut` it drives (`status`/`message`/`error` refs +
`pending(msg)`/`success(msg)`/`fail(msg, err?)`/`reset()`). `handleSubmit` already calls `pending("Saving…")` → `success("Saved")`,
or on failure `fail(...)` **and re-throws** — so wrap the call. The failure mapping is fixed:

| HTTP status | `feedback.message` | `feedback.error`                                                 |
| ----------- | ------------------ | ---------------------------------------------------------------- |
| `400`       | `"Saving failed"`  | the server's **`response.data.errors`** `{ field: message }` map |
| `404`       | `"Item not found"` | a string (`response.data.message` ‖ `error.message`)             |
| other       | `"Server error"`   | a string                                                         |

So only a `400` puts a per-field map on `feedback.error`. Combine **client-side** guards (validate before
saving) with that **server-side** map; render the summary with `<Feedback>` and the field map per input:

```vue
<!-- details/Form.vue -->
<script setup lang="ts">
import { ref } from "vue"
import { useForm, formDefaults, type FormEmits } from "@regira/modules/vue/entities"
import { Feedback, FeedbackStatus } from "@regira/modules/vue/ui"
import type Article from "../data/Entity"
import useEntityStore from "../data/store"

interface Emits extends /* @vue-ignore */ FormEmits<Article> {}
const emit = defineEmits<Emits>()
const props = withDefaults(defineProps<{ modelValue: Article; readonly?: boolean }>(), { ...formDefaults })

const { service: entityService } = useEntityStore()
const { item, feedback, handleSubmit } = useForm<Article>({ entityService, props, emit })

// client-side: validate before hitting the server
const errors = ref<Record<string, string>>({})
function validate(): boolean {
    errors.value = {}
    if (!item.value.title?.trim()) errors.value.title = "Title is required"
    if (item.value.price < 0) errors.value.price = "Price cannot be negative"
    return Object.keys(errors.value).length === 0
}
async function submit() {
    if (!validate()) {
        feedback.fail("Please fix the highlighted fields", errors.value)
        return
    }
    try {
        await handleSubmit()
    } catch {
        /* feedback already set by useForm; swallow the re-throw */
    }
}

// client errors first, then the server's 400 field map (a Record) on feedback.error
const fieldError = (name: string) => errors.value[name] ?? (typeof feedback.error.value === "object" ? feedback.error.value?.[name] : undefined)
</script>

<template>
    <form @submit.prevent="submit" novalidate>
        <Feedback :feedback="feedback" />
        <div class="mb-2">
            <label class="form-label">Title</label>
            <input v-model="item.title" class="form-control" :class="{ 'is-invalid': fieldError('title') }" />
            <div class="invalid-feedback">{{ fieldError("title") }}</div>
        </div>
        <div class="mb-2">
            <label class="form-label">Price</label>
            <input v-model.number="item.price" type="number" step="0.01" class="form-control" :class="{ 'is-invalid': fieldError('price') }" />
            <div class="invalid-feedback">{{ fieldError("price") }}</div>
        </div>
        <button type="submit" class="btn btn-primary" :disabled="feedback.status.value === FeedbackStatus.pending">Save</button>
    </form>
</template>
```

> For the per-field map to populate, the API must answer a `400` with body `{ errors: { Field: "message" } }`
> — Regira's `EntityControllerBase` produces exactly that from an `EntityInputException`'s `InputErrors`. On
> `404`/`500`, `feedback.error` is a plain string, so lean on the `<Feedback>` summary (`feedback.message`)
> instead. `FeedbackStatus` (`"" | "Pending" | "Success" | "Failed"`) comes from `@regira/modules/vue/ui`;
> gating the button on `FeedbackStatus.pending` prevents double-submits.

## Tabbed forms

<!-- how_to: key=split-form-into-tabs aliases=tab,tabs,tabbed,form,hash,route,related,children,split,big,heavy -->

**Default to tabs as soon as an entity form grows beyond a handful of fields or gains related data**
(owned children, links, trees, attachments): a main `#form` tab keeps the entity's own fields simple,
and each related collection gets its own tab — useful context without one endless page.

Split the form with `TabContainer` (from `vue/ui`); the scaffolded `Form.vue` already exposes
`initialTab` / `isPopup` for it. Pass `Tab.create(key, { icon, title, isDefault?, isDisabled? })` entries
and one `<template #key>` per tab. Always pass `:use-route-nav="!isPopup"` — the prop defaults to `false`, so
without it a refresh silently drops back to the first tab; with it the active tab mirrors to the URL hash
(deep-linkable, back-button aware). Returning `null` from the list drops a tab responsively:

```vue
<TabContainer :tabs="tabs" :active="initialTab" :use-route-nav="!isPopup">
    <template #form><FormSection>…</FormSection></template>
    <template #lines><LineOverview v-model="item" /></template>
    <template #files><AttachmentOverview v-model="item" /></template>
</TabContainer>
```

```ts
import { computed } from "vue"
import { useLang } from "@regira/modules/vue/lang"
import { Tab, useScreen } from "@regira/modules/vue/ui"

const { translate } = useLang()
const { screen } = useScreen()
const tabs = computed(() =>
    [
        Tab.create("form", { icon: "form", title: translate("form"), isDefault: true }),
        Tab.create("lines", { icon: "list", title: translate("lines"), isDisabled: !item.value.id }), // gate until saved
        !screen.isLarge ? Tab.create("files", { icon: "attachment", title: translate("files") }) : null,
    ].filter((t) => t)
)
```

Worked example: the `Vehicle` slice in [entities.advanced.example.md](entities.advanced.example.md) §5.

> **Dual-render for responsive forms:** render a section inline for large screens (`class="d-none d-lg-block"`)
> **and** expose the same component as a small-screen-only tab (`!screen.isLarge ? Tab.create(…) : null`) —
> one component, two placements, no duplication.

## Restyling & overriding the built-ins

The library's default styling is **deliberately plain — improving it is encouraged and expected.** Restyle
and restructure markup freely; what you preserve is the _contract_ (props/emits/slots, composable wiring,
`_deleted` marking, modal teleport, `rg-*`/`is-*` hooks, responsive behavior), never the look. The
canonical guide is the ui module's [ui.customize.md](../../ui/ai/ui.customize.md) — five layers,
cheapest first:

<!-- how_to: key=re-theme-the-app aliases=theme,theming,restyle,css,colors,accent,brand,branding,tokens,scss,bootstrap -->

- **L0 — theme tokens** — the app's `src/assets/theme.scss` (imported in `main.ts` **after** bootstrap
  and `@regira/modules/style.css`) overrides the `--rg-*` tokens (`--rg-accent-bg`, `--rg-deleted-bg`,
  backdrop, z-indexes) and Bootstrap's **component-level** vars. Precompiled Bootstrap 5.3 bakes its
  colors into per-component vars, so re-theme like `.btn-primary { --bs-btn-bg: var(--rg-accent); }` —
  overriding `:root { --bs-primary }` alone recolors almost nothing.
- **L1 — CSS only** — stable class hooks, no component changes: `rg-modal__header`, `rg-paging__page`,
  `.is-deleted` (pending-delete tint, incl. inside `InputSelectorInline`), `.is-selected`, a sticky
  `.form-toolbar` (`position: sticky; top: 0`), `.form-section` framing. Style the app-owned
  `.form-toolbar` wrapper, not `.form-buttons` — the latter is `FormButtonsRow`'s own root and the
  scaffold nests one inside the other, so a rule on it applies twice.
- **L2 — slots / wrap** — fill the typed slots, or wrap: e.g. a local `FormButtonsRow.vue` that renders
  the library one with translated labels (`$t`), then import the wrapper everywhere. Same props/events,
  richer skin.

<!-- how_to: key=reskin-a-built-in-component aliases=reskin,replace,skin,markup,eject,scaffold,component,custom,modal,branded -->

- **L3 — replace the skin** — a new SFC declaring the exported contract
  (`defineProps<XxxProps>`/`defineEmits<XxxEmits>`/`defineSlots<XxxSlots>`) with behavior from the
  exported `useXxx` composable; `vue-tsc` checks the fit. The modal swaps **app-wide** —
  `app.use(modalPlugin, { Modal: MyBrandedModal })` reaches every modal, including the ones inside
  library components (`ConfirmButton`, `ErrorSummary`, `LoginModal`, `useModal`/`FormModalButton` flows);
  `loadingPlugin { Loading }` does the same for the loading indicator. Under `registerComponentsGlobally`,
  pass the skin to the owning plugin (`pagingPlugin { Paging? }`, `iconPlugin { Icon?, IconButton? }`,
  `debugPlugin { Debug? }`, …) so the global name resolves to it.
- **L4 — eject the reference** — `node node_modules/@regira/modules/_template/scaffold.mjs --ui <Component>`
  (`--ui list` shows what's available — every imported built-in) copies the shipped skin into `src/components/ui/` with imports
  rewritten to public `@regira/modules/...` API; restyle the copy freely and keep the checklist in
  [ui.customize.md](../../ui/ai/ui.customize.md) (contract, `rg-*` hooks, **responsive unless the user
  asks otherwise**).

## Hierarchical (tree) entities

`useTree` builds a client-side `TreeList` from a **flat** array. `init(values, data, findParents)`:
`data` = all rows, `values` = the subset to highlight, and `findParents` (`IFindParents<T>` from
`@regira/modules/treelist`) returns each row's parent reference(s):

```ts
const { tree, nodes, ancestors, offspring, family, init } = useTree<Category>()
init(allCategories, allCategories, findParents) // findParents: IFindParents<Category> — see treelist guide
// render `nodes`: each TreeNode<T> exposes .value, .parent, .getOffspring(), .getAncestors()
```

Pair with `useDragDrop` for move/reparent and `buildNavigationTree` for nav menus; see the
[treelist module](../../../treelist/ai/treelist.instructions.md) for `TreeList` / `IFindParents`.

> **If the API already returns the hierarchy** (parent/children via `includes`, or a `parentId` on each
> row), you usually don't need `useTree` — render the nested `children` (or group by `parentId`) directly
> from the fetched data. Reach for `useTree` only when you have a flat list and must derive the tree client-side.

## Static / lookup data — `JSONService`

For small reference lists, extend `JSONService<T>` instead of `EntityServiceBase<T>`. It fetches the
list **once** and serves all reads/filters/paging from a shared in-memory cache (keyed by the third
ctor arg):

```ts
export class CountryService extends JSONService<Country> {
    constructor(axios: AxiosInstance, config: IConfig) {
        super(axios, config, Country.name)
    }
    override toEntity(item: object): Country {
        return Object.assign(this.createInstance(Country), item)
    }
}
```

> The cache is process-wide and keyed by the third arg — give each JSON service a unique key, and note
> it does not auto-refresh (mutations update the cache in memory). Use it for stable lookups, not
> frequently changing data.

## Pooling & the shared cache

`createStore(service, Entity.name)` wraps a service in a `PoolService` so all views share one reactive
cache of entities (`Ref<T>`), deduplicated by id. Views should always use the **store's** `service`,
not the raw IoC service. No cache registration is required — `usePooling` (and thus `createStore`)
defaults to the module-level `defaultPoolCache` singleton; the app shell registers that same singleton
in IoC by convention (`sp.add(PoolCache.name, () => defaultPoolCache)`) so other code can resolve it.
Mark types that should never expire via `cache.persistentTypes`.

The payoff is **live shared state**, not just fewer fetches: every consumer holds the _same_ `Ref<T>`, and a
save through the pooled `service` writes the result back into that ref in place (`cache.set`). So editing an
entity anywhere — a `FormModalButton` bound to the store's `service`, a details form, a bulk action —
re-renders every overview row, detail pane, and relation label that pooled it, with no manual refetch or
event wiring.

### Resolving relations with `fromPool`

`fromPool(input)` is the store accessor views use to turn an entity — or a **nested included relation** —
into its pooled counterpart. Pass a single object or an array; each input runs through `toEntity` and comes
back as the **canonical cached instance** for that `$id` (cached on first sight). It therefore does two jobs
at once:

1. **Rehydrates** a plain relation DTO into a real model instance, so the `EntityBase` getters (`$id`,
   `$title`, …) work — a nested relation arrives as plain JSON and lacks them otherwise.
2. **Deduplicates** to the one shared `Ref<T>`, so an edit to that entity anywhere reflects here.

Unsaved inputs pass straight through, unpooled (the `isNewEntity($id)` guard — `null`/`undefined`/`"new"`/
`""`/≤ 0). It needs an **object carrying `id`**, not a bare foreign-key number: `fromPool(item.unitType)`,
never `fromPool(item.unitTypeId)`. The canonical shape for a view's own rows is
`computed(() => fromPool(props.modelValue))`.

To render a **foreign relation's** label, alias a sibling entity's store `fromPool` and read the getter off
the result:

```ts
const { fromPool: getUnitType } = useUnitTypeStore()
// template: {{ getUnitType(item.unitType)?.$title }}
```

This is the supported way to show a related entity's `$title`, and it supersedes binding the raw DTO field
(`item.unitType?.title`): the returned instance is the shared, reactive one. The label resolves in full only
when that entity is already pooled — loaded by its own overview, or warmed by a preloader (`usePreloader`) —
**or** the nested DTO carries the display fields; otherwise the getter is `undefined`.

`fromCache(id?)` is the read-only counterpart: with an id it returns the cached `Ref<T>` (or `undefined`); with no
argument, every cached `Ref<T>` of the type (`Array<Ref<T>>`). It never fetches — it reports only what
pooling has already seen.

## Auth reload hooks (login-driven refresh)

In an auth-enabled app, data requested before the user logs in fails or comes back empty, so the
scaffolded `overview/Overview.vue` and `details/Details.vue` re-run their load on login.

⚠️ **The rule generalises: anything that fetches on mount must also react to login.** A dashboard, report or
home-page widget you write yourself mounts while the login modal is still open, short-circuits on
`!isAuthenticated`, and nothing re-triggers it — a blank panel, no console error, no failed request. Use the
hook below, or a watch, which also covers mounting _after_ login:

```ts
const authStore = useAuthStore()
watch(() => authStore.isAuthenticated, load, { immediate: true })
```

Slices scaffolded with `--no-auth` have these hooks stripped — and because `load` is destructured from
`useDetails` **only** to feed the Details hook, `--no-auth` also drops `load` from that destructure
(Overview's `searchHandler` stays: `useRouteOverview` uses it regardless). Re-add both the hook and its
binding when the app enables the auth plugin later:

```ts
// overview/Overview.vue — re-search on login / token refresh.
// `searchHandler` is already in the useSearchView destructure (useRouteOverview needs it) — nothing to re-add there.
import { useAuthStore } from "@regira/modules/vue/auth"

const authStore = useAuthStore()
authStore.$onAction(({ name, after }) => ["login", "refresh"].includes(name) && after(() => authStore.isAuthenticated && searchHandler(false)))
```

```ts
// details/Details.vue — load on login, only when nothing was loaded yet.
// Add `load` back to the existing useDetails destructure: const { item, …, load, feedback } = useDetails(service)
import { useAuthStore } from "@regira/modules/vue/auth"

const authStore = useAuthStore()
authStore.$onAction(({ name, after }) => name == "login" && after(() => item.value == null && authStore.isAuthenticated && load()))
```

The same primitive drives any other login-sensitive work — see
[auth.examples.md → Re-run work on login / refresh](../../auth/ai/auth.examples.md). A common one:
**preload the lookup/reference entities on login** so relation labels resolve app-wide —
`onAuthenticationChange: (isAuthenticated) => isAuthenticated && preload([Country, UnitType])` (the
`usePreloader` primitive) instead of every view fetching them lazily.

## Navigation from the config map

Each `setup.ts` stores its `IConfig` in `app.config.globalProperties.$configs[Entity.name]`. Build menus
from that map:

```ts
const configs = Object.values(app.config.globalProperties.$configs) as Array<IConfig>

// importDashboard: groups + entities grouped under a group id ([groupId, entityKeys])
const dashboard = importDashboard({
    groups: [{ id: "Catalog", title: "catalog", icon: "catalog" }],
    entities: [["Catalog", ["Article", "Category"]]], // Array<[groupId, Array<entityKey>]>
    configs,
    hasAccess: () => true, // (config: IConfig) => boolean
})
// importNavbar: each entry is an entityKey, or [groupId, entityKeys] for a submenu
const navbar = importNavbar({
    groups: [{ id: "Catalog", title: "catalog", icon: "catalog" }],
    entities: ["Article", ["Catalog", ["Category"]]], // Array<string | [groupId, Array<entityKey>]>
    configs,
    hasAccess: () => true,
})
const tree = buildNavigationTree([...dashboard, ...navbar]) // → TreeList<INavCore> to render the menu
```

> **Keys are `config.key`, not `Entity.name`.** Each `entities` entry (`"Article"`, `["Catalog", ["Category"]]`)
> matches a config by its **`key`** — the literal string set in `config.ts`; use that, not `Entity.name`
> (minified in a production build). An entry matching no config `key`, or a group id absent from `groups`, is
> skipped with a `console.warn` instead of crashing the shell.

> Prefer the lower-level primitives when the importer inputs feel heavy: `createNavGroup({ id, title, icon })`
> and `createNavItem(config, parentId?)` build `INavCore` items directly, then `buildNavigationTree(items)`.

## Custom query params (and the `$` rule)

Anything you put on the search object is sent as a query param (arrays → repeated keys). Keys starting
with **`$`** are stripped by `cleanQueryParams` — use the `$` prefix for client-only/meta values you do
_not_ want on the wire.

## Type the client from the API's OpenAPI

When the back-end already exposes OpenAPI (every Regira `*.Web` API does, at `/openapi/v1.json`),
generate the **DTO/payload types** from it and feed them into your models. You still hand-write the model
classes — the client needs real classes with `$id` / `$title` getters and `toEntity` — but their nested
/related fields and your form payloads then stay in lock-step with the server contract.

```bash
# run once, or wire it as a "predev" / "prebuild" npm script.
# openapi-typescript@7 peers typescript@^5 — run it isolated via npx (don't add it as a dep) so it can't clash with your TS 6 toolchain.
npx -p openapi-typescript@7 -p typescript@5 openapi-typescript http://localhost:5001/openapi/v1.json -o src/api/schema.d.ts
```

```ts
// src/api/types.ts — friendly aliases over the generated schema
import type { components } from "./schema"
export type ArticleDto = components["schemas"]["ArticleDto"]
export type CategoryDto = components["schemas"]["CategoryDto"]
```

```ts
// data/Article.ts — the class the entities layer needs, typed from the DTO
import { EntityBase } from "@regira/modules/vue/entities"
import type { CategoryDto } from "@/api/types"

export class Article extends EntityBase {
    id = 0
    title = ""
    categories?: CategoryDto[] // nested shapes come from OpenAPI, in sync with the server
    override get $id() {
        return this.id || "new"
    }
    override get $title() {
        return this.title
    }
}
```

> **Flag-enums serialize as numbers.** `includes` / `sortBy` come through `openapi-typescript` as
> `number`, but Regira APIs accept them **by name** in the query string — pass the enum member name(s),
> e.g. `includes: ["Categories"]`, not the numeric value. The valid names are the enum members in the
> OpenAPI schema (what the back-end `EntityIncludes` defines); verify them against your API rather than
> guessing (an unknown include name returns `400`) — `includes: ["All"]` is the catch-all, and a **last
> resort**: it eager-loads every gated collection onto every list row, so name the one flag you need.
> (`All` also has to be declared by that enum, or it 400s like any other unknown name.) Keep a small `const` map on the client for these
> instead of the generated numeric type. (Run the generator via `npx openapi-typescript` to avoid TS
> peer-dep conflicts; see the tsconfig note in [entities.setup.md](entities.setup.md#install).)

## Debug panel (dev-only)

`debugPlugin` (installed in `main.ts` with `{ isDebug }`) exposes `$isDebug` / `$setDebug`, and with
`configureGlobals({ registerComponentsGlobally: true })` a global `<Debug>` component. Drop it into any form or
details view to dump the live payload — it self-gates on `$isDebug` (no `v-if` needed) and stays out of production:

```vue
<Debug title="product" :modelValue="{ item, unitType: item.unitType?.title }" />
```

`$isDebug` turns on via `$setDebug(true)` or `?debug=1` and is reactive, so panels appear/disappear live. Curate
the `modelValue` to what you're debugging (resolved relations, paging state), not the raw model. The app shell's
`AppDebug` bar (screen / route / culture, `$setDebug(false)` to close) is the same mechanism.

## See also

- [entities.examples.md](entities.examples.md) · [entities.signatures.md](entities.signatures.md) ·
  [entities.instructions.md](entities.instructions.md)
