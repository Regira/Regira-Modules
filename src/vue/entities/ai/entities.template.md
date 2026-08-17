# Regira Entities — New Entity Slice Template (scaffold)

A **blank fill-in-the-blanks scaffold** for one entity slice. Copy the folder set, then fill the `(c)`
placeholders below (the files marked `// TODO`). The placeholder entity is **`Foo`** (resource `"/foos"`,
route prefix `foos`) — rename it to your entity throughout.

`scaffold.mjs <Entity>` derives the folder, client route and `api` path as the **kebab-case plural** of the
class name (`InterventionType` → `intervention-types`), matching the conventional `[Route(...)]`. The first two
flags generate what would otherwise be hand-written and are worth passing up front:

| Flag                | Generates                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--api <path>`      | a resource path that differs from the folder name (`--api relationship-types`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `--rel <Related>`   | everything a to-one relation needs: an overview column (the related entity's `FormModalButton` + a `fromPool` label), the FK and nested field on the model, **and its advanced filter** — a scalar `<field>Id` on the `SearchObject` plus an `InputSelector` in `FilterAdv.vue`, with the backing ref and a `handleReset` that clears it. Repeatable; the related slice must exist first. A differently-named FK takes a trailing `--as <field>` (`--rel Employee --as assignedToEmployee`). A `--rel` naming the entity itself is skipped — the generated imports would cycle into the slice's own barrel; wire a self-relation by hand (FK field + a relative deep import of the slice's own `selecting/InputSelector.vue`) |
| `--owns <Child>`    | an editable owned-collection sub-slice (`useOwnedCollection`, `_deleted`-marked rows) for a back-end `e.Related(...)` child. Repeatable; also works on an existing slice. Trailing `--as <field>` sets the JSON key                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| `--fk <fkName>`     | the owned child's FK property to the parent, when the C# property is not named after the parent class (default: camelCase parent + `Id`, `QCreditRequest` → `qCreditRequestId`; a C# property `RequestId` takes `--fk requestId`). Chains after its `--owns`, with `--as`. Editable-table sub-slices only — a `--picker` join carries no parent FK on the client                                                                                                                                                                                                                                                                                                                                                              |
| `--picker <Target>` | the `--owns` before it is a **pure join** onto `<Target>` — only the two FKs, no scalar fields of its own: emit `InputSelectorInline` chips selecting `<Target>` instead of an editable table, over a plain join-row interface. Chains after `--as`; the picked slice must exist first. A join row that also carries a scalar (a quantity, a status) is not pure — leave `--picker` off                                                                                                                                                                                                                                                                                                                                       |
| `--attachments`     | with an entity named, that entity owns files: the shared `entity-attachments` slice is scaffolded (once per app) and wired into the slice — the `attachments` field, the `insert`/`update` overrides, and the `prepareItem` filter that drops rows the user marked for deletion. Alone, it scaffolds the shared slice only. The form tab stays yours to place                                                                                                                                                                                                                                                                                                                                                                 |
| `--overwrite-slice` | **re-scaffolds a slice that already exists**, customized `(c)` files included. `--force` deliberately does **not** apply to slices, so without this flag a re-run aborts with `already exists`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |

⚠️ `--overwrite-slice` is destructive: it replaces your filled-in `(c)` files. A nested **owned sub-slice**
survives unless this run repeats its `--owns` (the run names the ones it kept); everything the template
itself emits is replaced. To add an owned sub-slice to an existing slice, pass `--owns <Child>` alone —
only the sub-slice is generated.

> **Indicative, not prescriptive.** The templates fix the _functional wiring_ (service ↔ store ↔ composable ↔
> `IConfig`, DI, routing) so a scaffolded slice is green out of the box — the **markup, columns, layout, and
> styling are yours to restructure and restyle freely**, and the generated views may be **replaced with
> components of your own design**. What a replacement keeps is the _functionality_, enumerated in
> [entities.instructions.md](entities.instructions.md) → _Functionality contract_ — for a slice, chiefly:
> server-side paging + a total count + filtering on the overview, a create/edit affordance per
> `config.isComplex`, a **confirmed** delete, a way to **open every displayed related record** (not a bare
> text label), a server-searched relation picker rather than a load-everything dropdown, and relation labels
> resolved through `fromPool` so they stay reactive.
>
> Preserve the composable/service contract, the `(c)`
> fill-ins, and these **slice behaviours that live in the components, not their CSS** — restyle the markup, but
> keep the behaviour or reuse the component:
>
> - **Form action buttons** — reuse the library `FormButtonsRow` (`@regira/modules/vue/ui`): it ships the icons,
>   the solid `btn-primary` / `btn-secondary` / `btn-danger` variants, and a **confirmed** delete
>   (`ConfirmButton`). Re-emitting plain `<button>`s loses all three.
> - **Removing a persisted owned/related row marks `_deleted`** — the row stays (tinted) until save. The
>   library `InputSelectorInline` (`@regira/modules/vue/entities`) is the default chip editor for these rows
>   (it toggles the mark for persisted rows, removes rows added this session outright, and hands the picker an
>   `exclude` list); `useListItemInput` toggles the mark in custom row editors. A per-collection
>   `prepareItem` override then filters the marked rows out on write (the base `prepareItem` strips only
>   top-level `_` keys, so a marked child row is otherwise still sent). Never `splice` a persisted row, or
>   the server never sees the delete.
> - **A relation picker adds on `@select`** — the event only emits the chosen row; append it to the bound array
>   yourself, and mark `_deleted` to remove (see [entities.patterns.md](entities.patterns.md)).
> - **Edit/create popups use `FormModalButton`** (teleporting into `#modals`) — wire the "New" action the same
>   way as a row's edit, or the button opens nothing.
> - **The `(c)` views bind the placeholder `title` / `searchObject.title`** — every model or search-object
>   edit must rebind `Form.vue` / `FilterAdv.vue` / `List(Item).vue` in the same pass, or the next
>   `vue-tsc` build fails on the stale placeholders.

This is the _skeleton_. For the same files **filled in with real code**, see
[entities.examples.md](entities.examples.md) (a simple `UnitType` slice and a standard `Product` slice).
The **app shell** that hosts these slices (project structure, `main.ts`, router, navigation) has its own
scaffold — `scaffold.mjs --shell` ([entities.shell.template.md](entities.shell.template.md)); this file is
only the per-entity slice.

> **Reading order:** [instructions](entities.instructions.md) → [setup](entities.setup.md) (new app) →
> [namespaces](entities.namespaces.md) → [signatures](entities.signatures.md) →
> [examples](entities.examples.md) / [advanced.example](entities.advanced.example.md) → **template (this
> file — scaffold a new entity)** → [patterns](entities.patterns.md) (recipes).
>
> **Never guess** a `@regira/modules` import — verify it in [entities.namespaces.md](entities.namespaces.md).

## How to use

The full slice ships as a **copy-on-disk template** in the package — scaffold it, don't hand-write the files:

```bash
node node_modules/@regira/modules/_template/scaffold.mjs Product             # → src/entities/products/
node node_modules/@regira/modules/_template/scaffold.mjs Product --no-auth   # no-auth app: also strips the auth-store hooks
```

(or copy `node_modules/@regira/modules/_template/entity-slice` and replace the `__Entity__` / `__entities__`
/ `__entity__` tokens.) Then:

1. Customize the **`(c)`** files (§ below) — the only ones tailored to your entity; leave the rest as-is.
2. Register the slice's `plugin` in `src/entities/index.ts` — see
   [entities.setup.md → Add entities](entities.setup.md#add-entities).
3. Run `npm run build` (not just a `--noEmit` type-check) — a freshly scaffolded slice must build green
   before you customize.

> **Nested relation columns:** only the root item is hydrated into an `EntityBase`, so `item.bar?.$title`
> on a nested relation is `undefined` — **never** read `$title` off the raw relation. Prefer resolving it
> through the sibling store's pool helper so the label stays reactive to edits —
> `const { fromPool: getBar } = useBarStore()`, then `{{ getBar(item.bar)?.$title }}`; the raw projected
> field (`item.bar?.title`) is the static fallback
> (see [entities.instructions.md → Item hydration](entities.instructions.md#item-hydration)).

The skeletons below are the same `(c)` files the scaffold writes (placeholder `Foo`) — a reference for what
to fill in.

## File tree

`(c)` = **you customize this per entity** (placeholder shown below). The rest is boilerplate (copy as-is).

```
src/entities/foos/               # one entity slice — copy this folder set for every entity
    config/
        config.ts (c)            # IConfig — api URLs, key, paging, titles, icon
    data/
        Entity.ts (c)            # model class — extends EntityBase (fields + $id/$title)
        EntityService.ts         # extends EntityServiceBase<Entity> { toEntity } (+ prepareItem for children)
        store.ts                 # Pinia store — createStore(get(Entity.name)!, Entity.name)
    filter/
        SearchObject.ts (c)      # extends SearchObjectBase — your filter fields
        Filter.vue               # filter shell (inline bar + advanced modal)
        FilterInline.vue         # inline keyword bar
        FilterAdv.vue (c)        # advanced search form — your filter inputs
    overview/
        Overview.vue             # useSearchView + useRouteOverview (the list page)
        List.vue (c)             # results table — your columns
        ListItem.vue (c)         # one result row — your columns
    details/
        Details.vue              # useDetails — loads :id, hosts Fiche/Form
        Form.vue (c)             # useForm — your create/edit form
        FormModalButton.vue      # opens the Form in a modal (simple-entity new/edit)
    selecting/
        SelectorList.vue (c)     # selectable results list — your columns
        Autocomplete.vue         # } the relation-picker set: lets OTHER entities pick this one.
        InputSelector.vue        # } Byte-identical for every entity — never customized.
        Selector.vue             # } Copy verbatim (see §Boilerplate below).
        SelectorDropdown.vue     # }
        SelectorModalButton.vue  # }
        SelectorSearch.vue       # }
    index.ts                     # barrel — re-export config, Entity, service, views, plugin
    setup.ts                     # createRoutes() + addServices() + addIcons() + install plugin
```

> Build order is the [Entity Implementation Workflow](entities.instructions.md#entity-implementation-workflow):
> model → config → service → store → search object → filter → overview → details → form → selecting →
> barrel → setup.

---

# Customize these — `(c)` files

## `data/Entity.ts` (c)

```ts
import { EntityBase } from "@regira/modules/vue/entities"

export class Foo extends EntityBase {
    id: number = 0 // Guid/string-keyed API entity → `id: string = ""`; the rest of the entity slice is key-generic (owned child rows stay int)
    title = "" // placeholder label — rename/remove it here AND in the (c) views that bind it (Form, List/ListItem, SelectorList)
    // TODO: your fields — initialize non-optional ones (strictPropertyInitialization); optional ones get `?`, e.g.
    // code?: string
    // barId?: number
    // bar?: Bar                          // a related entity — import another slice's model ALIASED:
    //                                    //   import type { Entity as Bar } from "@/entities/bars"
    //                                    //   (barrels export the model as `Entity`; `{ Bar }` is the TS2305 trap)
    //                                    // `import type`, not `import { type … }`: the inline form survives to
    //                                    // runtime and two slices referencing each other then cycle through
    //                                    // store.ts's Entity.name — dev-server only, build stays green
    // status?: Status                    // mirror a C# enum as a const object + union type, never a TS `enum`
    //                                    // (erasableSyntaxOnly rejects enums — see entities.setup.md → Tooling)
    // ⚠️ fields the API projects must be plain assignable properties — a class getter named after a
    //    JSON key (a `get fullName()` mirroring a projected fullName) makes hydration throw at runtime;
    //    vue-tsc stays green

    created?: Date
    lastModified?: Date

    override get $id(): string | number {
        return this.id || "new" // "new" (or null) marks an unsaved instance → save() inserts
    }
    override get $title(): string | undefined {
        return this.title // TODO: the human label (selectors, breadcrumbs, nav)
    }
}

export const Entity = Foo // the barrel name other slices import — `import type { Entity as Foo } from "@/entities/foos"`, never `{ Foo }`
export default Foo
```

## `config/config.ts` (c)

```ts
import type { IConfig } from "@regira/modules/vue/entities"
import Entity from "../data/Entity"

// Relative to the axios baseURL, and must equal the server's [Route(...)] exactly — repeating the base here
// sends requests to /api/api/... See entities.setup → The URL contract.
const api = "/foos"

const config: IConfig = {
    id: Entity.name,
    key: "Foo", // TODO: route-name prefix + icon key (conventionally = Entity.name)
    isComplex: true, // create/edit on a Details PAGE (default). Set false ONLY for a very basic entity — a few scalar
    //                  fields, no relations/tabs — that is fine to edit in a modal (FormModalButton). See entities.card → page vs modal.

    routePrefix: "foos", // TODO: URL path segment
    baseQueryParams: {}, // add includes ONLY for a COLLECTION the API gates behind its named [Flags] enum, e.g. { includes: ["Lines"] }; a to-one shown on every row belongs in the API's unconditional e.Includes instead
    initialQuery: {}, // route query for the GENERATED nav link ONLY — lost on refresh/deep-link. A default sortBy or includes belongs in baseQueryParams

    overviewTitle: "foos", // camelCase i18n keys (multi-word → e.g. shoppingLists / shoppingList) — add matching entries to public/data/translations.json, or the nav renders the raw key
    detailsTitle: "foo",
    description: "foo.description",
    icon: "bi bi-question-circle", // TODO: a Bootstrap-Icons class

    defaultPageSize: 10, // initial overview page size (raise it to show more per page, up to the server's MaxPageSize)

    api, // every *Url below defaults to `api` when omitted; keep only the ones you override
    searchUrl: api + "/search", // counted search endpoint — the overview pages through it (every controller exposes /search)
    saveUrl: api, // resource base — update/remove append /{$id} themselves
}

export default config
```

## `filter/SearchObject.ts` (c)

> Keep the class name **`EntitySearchObject`** — it is **not** renamed per entity (the barrel and consumers
> import it as the module default).

```ts
import { SearchObjectBase, ArchivedFilter } from "@regira/modules/vue/entities"

export class EntitySearchObject extends SearchObjectBase {
    // `q` (free-text) is inherited from SearchObjectBase. Add your filters:
    title?: string // TODO: your filter fields — placeholder; rename/remove it here AND in FilterAdv.vue
    // barId?: number                     // an FK filter bound to an <InputSelector> must be a SCALAR — the
    //                                    // control speaks one id (`idValue?: number | string`), so widening it
    //                                    // to an array is 9 TS2322s in FilterAdv.vue
    // tagId?: number | Array<number>     // arrays serialize as repeated query keys — for filters you populate
    //                                    // from code or a multi-select, not from an InputSelector. The API
    //                                    // accepts both (its ICollection<TKey> binds one value or many), so
    //                                    // widening later is a UI-only change

    minCreated?: Date // `Date` is fine here — the query-string builder emits ISO-8601 with the local offset
    maxCreated?: Date
    archived?: ArchivedFilter // `only` = recycle bin, `included` = live + archived; leave unset to hide archived rows
}

export default EntitySearchObject
```

## `filter/FilterAdv.vue` (c)

⚠️ **Every input must be wired to `handleUpdate`.** A native `<input>` takes `@change="handleUpdate"`; a
custom component (`InputSelector`, `NullableCheckBox`, `DateInput`) emits Vue events only, so it needs an
explicit `@select="handleUpdate"` / `@update:modelValue="handleUpdate"` — otherwise picking a value leaves
both the result list and the count showing the previous search. Never deep-`watch` the search object as a
substitute: it refetches on every keystroke.

```vue
<template>
    <div class="adv-filter">
        <!-- top row: result count (left) + clear (right) — the overview-filter convention; keep it -->
        <div class="row">
            <div class="col mb-2" v-if="resultCount != null">
                <span class="text-info">{{ resultCount }} {{ $t("results") }}</span>
                <small v-if="filterIsActive" class="ms-2 italic-muted">({{ $t("filtersAreApplied") }})</small>
            </div>
            <div class="col mb-2 text-end">
                <IconButton icon="clear" :showText="true" @click="handleReset" />
            </div>
        </div>

        <!-- keywords (free-text q) -->
        <input v-model.lazy.trim="searchObject.q" class="form-control mb-2" :placeholder="$t('keywords')" @change="handleUpdate" />

        <!-- TODO: one input per SearchObject filter field (placeholder `title` — keep in sync with SearchObject.ts).
             Native <input> → @change="handleUpdate". A custom component (InputSelector, NullableCheckBox,
             DateInput) emits Vue events only → @select="handleUpdate" / @update:modelValue="handleUpdate",
             or the results and the count go stale. A checkbox filter needs its own label — pass `label`
             (with an `id`, so clicking the text toggles the box). e.g.:
                 <BarInputSelector v-model="bar" v-model:idValue="searchObject.barId" @select="handleUpdate" />
                 <NullableCheckBox v-model="searchObject.isActive" id="isActive" :label="$t('isActive')" @update:modelValue="handleUpdate" /> -->
        <input v-model.lazy.trim="searchObject.title" class="form-control mb-2" :placeholder="$t('name')" @change="handleUpdate" />
    </div>
</template>

<script setup lang="ts">
import { IconButton } from "@regira/modules/vue/ui"
import { useFilter, type FilterEmits } from "@regira/modules/vue/entities"
import SearchObject from "./SearchObject"

interface Emits extends /* @vue-ignore */ FilterEmits<SearchObject> {}
const emit = defineEmits<Emits & { "update:modelValue": (v: SearchObject) => true; filter: (v: SearchObject) => true; close: () => void }>()
defineProps<{ resultCount?: number }>()

const searchObject = defineModel<SearchObject>({ required: true })
// handleUpdate = sync the model + re-run the search; bind it on EVERY input above.
const { handleReset, handleUpdate, filterIsActive } = useFilter({ searchObject, emit, Constructor: SearchObject })
</script>
```

## `overview/List.vue` (c)

**The column budget.** The overview earns its keep by showing the most important **other** fields next to
`$title` — but the row must fit the viewport at every breakpoint, so the budget is fixed and small. Fill the
slots in order; delete the ones you don't use. Headers here and cells in `ListItem.vue` must carry
**identical** classes, or the columns stop lining up.

| Slot                             | Classes                   | Shown from |
| -------------------------------- | ------------------------- | ---------- |
| edit affordance                  | `col-auto`                | always     |
| primary label (`$title`)         | `col text-truncate`       | always     |
| 2nd field / 1st `--rel` relation | `col d-none d-md-block`   | ≥ md       |
| 3rd field / 2nd relation         | `col d-none d-lg-block`   | ≥ lg       |
| 4th field / 3rd relation         | `col d-none d-xl-block`   | ≥ xl       |
| `created`                        | `col-2 d-none d-lg-block` | ≥ lg       |
| delete                           | `col-auto`                | always     |

⚠️ **`col-auto` sizes to its own content, so identical classes are not enough.** A header cell reading
"Created" and a row cell reading "27/07/2026" sit **23px** apart, and every column after them shifts — by a
different amount on every row. Use `col-auto` only where header and row render the _same_ box: the two action
cells. Every data column takes a flexible `col` or a fixed grid width (`col-2`, `col-3`, …).

⚠️ **Never put a fixed `width` on a `.row` child.** Bootstrap gives `.row > *` `flex-shrink: 0` and
`.75rem` horizontal padding under `box-sizing: border-box`, so `style="width: 3rem"` leaves a **24px**
content box while a library `ConfirmButton` / `IconButton` renders a 42px `.btn` — and neither shrinks, so
the row pushes the page sideways. A cell holding one `.btn` needs **≥ 4.5rem**.

```vue
<template>
    <div class="entity-list">
        <div class="row fw-bold border-bottom pb-2">
            <div class="col-auto">
                <!-- header spacer: carries the SAME classes as ListItem.vue's edit affordance, so the columns
                     line up — a `.btn`'s transparent 1px border and line-height are part of that width, and
                     dropping them misaligns the header by ~2px. Inert markup on purpose (`.disabled` = no
                     pointer events) — a disabled FormModalButton here would mount a useModal + a <Teleport> per list. -->
                <span v-if="config.isComplex" class="btn btn-link p-1 disabled"><Icon name="edit" /></span>
                <button v-else type="button" class="btn btn-default" disabled><Icon :name="config.key" /></button>
            </div>
            <div class="col">{{ $t("name") }}</div>
            <!-- TODO: the 1–3 most important OTHER fields, in this reveal order (`scaffold.mjs --rel <Related>`
                 already wrote a header above for each relation). Uncomment what you use, rename the keys and
                 add them to translations.json, delete the rest — no fourth slot, and never an inline `width`.
            <div class="col d-none d-md-block">{{ $t("code") }}</div>
            <div class="col d-none d-lg-block">{{ $t("status") }}</div>
            <div class="col d-none d-xl-block">{{ $t("owner") }}</div>
            -->
            <div class="col-2 d-none d-lg-block">{{ $t("created") }}</div>
            <div class="col-auto">
                <!-- mirrors ListItem's ConfirmButton (`btn` + Icon): the `.btn` box is what makes this
                     header cell the same width as the row's, so the trailing edges line up. `disabled`
                     on a span is inert without being focusable. -->
                <span class="btn disabled text-muted"><Icon name="delete" /></span>
            </div>
        </div>
        <ListItem
            v-for="(item, i) in items"
            :key="item.$id"
            v-model="items[i]!"
            :readonly="readonly"
            @request-save="$emit('request-save', $event)"
            @request-remove="$emit('request-remove', $event)"
            @save="$emit('save', $event)"
            @remove="$emit('remove', $event)"
        />
    </div>
</template>

<script setup lang="ts">
import { computed } from "vue"
import { Icon } from "@regira/modules/vue/ui"
import type { OverviewEmits } from "@regira/modules/vue/entities"
import config from "../config/config"
import type Entity from "../data/Entity"
import useEntityStore from "../data/store"
import ListItem from "./ListItem.vue"

interface Emits extends /* @vue-ignore */ OverviewEmits<Entity> {}
const emit = defineEmits<Emits>()
const props = defineProps<{ modelValue?: Array<Entity>; readonly?: boolean }>()

const { fromPool } = useEntityStore() // resolve rows through the shared pool (reactive cache)
const items = computed<Array<Entity>>({
    get: () => fromPool(props.modelValue || []),
    set: (value) => emit("update:modelValue", value),
})
</script>
```

## `overview/ListItem.vue` (c)

```vue
<template>
    <div class="row border-bottom py-2">
        <div class="col-auto">
            <!-- Row-edit affordance follows config.isComplex: a real entity (page) links to its Details route;
                 a very basic entity (modal) opens FormModalButton. Forward @remove either way so a delete from
                 inside the modal refreshes the pooled overview — without it the deleted row lingers until reload. -->
            <RouterLink v-if="config.isComplex" :to="{ name: config.key + 'Details', params: { id: item.$id } }" class="btn btn-link p-1">
                <Icon name="edit" />
            </RouterLink>
            <FormModalButton v-else v-model="item" @save="$emit('save', $event)" @remove="$emit('remove', $event)" />
        </div>

        <div class="col text-truncate">{{ item.$title }}</div>
        <!-- TODO: mirror List.vue's header slots 1:1 — same classes, same order, `text-truncate` on every
             text cell. A relation cell is the related entity's FormModalButton + its pooled label
             (`scaffold.mjs --rel <Related>` already wrote one above per relation); plain text is the
             exception — see entities.patterns.md → Resolving relations with fromPool.
        <div class="col d-none d-md-block text-truncate">{{ item.code }}</div>
        <div class="col d-none d-lg-block text-truncate">{{ item.status }}</div>
        <div class="col d-none d-xl-block text-truncate">{{ item.reference }}</div>
        -->
        <div class="col-2 d-none d-lg-block text-truncate">{{ formatDate(item.created) }}</div>

        <div class="col-auto">
            <ConfirmButton icon="delete" :modal-type="ModalType.danger" @confirm="$emit('request-remove', item)">
                {{ $t("deleteItem", { title: item?.$title }) }}
            </ConfirmButton>
        </div>
    </div>
</template>

<script setup lang="ts">
import { RouterLink } from "vue-router"
import { ModalType, ConfirmButton, Icon } from "@regira/modules/vue/ui"
import { formatDate } from "@regira/modules/vue/formatters"
import type { SaveResult } from "@regira/modules/vue/entities"
import config from "../config/config"
import Entity from "../data/Entity"
import FormModalButton from "../details/FormModalButton.vue"

const emit = defineEmits<{
    (e: "update:modelValue", value: Entity): void
    (e: "save", value: SaveResult<Entity>): void
    (e: "remove", value: Entity): void
    (e: "request-save", value: Entity): void
    (e: "request-remove", value: Entity): void
}>()
defineProps<{ readonly?: boolean }>()

const item = defineModel<Entity>({ required: true })
</script>
```

## `details/Form.vue` (c)

```vue
<template>
    <!-- Built-ins are the slice defaults — hand-rolling feedback/buttons/tabs/debug/owned-row editors is a deviation (see entities.card). -->
    <form @submit.prevent="handleSubmit">
        <!-- Action bar: save/delete buttons, the back-to-overview link (a page form must offer the way back), feedback. -->
        <!-- order-*: on md+ the overview / pop-out link moves to the END of the row (order-md-3) and the
             feedback fills the middle — without them both land mid-row, next to the save buttons. -->
        <div class="row form-toolbar align-items-center mb-3">
            <div class="col col-md-auto order-1">
                <FormButtonsRow
                    :item="item"
                    :readonly="readonly"
                    :feedback="feedback"
                    :show-delete="item?.id > 0"
                    @cancel="handleCancel"
                    @remove="handleRemove"
                    @restore="handleRestore"
                />
            </div>
            <div class="col-auto order-2 order-md-3">
                <!-- In a modal (isPopup) there is no overview to return to — offer a pop-out to the full page instead. -->
                <RouterLink
                    v-if="isPopup"
                    :to="{ name: `${config.key}Details`, params: { id: item.$id } }"
                    target="_blank"
                    class="btn btn-outline-secondary"
                    :title="$t('popOut')"
                >
                    <Icon name="popOut" />
                </RouterLink>
                <RouterLink v-else-if="overviewUrl" :to="overviewUrl" class="btn btn-outline-info">
                    <Icon name="list" /> <span class="d-none d-md-inline ms-1">{{ $t("overview") }}</span>
                </RouterLink>
            </div>
            <!-- useForm drives `feedback` (Saving… → Saved / 400 field-map); render it here or the save shows nothing. -->
            <div class="col-md order-3 order-md-2"><Feedback :feedback="feedback" /></div>
        </div>

        <!-- Heavier form? Wrap sections in <TabContainer :tabs="tabs" :active="initialTab" :use-route-nav="!isPopup">
             with one <template #key> per Tab.create(...) — see entities.advanced.example.md §5. -->
        <FormSection :title="$t(config.detailsTitle || '')" :readonly="readonly">
            <!-- TODO: your fields, e.g. -->
            <div class="mb-2">
                <input v-model="item.title" :readonly="readonly" class="form-control" />
                <FormLabel :label="$t('name')" />
            </div>
            <!-- single relation (FK) → the related entity's InputSelector, e.g. <BarInputSelector v-model="item.bar" v-model:idValue="item.barId" /> -->
            <!-- many-to-many / owned rows → InputSelectorInline (@regira/modules/vue/entities): chips that mark
                 _deleted (undoable until save) with the related entity's FormModalButton inside, adds via its
                 InputSelector + exclude; filter _deleted rows in EntityService.prepareItem. The multi-Selector
                 hard-removes — don't use it here. See entities.patterns.md → owned-m2m recipe. -->
            <!-- child collections go here, e.g. <ChildOverview v-model="item" /> (see entities.advanced.example.md) -->
            <!-- ⚠️ but NOT a component that brings its own <FormSection>: it would render a titled panel
                 inside this one. The attachments overview is exactly that — it owns the "files" section, so
                 place it after </FormSection> below, or in its own <template #files> in a tabbed form. -->
        </FormSection>

        <!-- <Debug> dumps the live payload, self-gated on $isDebug (?debug=1) — inert in production; curate the payload. -->
        <Debug :modelValue="{ item }" />
    </form>
</template>

<script setup lang="ts">
import { RouterLink, type RouteRecordRaw } from "vue-router"
import { Feedback, FormButtonsRow, FormSection, FormLabel, Icon } from "@regira/modules/vue/ui"
import { Debug } from "@regira/modules/vue/debug"
import { useForm, type FormEmits, formDefaults } from "@regira/modules/vue/entities"
import config from "../config/config"
import Entity from "../data/Entity"
import useEntityStore from "../data/store"

interface Emits extends /* @vue-ignore */ FormEmits<Entity> {}
const emit = defineEmits<Emits>()
const props = withDefaults(
    defineProps<{ modelValue: Entity; readonly?: boolean; overviewUrl?: string | RouteRecordRaw; isPopup?: boolean; initialTab?: string }>(),
    { ...formDefaults }
)

const { service: entityService } = useEntityStore()
const { item, feedback, handleCancel, handleSubmit, handleRemove, handleRestore } = useForm<Entity>({ entityService, props, emit })
// the form's handleRemove() takes NO argument (it removes item.value) — unlike the overview's handleRemove(item)
</script>
```

## `selecting/SelectorList.vue` (c)

```vue
<template>
    <div class="entity-list">
        <div class="row fw-bold border-bottom pb-2">
            <div class="col-auto"></div>
            <!-- TODO: column headers -->
            <div class="col">{{ $t("name") }}</div>
        </div>
        <div v-for="item in items" :key="item.$id" class="row border-bottom py-2" :class="{ 'is-selected': isSelected(item) }">
            <div class="col-auto">
                <IconButton :icon="isSelected(item) ? 'selected' : 'select'" @click="handleSelect(item)" />
            </div>
            <!-- TODO: columns -->
            <div class="col text-truncate">{{ item.$title }}</div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from "vue"
import { IconButton } from "@regira/modules/vue/ui"
import type { OverviewEmits } from "@regira/modules/vue/entities"
import type Entity from "../data/Entity"
import useEntityStore from "../data/store"

interface Emits extends /* @vue-ignore */ OverviewEmits<Entity> {}
const emit = defineEmits<Emits & { (e: "update:modelValue", value: Array<Entity>): void; (e: "select", selected?: Entity): void }>()
const props = defineProps<{ modelValue?: Array<Entity>; selected?: Entity }>()

const isSelected = computed(() => (item: Entity) => item.$id == props.selected?.$id)
const { fromPool } = useEntityStore()
const items = computed<Array<Entity>>({ get: () => fromPool(props.modelValue || []), set: (value) => emit("update:modelValue", value) })

function handleSelect(item?: Entity) {
    emit("select", item?.$id !== props.selected?.$id ? item : undefined)
}
</script>
```

---

# Copy as-is — short boilerplate (identical for every entity)

## `data/EntityService.ts`

```ts
import type { AxiosInstance } from "axios"
import { EntityServiceBase, type IConfig } from "@regira/modules/vue/entities"
import Entity from "./Entity"

export class EntityService extends EntityServiceBase<Entity> {
    constructor(axios: AxiosInstance, config: IConfig) {
        super(axios, config)
    }

    // Owned child collections use the `_deleted` mark (never splice): removed rows are filtered out here so
    // the server deletes them by omission. Add one filter line per owned collection; `super` strips root `_`-fields.
    // ⚠️ No `|| []` — the back-end contract is null = untouched, [] = delete every row. `?.filter(...)` keeps
    // undefined for a collection this form never loaded, and still yields [] when the user removed the last row.
    protected override prepareItem(item: Entity): Entity {
        // TODO (owned collections only): item.children = item.children?.filter((x) => !x._deleted)
        return super.prepareItem(item)
    }

    // Keep this IDEMPOTENT — it runs inside computeds (fromPool, FormModalButton.modalTitle). Return an
    // existing instance untouched, and guard every conversion you add — dates:
    //   if (typeof (e as any).publishedOn === "string") e.publishedOn = new Date((e as any).publishedOn)
    // and owned-collection lifts, where a fresh array is a mutation just like a fresh Date:
    //   if (e.children?.some((row) => !(row instanceof Child))) e.children = e.children.map((row) => Child.create(row))
    // An unconditional conversion throws "Maximum recursive updates exceeded" against a LIBRARY component.
    override toEntity(item: object): Entity {
        return item instanceof Entity ? item : Object.assign(this.createInstance(Entity as new () => Entity), item || {})
    }
}

export default EntityService
```

## `data/store.ts`

```ts
import { defineStore } from "pinia"
import { get } from "@regira/modules/vue/ioc"
import { createStore, type IEntityService } from "@regira/modules/vue/entities"
import Entity from "./Entity"

export const useEntityStore = defineStore(Entity.name, () => {
    const service = get<IEntityService<Entity>>(Entity.name)!
    return createStore<Entity>(service, Entity.name) // pooled, reactive shared cache
})
// The store's `service` is the generic IEntityService surface, NOT your EntityService subclass — a custom
// endpoint you added there is not on it (casting the pooled handler is a TS2352). Reach the real one:
//   import { get } from "@regira/modules/vue/ioc"
//   const service = get<EntityService>(Entity.name)!
// Use the pooled store for ordinary CRUD so views share the reactive cache; use the raw service for the rest.

export default useEntityStore
```

## `details/Details.vue`

```vue
<template>
    <section>
        <LoadingContainer :is-loading="isLoading">
            <RouterView v-slot="{ Component }">
                <Feedback :feedback="feedback" />
                <component
                    :is="Component"
                    v-if="item != null"
                    v-model="item"
                    :overviewUrl="overviewUrl"
                    @change-state="isLoading = $event == FormStates.pending"
                    @remove="handleRemove"
                />
            </RouterView>
        </LoadingContainer>
    </section>
</template>

<script setup lang="ts">
import { RouterView, useRouter } from "vue-router"
import { LoadingContainer, Feedback } from "@regira/modules/vue/ui"
import { useDetails } from "@regira/modules/vue/entities/details"
import { FormStates } from "@regira/modules/vue/entities/form"
import config from "../config/config"
import useEntityStore from "../data/store"

const { service } = useEntityStore()
const { item, isLoading, overviewUrl, feedback } = useDetails(service) // item is undefined until onMounted load

const router = useRouter()
function handleRemove() {
    router.push(overviewUrl || { name: config.key + "Overview" })
}
</script>
```

## `index.ts`

```ts
export { default as config } from "./config/config"
export { default as Entity } from "./data/Entity"
export { default as EntityService } from "./data/EntityService"
export { default as useEntityStore } from "./data/store"
export { default as SearchObject } from "./filter/SearchObject"

export { default as Filter } from "./filter/Filter.vue"
export { default as FilterInline } from "./filter/FilterInline.vue"
export { default as FilterAdv } from "./filter/FilterAdv.vue"

export { default as Autocomplete } from "./selecting/Autocomplete.vue"
export { default as InputSelector } from "./selecting/InputSelector.vue"
export { default as Selector } from "./selecting/Selector.vue"
export { default as SelectorDropdown } from "./selecting/SelectorDropdown.vue"
export { default as SelectorList } from "./selecting/SelectorList.vue"
export { default as SelectorModalButton } from "./selecting/SelectorModalButton.vue"
export { default as SelectorSearch } from "./selecting/SelectorSearch.vue"
export { default as FormModalButton } from "./details/FormModalButton.vue"

export { default as Overview } from "./overview/Overview.vue"
export { default as List } from "./overview/List.vue"
export { default as Details } from "./details/Details.vue"
export { default as Form } from "./details/Form.vue"

export { default as plugin } from "./setup"
```

## `setup.ts`

```ts
import type { AxiosInstance } from "axios"
import type { App } from "vue"
import type { RouteRecordRaw } from "vue-router"
import type { IServiceProvider } from "@regira/modules/vue/ioc"
import type { IIconProvider } from "@regira/modules/vue/ui/icons"
import { DetailsSummary } from "@regira/modules/vue/entities"
import config from "./config/config"
import { Entity } from "./data/Entity"
import Overview from "./overview/Overview.vue"
import Details from "./details/Details.vue"
import Form from "./details/Form.vue"
import EntityService from "./data/EntityService"

export function createRoutes(): Array<RouteRecordRaw> {
    const key = config.key
    return [
        { path: `/${config.routePrefix}`, name: `${key}Overview`, component: Overview },
        {
            path: `/${config.routePrefix}/:id`,
            name: `${key}Details`,
            component: Details,
            children: [
                { path: "details", name: `${key}Fiche`, component: DetailsSummary },
                { path: "edit", name: `${key}Form`, component: Form },
            ],
            redirect: () => ({ name: `${key}Form` }),
        },
    ] as Array<RouteRecordRaw>
}

export function addServices(serviceProvider: IServiceProvider) {
    serviceProvider.add(Entity.name, (sp) => new EntityService(sp.get<AxiosInstance>("axios")!, config))
}
export function addIcons(icons: IIconProvider) {
    icons.add(config.key, config.icon!)
}

export default {
    install(app: App<Element>, { routes }: { routes: Array<RouteRecordRaw> }) {
        routes.push(...createRoutes())
        addServices(app.config.globalProperties.$services)
        addIcons(app.config.globalProperties.$icons)
        app.config.globalProperties.$configs[Entity.name] = config
    },
}
```

---

## Boilerplate — copy verbatim

These files carry no entity-specific markup — they are byte-identical for every entity. Copy them verbatim
from the simple `UnitType` slice in [entities.examples.md](entities.examples.md) Part 1 (the section numbers
below) rather than hand-stubbing them here, so there is one source of truth:

| File                                | What it is                                                                                                                             | Copy from                                               |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| `overview/Overview.vue`             | the list page — `useSearchView` + `useRouteOverview` wiring, paging, the new-item button (modal for simple, Details route for complex) | [entities.examples.md](entities.examples.md) Part 1 §11 |
| `filter/Filter.vue`                 | the filter shell (hosts the inline bar + the advanced-search modal)                                                                    | [entities.examples.md](entities.examples.md) Part 1 §6  |
| `filter/FilterInline.vue`           | the inline keyword bar                                                                                                                 | [entities.examples.md](entities.examples.md) Part 1 §7  |
| `details/FormModalButton.vue`       | opens the Form in a modal (`useModal`) — the new/edit affordance for simple entities                                                   | [entities.examples.md](entities.examples.md) Part 1 §14 |
| `selecting/Autocomplete.vue`        | type-ahead search input                                                                                                                | [entities.examples.md](entities.examples.md) Part 1 §15 |
| `selecting/InputSelector.vue`       | single-item picker                                                                                                                     | [entities.examples.md](entities.examples.md) Part 1 §16 |
| `selecting/Selector.vue`            | multi-item picker (chips)                                                                                                              | [entities.examples.md](entities.examples.md) Part 1 §17 |
| `selecting/SelectorDropdown.vue`    | simple `<select>` from the cache                                                                                                       | [entities.examples.md](entities.examples.md) Part 1 §18 |
| `selecting/SelectorModalButton.vue` | opens the search/select modal                                                                                                          | [entities.examples.md](entities.examples.md) Part 1 §20 |
| `selecting/SelectorSearch.vue`      | search UI inside the selector modal                                                                                                    | [entities.examples.md](entities.examples.md) Part 1 §21 |

> The `selecting/` set is the **relation picker** for this entity — it lets _other_ entities pick it (in
> their forms). You only ever customize `SelectorList.vue` (its columns, above); the other six are copied
> unchanged.

## See also

- [entities.examples.md](entities.examples.md) — the same files **filled in** (simple `UnitType`, standard `Product`)
- [entities.advanced.example.md](entities.advanced.example.md) — the complex case: attachments, many-to-many link, owned child collections
- [entities.instructions.md](entities.instructions.md#entity-implementation-workflow) — the build-order workflow
- [entities.setup.md](entities.setup.md#entity-slice-anatomy) — the slice anatomy + the app shell that hosts it
- [entities.signatures.md](entities.signatures.md) · [entities.namespaces.md](entities.namespaces.md) — exact signatures & imports
