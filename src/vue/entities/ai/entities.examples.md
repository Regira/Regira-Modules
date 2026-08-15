# Worked Examples — Simple (`UnitType`) & Standard (`Product`) slices

Two **complete, copy-paste** worked entity slices, simplest first. **Part 1** is the SIMPLE slice
(`UnitType`) — a self-contained minimal entity with every file shown verbatim; this is the canonical place
the shared boilerplate is printed in full. **Part 2** is the STANDARD slice (`Product`) — the richer
entity that _builds on_ Part 1, so it shows only the files it changes and points back up for the shared
boilerplate. Both are complete, production-shaped slices you can copy verbatim. The third, COMPLEX tier
(`Vehicle`) lives in [entities.advanced.example.md](entities.advanced.example.md).

> **Tiers (simplest → richest):**
>
> - **Simple — `UnitType`** (this file, **Part 1**): `isComplex: false`, four plain fields, no relations,
>   new/edit in a modal. The full boilerplate is printed here.
> - **Standard — `Product`** (this file, **Part 2**): `isComplex: true`, relations, advanced filter, tabbed
>   form, navigates to a Details page. Only the files it changes are shown.
> - **Complex — `Vehicle`** ([entities.advanced.example.md](entities.advanced.example.md)): attachments,
>   many-to-many link model, owned child collection.

> **Reading order:** [instructions](entities.instructions.md) → [setup](entities.setup.md) (new app) →
> [namespaces](entities.namespaces.md) → [signatures](entities.signatures.md) → **examples (this file —
> simple + standard slices)** / [advanced.example](entities.advanced.example.md) (complex slice) →
> [patterns](entities.patterns.md) (recipes, load on demand).

> **Legend:** `(c)` = _per-entity-customized_ — this file is tailored to each entity. Files without `(c)`
> are **boilerplate** — byte-identical for every entity (only the literal word `Entity`/`UnitType`/`Product`
> differs); copy them as-is. This mirrors the
> [Entity slice anatomy](entities.setup.md#entity-slice-anatomy) `(c)` convention.

> **Fidelity note:** every block is reproduced verbatim from the reference app — templates included — so
> both markup and `<script setup>` wiring are normative. Library code imports from `@regira/modules/...`;
> app code uses app-local aliases (`@/entities/...`, `@/components/...`, `../...`) — resolve those against
> your own app. Resolve any `@regira/modules` import you don't recognise from
> [entities.namespaces.md](entities.namespaces.md); never guess one.

> **Shared inputs come from the library.** `ResultSummary`, `FormButtonsRow`, and `DescriptionInput` ship in
> `@regira/modules/vue/ui`; import them from there. The slice's own `selecting/*` relation pickers are
> generated per entity (worked code below). For a smaller surface, build the
> [lean tier](entities.setup.md#lean-tier-generic-views) — the data layer plus `EntityOverview` / `EntityForm`.

## Folder layout

The full folder tree — every file with its one-line purpose — lives in
[entities.setup.md → Entity slice anatomy](entities.setup.md#entity-slice-anatomy); the build order is
the [Add an entity workflow](entities.instructions.md#entity-implementation-workflow). Part 1 below walks
that slice file by file, in implementation order
(model → config → service → store → search object → filter → overview → details → form → selecting →
barrel → setup), with the real `UnitType` code for each.

---

# Part 1 — Simple slice (`UnitType`)

A genuinely **simple** entity: `isComplex: false`, four plain fields (`id`/`code`/`title`/`description`
plus `created`/`lastModified` timestamps), **no** relations, selectors, or child collections, a minimal
`SearchObject`, and `defaultPageSize: 0`. This is the canonical, fully-printed slice — Part 2 (and the
complex `Vehicle` slice) reuse most of these files unchanged.

**SIMPLE-tier markers — what `isComplex: false` actually toggles:**

- **New/edit happens in a modal**, not on a Details page. The Overview's "new" button and the ListItem's
  edit affordance use the `v-else` branch (`FormModalButton`) instead of a `RouterLink` to `…Details`
  (see `overview/Overview.vue` §11 and `overview/ListItem.vue` §10).
- **The Form is just text inputs** — `code` and `title` — with no tabs, selectors, or relation pickers
  (see `details/Form.vue` §13).

But note what _doesn't_ change: a simple entity **still uses `useSearchView`** against the counted
`searchUrl: api + "/search"` (every controller exposes `/search`, so its overview pages exactly like a
complex one) and **still registers both Overview and Details routes** in `setup.ts`. The `isComplex` flag
toggles only the new-item UX and form richness — it does **not** change the search endpoint, swap out the
composable, or drop the Details route.

> **Front-end `isComplex` is not enforced against the back-end's simple/complex split, but aligning them is
> encouraged.** Nothing binds the two flags: a back-end **complex** entity (typed `TIncludes`/`TSortBy`) behind
> a front-end `isComplex: false` slice is perfectly correct — you only trade the Details-page UX for modal
> editing, never correctness. So when they diverge, let the _form's_ richness (child collections / many fields)
> decide `isComplex`. In practice the two usually track each other, and keeping them aligned is the recommended
> default; treat a mismatch as a deliberate choice, not an accident.

## 1. Model — `data/Entity.ts` (c)

```ts
import { EntityBase } from "@regira/modules/vue/entities"

export class UnitType extends EntityBase {
    id: number = 0 // a Guid/string-keyed API entity declares `id: string = ""`; the rest of the entity slice is key-generic (owned child rows stay int)
    code?: string
    title = ""
    description?: string

    created?: Date
    lastModified?: Date

    override get $id(): string | number {
        return this.id || "new"
    }
    override get $title(): string | undefined {
        return this.title
    }
}

export const Entity = UnitType

export default UnitType
```

## 2. Config — `config/config.ts` (c)

> `searchUrl` points at the counted `/search` endpoint (every controller exposes it), so this simple
> entity's overview pages through `useSearchView` just like a complex one. `defaultPageSize` seeds the
> overview's page size.

```ts
import type { IConfig } from "@regira/modules/vue/entities"
import Entity from "../data/Entity"

const api = "/unit-types"

const config: IConfig = {
    id: Entity.name,
    key: "UnitType",
    isComplex: false,

    routePrefix: "unit-types",
    baseQueryParams: {}, // a simple entity binds no ?includes= at all
    initialQuery: {},

    overviewTitle: "unitTypes",
    detailsTitle: "unitType",
    description: "unitType.description",
    icon: "bi bi-tools",

    defaultPageSize: 10,

    api,
    detailsUrl: api,
    listUrl: api,
    searchUrl: api + "/search",
    saveUrl: api,
    deleteUrl: api,
}

export default config
```

## 3. Service — `data/EntityService.ts` (c)

`UnitType` has no attachments and no transient children, so it uses the plain service. The only required
override is `toEntity`. Override `prepareItem` to drop transient children before save, and add bespoke
endpoints by calling `this.axios` with URLs built off `this.config.api` (see
[entities.patterns.md](entities.patterns.md)). For the attachments-aware variant of this file, see
[entities.advanced.example.md](entities.advanced.example.md).

```ts
import type { AxiosInstance } from "axios"
import { EntityServiceBase, type IConfig } from "@regira/modules/vue/entities"
import Entity from "./Entity"

export class EntityService extends EntityServiceBase<Entity> {
    constructor(axios: AxiosInstance, config: IConfig) {
        super(axios, config)
    }

    override toEntity(item: object): Entity {
        return item instanceof Entity ? item : Object.assign(this.createInstance(Entity as new () => Entity), item || {})
    }
}

export default EntityService
```

## 4. Store — `data/store.ts`

```ts
import { defineStore } from "pinia"
import { get } from "@regira/modules/vue/ioc"
import { createStore, type IEntityService } from "@regira/modules/vue/entities"
import Entity from "./Entity"

export const useEntityStore = defineStore(Entity.name, () => {
    const service = get<IEntityService<Entity>>(Entity.name)!
    return createStore<Entity>(service, Entity.name)
})

export default useEntityStore
```

## 5. Search object — `filter/SearchObject.ts` (c)

> The class is named `EntitySearchObject` in the reference app — it is **not** renamed per entity (the
> barrel and consumers import it as the module default), so this name is reproduced verbatim.

```ts
import { SearchObjectBase, ArchivedFilter } from "@regira/modules/vue/entities"

export class EntitySearchObject extends SearchObjectBase {
    code?: string
    title?: string

    minCreated?: Date
    maxCreated?: Date
    minLastModified?: Date
    maxLastModified?: Date

    archived?: ArchivedFilter
}

export default EntitySearchObject
```

## 6. Filter — `filter/Filter.vue`

```vue
<template>
    <div>
        <slot name="inline" :handleToggle="handleToggle">
            <FilterInline v-model="searchObject" @filter="handleFilter" @toggle-adv="handleToggle" />
        </slot>

        <Teleport to="#modals">
            <component
                :is="Modal"
                :is-visible="showAdv"
                :title="props.modalTitle || 'Advanced search'"
                :show-footer="true"
                :full-width="true"
                @close="handleClose"
                @submit="handleSubmit"
            >
                <slot name="title"></slot>
                <slot name="adv" :handleUpdate="handleUpdate" :handleSubmit="handleSubmit" :handleClose="handleClose"> </slot>

                <Debug :modelValue="searchObject" />
            </component>
        </Teleport>
    </div>
</template>

<script setup lang="ts">
import { ref } from "vue"
import { injectModal } from "@regira/modules/vue/ui"
import { Debug } from "@regira/modules/vue/debug"
import { useFilter, type FilterEmits } from "@regira/modules/vue/entities"
import type SearchObject from "./SearchObject"
import FilterInline from "./FilterInline.vue"

const Modal = injectModal() // resolves the app-wide modal (modalPlugin swap-aware)

interface Emits extends /* @vue-ignore */ FilterEmits<SearchObject> {}
const emit = defineEmits<
    Emits & {
        "update:modelValue": (value: SearchObject) => true
        filter: (value: SearchObject) => true
        "toggle-adv": () => void
        close: () => void
    }
>()

const props = defineProps<{
    modalTitle?: string
    resultCount?: number
}>()

const searchObject = defineModel<SearchObject>({ required: true })

const showAdv = ref(false)
const { handleUpdate, handleFilter } = useFilter({ searchObject, emit })

function handleToggle() {
    showAdv.value = !showAdv.value
}
function handleClose() {
    showAdv.value = false
}
function handleSubmit() {
    handleUpdate()
    handleClose()
}
</script>
```

## 7. Filter (inline) — `filter/FilterInline.vue`

```vue
<template>
    <div class="row">
        <div class="col-auto">
            <div class="input-group">
                <IconButton icon="clear" class="btn-outline-secondary" @click="handleReset" />
                <input v-model.lazy.trim="searchObject.q" class="form-control" :placeholder="$t('keywords')" @change="handleUpdate" />
                <IconButton icon="search" class="btn-outline-primary d-none d-sm-block" @click="handleUpdate" />
                <IconButton v-if="showToggleAdv" icon="filter" :class="filterIsActive ? 'btn-info' : 'btn-outline-info'" @click="handleToggle" />
            </div>
            <small v-if="filterIsActive" class="d-none d-sm-inline italic-muted">{{ $t("filtersAreApplied") }}</small>
        </div>
    </div>
</template>

<script setup lang="ts">
import { IconButton } from "@regira/modules/vue/ui"
import { useFilter, type FilterEmits } from "@regira/modules/vue/entities"
import config from "../config/config"
import SearchObject from "./SearchObject"

interface Emits extends /* @vue-ignore */ FilterEmits<SearchObject> {}
const emit = defineEmits<
    Emits & {
        "update:modelValue": (value: SearchObject) => true
        filter: (value: SearchObject) => true
        "toggle-adv": () => void
        close: () => void
    }
>()

const props = withDefaults(
    defineProps<{
        resultCount?: number
        showToggleAdv?: boolean
    }>(),
    {
        showToggleAdv: config.isComplex,
    }
)
const searchObject = defineModel<SearchObject>({
    default: () => new SearchObject(),
})

const { filterIsActive, handleReset, handleUpdate, handleToggle } = useFilter({
    searchObject,
    emit,
    Constructor: SearchObject,
})
</script>
```

## 8. Filter (advanced) — `filter/FilterAdv.vue` (c)

> For a simple entity the advanced filter is just keywords + name + a created-date range — no relation
> pickers. `showToggleAdv` defaults to `config.isComplex` (false here), so the "advanced" toggle is hidden
> on the inline filter; the panel is still wired for consumers that opt in.
>
> ⚠️ Every input carries `@change="handleUpdate"`. Custom components (`InputSelector`, `NullableCheckBox`,
> `DateInput`) emit Vue events only and need `@select`/`@update:modelValue` instead — see Part 2 §5.

```vue
<template>
    <div class="adv-filter">
        <div class="row">
            <div class="col mb-2" v-if="resultCount != null">
                <span class="text-info">{{ resultCount }} {{ $t("results") }}</span>
                <small v-if="filterIsActive" class="ms-2 italic-muted">({{ $t("filtersAreApplied") }})</small>
            </div>
            <div class="col mb-2 text-end">
                <IconButton icon="clear" @click="handleReset" :showText="true" />
            </div>
        </div>
        <div class="row">
            <!-- keywords -->
            <div class="col mb-2">
                <div class="input-group">
                    <div class="input-group-text">
                        <Icon name="search" />
                    </div>
                    <input v-model.lazy.trim="searchObject.q" class="form-control" :placeholder="$t('keywords')" @change="handleUpdate" />
                </div>
            </div>
        </div>
        <div class="row">
            <!-- title -->
            <div class="col mb-2">
                <div class="input-group">
                    <div class="input-group-text">
                        <Icon name="title" />
                    </div>
                    <input v-model.lazy.trim="searchObject.title" class="form-control" :placeholder="$t('name')" @change="handleUpdate" />
                </div>
            </div>
        </div>
        <div class="row">
            <!-- minCreated -->
            <div class="col-sm mb-2">
                <div class="input-group">
                    <div class="input-group-text">
                        <Icon name="from" />
                    </div>
                    <input type="date" v-model="searchObject.minCreated" class="form-control" @change="handleUpdate" />
                </div>
            </div>
            <!-- maxCreated -->
            <div class="col-sm mb-2">
                <div class="input-group">
                    <div class="input-group-text">
                        <Icon name="to" />
                    </div>
                    <input type="date" v-model="searchObject.maxCreated" class="form-control" @change="handleUpdate" />
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { Icon, IconButton } from "@regira/modules/vue/ui"
import { useFilter, type FilterEmits } from "@regira/modules/vue/entities"
import SearchObject from "./SearchObject"

interface Emits extends /* @vue-ignore */ FilterEmits<SearchObject> {}
const emit = defineEmits<
    Emits & {
        "update:modelValue": (value: SearchObject) => true
        filter: (value: SearchObject) => true
        "toggle-adv": () => void
        close: () => void
    }
>()

const props = defineProps<{
    resultCount?: number
}>()

const searchObject = defineModel<SearchObject>({ required: true })

const { filterIsActive, handleReset, handleUpdate } = useFilter({
    searchObject,
    emit,
    Constructor: SearchObject,
})
</script>
```

## 9. List — `overview/List.vue` (c)

> The header's edit affordance branches on `config.isComplex`, and each branch wears the SAME classes as
> the row affordance it stands in for (`ListItem.vue` §10) — a `.btn`'s transparent 1px border and
> line-height are part of the cell's width, so a spacer that drops them misaligns the header by ~2px.
> Inert either way: `.disabled` on the span, `disabled` on the button.

```vue
<template>
    <div class="entity-list">
        <div class="row pb-2 border-bottom border-bottom-1">
            <div class="col-auto fw-bold">
                <span v-if="config.isComplex" class="btn btn-link p-1 disabled"><Icon name="edit" /></span>
                <button v-else type="button" class="btn btn-default" disabled><Icon :name="config.key" /></button>
            </div>
            <div class="col-2 col-lg-1 fw-bold">{{ $t("code") }}</div>
            <div class="col fw-bold">{{ $t("name") }}</div>
            <div class="col-auto fw-bold">
                <span class="btn disabled text-muted"><Icon name="delete" /></span>
            </div>
        </div>
        <template v-for="(item, i) in items" :key="item.$id">
            <ListItem
                v-model="items[i]!"
                :readonly="readonly"
                :class="{ 'bg-light': i % 2 == 0 }"
                @request-save="$emit('request-save', $event)"
                @request-remove="$emit('request-remove', $event)"
                @save="$emit('save', $event)"
                @remove="$emit('remove', $event)"
            />
        </template>
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
const props = defineProps<{
    modelValue?: Array<Entity>
    readonly?: boolean
}>()

const { fromPool } = useEntityStore()

const items = computed<Array<Entity>>({
    get: () => fromPool(props.modelValue || []),
    set: (value) => emit("update:modelValue", value),
})
</script>
```

## 10. List item — `overview/ListItem.vue` (c)

> The `config.isComplex` branch is the SIMPLE-tier marker in row form: complex entities link to a Details
> page, simple ones open the form in a modal via `FormModalButton`. The misspelled `Simple enitty` comment
> is reproduced verbatim.

```vue
<template>
    <div class="row border-bottom border-bottom-1 py-2">
        <div class="col-auto">
            <template v-if="config.isComplex">
                <!-- Complex entity: Link to input page -->
                <router-link :to="{ name: config.key + 'Details', params: { id: item.$id } }" class="btn btn-link p-1">
                    <Icon :name="config.key" />
                </router-link>
            </template>
            <template v-else>
                <!-- Simple enitty: Open form modal -->
                <FormModalButton v-model="item" @save="$emit('save', $event)" />
            </template>
        </div>
        <div class="col-2 col-lg-1 text-truncate">
            {{ item.code }}
        </div>
        <div class="col text-truncate">
            {{ item.$title }}
        </div>
        <div class="col-auto">
            <ConfirmButton icon="delete" class="m-0 p-1" :modal-type="ModalType.danger" @confirm="$emit('request-remove', item)">{{
                $t("deleteItem", { title: item?.$title })
            }}</ConfirmButton>
        </div>
    </div>
</template>

<script setup lang="ts">
import { Icon, ModalType, ConfirmButton } from "@regira/modules/vue/ui"
import type { SaveResult } from "@regira/modules/vue/entities"
import config from "../config/config"
import Entity from "../data/Entity"
import FormModalButton from "../details/FormModalButton.vue"

const emit = defineEmits<{
    (e: "update:modelValue", args: Entity): void
    (e: "save", args: SaveResult<Entity>): void
    (e: "remove", args: Entity): void
    (e: "request-save", args: Entity): void
    (e: "request-remove", args: Entity): void
}>()
const props = defineProps<{
    readonly?: boolean
}>()

const item = defineModel<Entity>({ required: true })
</script>
```

## 11. Overview — `overview/Overview.vue` (c)

> Even though `UnitType` is simple, the Overview uses `useSearchView` + `useRouteOverview` against the
> counted `/search` endpoint, so it pages just like a complex entity. The SIMPLE-tier marker is the "new"
> button: the `config.isComplex` branch links to `…Details` (`id: 'new'`), the `v-else` branch opens a
> `FormModalButton` modal and re-runs `searchHandler` on save.

```vue
<template>
    <section class="overview">
        <div class="row justify-content-between gx-0 gx-sm-1">
            <div class="col col-lg-auto order-1">
                <!-- Filter -->
                <Filter v-model="searchObject" @filter="updateOverviewRoute(true)" @change="updateOverviewRoute(true)" :result-count="itemsCount">
                    <template #adv="{ handleClose }">
                        <slot
                            name="filterAdv"
                            :result-count="itemsCount"
                            :search="updateOverviewRoute"
                            :search-object="searchObject"
                            :paging-info="pagingInfo"
                            :handle-close="handleClose"
                        >
                            <component
                                :is="FilterAdv"
                                v-model="searchObject"
                                :result-count="itemsCount"
                                @filter="updateOverviewRoute(true)"
                                @change="updateOverviewRoute(true)"
                                @close="handleClose"
                            />
                        </slot>
                    </template>
                </Filter>
            </div>
            <div class="col-12 col-lg order-3 order-lg-2">
                <Feedback v-bind="{ feedback }" :hideCloseButton="true" />
            </div>
            <div class="col-auto order-2 order-lg-3 ps-2">
                <template v-if="config.isComplex">
                    <RouterLink :to="{ name: config.key + 'Details', params: { id: 'new' } }" class="btn btn-info">
                        <Icon name="new" /><span class="d-none d-sm-inline ms-1">{{ $t("new") }}</span>
                    </RouterLink>
                </template>
                <template v-else>
                    <FormModalButton class="btn btn-info" @save="searchHandler(false)">
                        <Icon name="new" /><span class="d-none d-sm-inline ms-1">{{ $t("new") }}</span>
                    </FormModalButton>
                </template>
            </div>
        </div>

        <!-- Paging - ResultSummary -->
        <div class="row">
            <div class="col order-2">
                <template v-if="pagingInfo != null">
                    <Paging
                        class="mt-2"
                        v-show="!isLoading && itemsCount != null && itemsCount > pagingInfo.pageSize!"
                        v-model="pagingInfo"
                        :count="itemsCount || 0"
                        @change="updateOverviewRoute(false)"
                    />
                </template>
            </div>
            <div class="col-12 col-sm-auto order-1 order-sm-3">
                <ResultSummary v-if="items?.length" :visibleCount="items.length" :totalCount="itemsCount" />
            </div>
        </div>

        <!-- List - Loading -->
        <LoadingContainer :is-loading="isLoading">
            <component
                :is="List"
                v-if="items && items.length > 0"
                v-model="items"
                @request-save="handleRequestSave"
                @request-remove="handleRequestRemove"
                @save="handleSave"
                @remove="handleRemove"
                @request-reload="updateOverviewRoute(false)"
            />
            <p v-if="items && items.length <= 0" class="italic-muted">
                {{ $t("noResults") }}
            </p>
        </LoadingContainer>

        <!-- Paging -->
        <template v-if="pagingInfo != null">
            <Paging
                class="mt-2"
                v-show="!isLoading && itemsCount != null && itemsCount > pagingInfo.pageSize!"
                v-model="pagingInfo"
                :count="itemsCount || 0"
                @change="updateOverviewRoute(false)"
            />
        </template>

        <Debug
            :modelValue="{
                pagingInfo,
                items,
            }"
        />
    </section>
</template>

<script setup lang="ts">
import { useSearchView, useRouteOverview, type OverviewEmits } from "@regira/modules/vue/entities"
import { Icon, Paging, LoadingContainer, Feedback, ResultSummary } from "@regira/modules/vue/ui"
import { Debug } from "@regira/modules/vue/debug"
import { useAuthStore } from "@regira/modules/vue/auth"
import config from "../config/config"
import Entity from "../data/Entity"
import useEntityStore from "../data/store"
import SearchObject from "../filter/SearchObject"
import Filter from "../filter/Filter.vue"
import FilterAdv from "../filter/FilterAdv.vue"
import List from "./List.vue"
import FormModalButton from "../details/FormModalButton.vue"

interface Emits extends /* @vue-ignore */ OverviewEmits<Entity> {}
defineEmits<Emits>()

const { service } = useEntityStore()

const { searchObject, pagingInfo, items, itemsCount, isLoading, feedback, applySave, applyRemove, handleSave, handleRemove, searchHandler } =
    useSearchView<Entity, SearchObject>({
        service,
        searchObject: new SearchObject(),
        defaultPageSize: config.defaultPageSize,
    })
const { updateOverviewRoute } = useRouteOverview({
    searchObject,
    pagingInfo,
    handler: searchHandler,
    defaultPageSize: config.defaultPageSize,
})

// trigger searchHandler when logging in or refreshing token — no-auth app: delete these two lines (scaffold.mjs --no-auth strips them; see entities.setup.md#running-without-authentication)
const authStore = useAuthStore()
authStore.$onAction(({ name, after }) => ["login", "refresh"].includes(name) && after(() => authStore.isAuthenticated && searchHandler(false)))

async function handleRequestSave(item: Entity) {
    const result = await applySave(item)
    if (result != null) {
        handleSave(result)
    }
}
async function handleRequestRemove(item: Entity) {
    // Guard on the result, exactly like save: a delete the server refused (409 while the row is still
    // referenced) would otherwise show the failure AND remove the row until the next fetch.
    if (await applyRemove(item)) {
        handleRemove(item)
    }
}
</script>
```

## 12. Details — `details/Details.vue`

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
import { useAuthStore } from "@regira/modules/vue/auth"
import { LoadingContainer, Feedback } from "@regira/modules/vue/ui"
import { useDetails } from "@regira/modules/vue/entities/details"
import { FormStates } from "@regira/modules/vue/entities/form"
import config from "../config/config"
import useEntityStore from "../data/store"

const { service } = useEntityStore()

const { item, isLoading, overviewUrl, load, feedback } = useDetails(service)

// trigger load when logging in (only load when item has not been loaded before) — no-auth app: delete these two lines and drop load from the useDetails destructure above (scaffold.mjs --no-auth does both)
const authStore = useAuthStore()
authStore.$onAction(({ name, after }) => name == "login" && after(() => item.value == null && authStore.isAuthenticated && load()))

const router = useRouter()
function handleRemove() {
    router.push(overviewUrl || { name: config.key + "Overview" })
}
</script>
```

## 13. Form — `details/Form.vue` (c)

> The SIMPLE-tier form: no `TabContainer`, no selectors, no relation pickers — just two text inputs
> (`code`, `title`) inside a single `FormSection`, plus the buttons row and a `Debug` block. Contrast with
> the tabbed `Product` form in Part 2 §6.

```vue
<template>
    <form @submit.prevent="handleSubmit" :modelValue="item">
        <div class="row form-toolbar">
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
                <RouterLink
                    v-if="isPopup"
                    :to="{ name: `${config.key}Details`, params: { id: item.$id } }"
                    class="btn btn-default py-1"
                    target="_blank"
                    :title="$t('popOut')"
                >
                    <Icon name="popOut" />
                </RouterLink>
                <RouterLink v-else-if="overviewUrl" :to="overviewUrl" class="btn btn-info py-1">
                    <Icon name="list" />
                    <span class="d-none d-md-inline ms-1">{{ $t("overview") }}</span>
                </RouterLink>
            </div>
            <div class="col-md order-3 order-md-2">
                <Feedback :feedback="feedback" />
            </div>
        </div>

        <div class="row">
            <div class="col">
                <FormSection :title="$t(config.detailsTitle || '')" :readonly="readonly">
                    <div class="row">
                        <div class="col mb-2">
                            <div class="input-group">
                                <div class="input-group-text">
                                    <Icon name="code" />
                                </div>
                                <input v-model="item.code" maxlength="16" :readonly="readonly" class="form-control" />
                            </div>
                            <FormLabel :label="$t('code')" />
                        </div>
                    </div>
                    <div class="row">
                        <div class="col mb-2">
                            <div class="input-group">
                                <div class="input-group-text">
                                    <Icon name="title" />
                                </div>
                                <input v-model="item.title" maxlength="64" :readonly="readonly" class="form-control" />
                            </div>
                            <FormLabel :label="$t('name')" />
                        </div>
                    </div>
                </FormSection>
            </div>
        </div>

        <Debug
            :modelValue="{
                item,
            }"
        />
    </form>
</template>

<script setup lang="ts">
import type { RouteRecordRaw } from "vue-router"
import { Icon, Feedback, FormButtonsRow, FormSection, FormLabel } from "@regira/modules/vue/ui"
import { Debug } from "@regira/modules/vue/debug"
import { useForm, type FormEmits, formDefaults } from "@regira/modules/vue/entities"
import config from "../config/config"
import Entity from "../data/Entity"
import useEntityStore from "../data/store"

interface Emits extends /* @vue-ignore */ FormEmits<Entity> {}
const emit = defineEmits<Emits>()
const props = withDefaults(
    defineProps<{
        modelValue: Entity
        readonly?: boolean
        overviewUrl?: string | RouteRecordRaw
        isPopup?: boolean
        initialTab?: string
    }>(),
    { ...formDefaults }
)

const { service: entityService } = useEntityStore()

const { item, feedback, handleCancel, handleSubmit, handleRemove, handleRestore } = useForm<Entity>({
    entityService,
    props,
    emit,
})
</script>
```

## 14. Form modal button — `details/FormModalButton.vue`

```vue
<template>
    <button type="button" class="btn btn-default" @click="open">
        <slot>
            <Icon :name="config.key" />
        </slot>
        <Teleport to="#modals">
            <component
                :is="Modal"
                :is-visible="isOpen"
                :title="modalTitle || $t(config.detailsTitle || '')"
                :showFooter="false"
                :full-width="fullWidth"
                size="lg"
                @close="close"
                @cancel="close"
                @submit="close"
            >
                <Form
                    v-model="item"
                    :initial-tab="initialTab"
                    :readonly="readonly"
                    :is-popup="true"
                    @cancel="handleCancel"
                    @save="handleSave"
                    @remove="handleRemove"
                />
            </component>
        </Teleport>
    </button>
</template>

<script setup lang="ts">
import { computed, type Ref } from "vue"
import { Icon, injectModal } from "@regira/modules/vue/ui"
import { FormStates, useModal, type FormModalEmits, type SaveResult } from "@regira/modules/vue/entities"
import config from "../config/config"
import Entity from "../data/Entity"
import useEntityStore from "../data/store"
import Form from "./Form.vue"

const Modal = injectModal() // resolves the app-wide modal (modalPlugin swap-aware)

interface Emits extends /* @vue-ignore */ FormModalEmits<Entity> {}
const emit = defineEmits<
    Emits & {
        "update:modelValue": (item?: Entity) => true
        save: (result: SaveResult<Entity>) => true
        remove: (item: Entity) => true
        restore: (item: Entity) => true
        cancel: (arg: { canceled: Entity; original?: Entity }) => true
        changeState: (state: FormStates) => true
        open: (item: Entity, update: (newItem: Entity) => void) => true
        close: (item?: Entity) => true
    }
>()

const props = withDefaults(
    defineProps<{
        readonly?: boolean
        itemDefaults?: Ref<Record<string, any>> | Record<string, any>
        initialTab?: string
        label?: string
        closeOnSave?: boolean
        fullWidth?: boolean
    }>(),
    {
        fullWidth: config.isComplex,
    }
)

const modelRef = defineModel<Entity>()
const { service: entityService } = useEntityStore()

const modalTitle = computed(() => props.label || (modelRef.value != null && entityService.toEntity(modelRef.value).$title))
const { item, isOpen, close, open, handleSave, handleRemove, handleCancel } = useModal<Entity>({
    entityService,
    model: modelRef,
    itemDefaults: props.itemDefaults,
    closeOnSave: props.closeOnSave,
    closeOnCancel: false,
    closeOnDelete: true,
    emit,
})
</script>
```

## 15. Autocomplete — `selecting/Autocomplete.vue`

Modify this file when the text to display is not just `$title`.

```vue
<template>
    <Autocomplete
        v-model="item"
        :search="search"
        :max-results="maxResults"
        :id-selector="idSelector"
        :display-item-formatter="displayItemFormatter"
        :placeholder="placeholder"
        ref="autoEl"
    >
        <template #default="{ item }">
            <div class="row">
                <div class="col">{{ item.$title }}</div>
            </div>
        </template>
    </Autocomplete>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue"
import { Autocomplete } from "@regira/modules/vue/ui"
import { get } from "@regira/modules/vue/ioc"
import type { IEntityService } from "@regira/modules/vue/entities"
import Entity from "../data/Entity"
import useEntityStore from "../data/store"

const emit = defineEmits<{
    (e: "update:modelValue", args?: Entity): void
    (e: "update:idValue", args?: number | string): void
    (e: "select", args?: Entity): void
}>()
const props = withDefaults(
    defineProps<{
        modelValue?: Entity
        maxResults?: number
        filterDefaults?: Record<string, any>
        placeholder?: string
    }>(),
    { maxResults: 10 }
)

const { fromPool } = useEntityStore()
const item = computed({
    get: () => fromPool(props.modelValue) as Entity,
    set: (value) => {
        emit("update:modelValue", value)
        emit("update:idValue", value?.id)
        emit("select", value)
    },
})

// expose refs
const autoEl = ref<any>(null)
watch(item, () => {
    if (item.value == null) {
        autoEl.value?.resetQ()
    }
})

const entityService = get<IEntityService<Entity>>(Entity.name)!
const search = (q: string) =>
    entityService.list({
        ...props.filterDefaults,
        q: (q?.split(" ") || []).map((x) => `*${x}*`).join(" "),
        pageSize: props.maxResults,
    })
const idSelector = (item?: Entity) => item?.$id?.toString()
const displayItemFormatter = (item?: Entity) => item?.$title as string
</script>
```

## 16. Input selector — `selecting/InputSelector.vue`

```vue
<template>
    <div class="input-selector input-group text-nowrap">
        <slot name="prepend">
            <FormModalButton
                v-if="canEdit"
                v-model="item"
                :item-defaults="itemDefaults"
                :readonly="readonly"
                :close-on-save="closeOnSave"
                class="btn btn-outline-secondary"
                @save="({ saved }) => handleSelect(saved)"
            >
                <Icon :name="config.key" v-if="item?.id" />
                <Icon v-else name="new" />
            </FormModalButton>
        </slot>
        <slot>
            <Autocomplete
                class="form-control"
                v-model="item"
                :filter-defaults="filterDefaults"
                :readonly="readonly"
                :placeholder="placeholder"
                @select="handleSelect"
                ref="autoEl"
            />
        </slot>
        <slot name="append">
            <template v-if="!readonly">
                <button v-if="!readonly" type="button" v-show="item != null" class="btn btn-outline-secondary" @click="handleSelect(undefined)">
                    <Icon name="clear" />
                </button>
                <SelectorModalButton
                    v-model="item"
                    :filter-defaults="filterDefaults"
                    :disabled="readonly"
                    @select="handleSelect"
                    class="btn btn-outline-info"
                />
            </template>
        </slot>
    </div>
</template>

<script setup lang="ts">
import { computed, getCurrentInstance, onMounted, type Ref } from "vue"
import { Icon } from "@regira/modules/vue/ui"
import config from "../config/config"
import Entity from "../data/Entity"
import useEntityStore from "../data/store"
import FormModalButton from "../details/FormModalButton.vue"
import Autocomplete from "./Autocomplete.vue"
import SelectorModalButton from "./SelectorModalButton.vue"

const emit = defineEmits<{
    (e: "update:modelValue", args?: Entity): void
    (e: "update:idValue", args?: number | string): void
    (e: "select", args?: Entity): void
}>()
const props = withDefaults(
    defineProps<{
        modelValue?: Entity
        idValue?: number | string
        readonly?: boolean
        canEdit?: boolean
        itemDefaults?: Ref<Record<string, any>> | Record<string, any>
        filterDefaults?: Record<string, any>
        closeOnSave?: boolean
        placeholder?: string
    }>(),
    {
        canEdit: true,
    }
)

const { fromPool, list } = useEntityStore()
const item = computed<Entity | undefined>({
    get: () => fromPool(props.modelValue) as Entity,
    set: (value) => {
        emit("update:modelValue", value)
        emit("update:idValue", value?.id)
    },
})

function handleSelect(selected?: Entity) {
    if (item.value?.id != selected?.id) {
        item.value = selected // emit
        emit("select", selected)
    }
}

onMounted(async () => {
    // Two v-models: `idValue` is the FK that gets saved, `modelValue` is the entity that gets displayed. With
    // only `idValue` bound the resolution below emits into nothing and the control renders blank on a
    // populated form — it fails silently, so say so.
    if (import.meta.env.DEV && props.idValue !== undefined && !("onUpdate:modelValue" in (getCurrentInstance()?.vnode.props ?? {}))) {
        console.warn(
            `[${config.key}InputSelector] v-model:idValue is bound without v-model — the resolved entity has nowhere to go, so the control renders blank. Bind both.`
        )
    }

    if (props.idValue && !props.modelValue?.id) {
        const model = await list({ id: props.idValue })
        emit("update:modelValue", model[0])
    }
})
</script>
```

## 17. Selector — `selecting/Selector.vue`

```vue
<template>
    <div class="row g-1">
        <div v-for="(item, i) in items" :key="item.id" class="col-auto">
            <div class="text-nowrap p-2 border rounded-1">
                <FormModalButton v-model="items![i]" class="m-0 p-0" />
                {{ item.$title }}
                <IconButton icon="delete" class="m-0 py-0 px-1" @click="handleRemove(item)" />
            </div>
        </div>
        <div class="col-auto">
            <InputSelector v-model="newItem" @select="handleSelect" />
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue"
import { IconButton } from "@regira/modules/vue/ui"
import useEntityStore from "../data/store"
import type Entity from "../data/Entity"
import FormModalButton from "../details/FormModalButton.vue"
import InputSelector from "./InputSelector.vue"

const emit = defineEmits<{
    (e: "update:modelValue", args: Array<Entity>): void
    (e: "update:idsValue", args: Array<number | string>): void
}>()
const props = defineProps<{
    modelValue?: Array<Entity>
    idsValue?: Array<number | string>
}>()

const { fromPool, list } = useEntityStore()
const items = computed<Array<Entity>>({
    get: () => fromPool(props.modelValue || []) as Array<Entity>,
    set: (value) => emit("update:modelValue", value as Array<Entity>),
})

const newItem = ref<Entity>()
function handleSelect(selected?: Entity) {
    if (selected == null) {
        return
    }

    if (items.value.every((x) => x.$id != selected?.$id)) {
        const newVal = [...items.value, selected]
        emit(
            "update:idsValue",
            newVal.map((x) => x.id!)
        )
        emit("update:modelValue", newVal)
    }
    newItem.value = undefined
}
function handleRemove(selected: Entity) {
    const newVal = items.value.filter((x) => x.$id != selected?.$id)
    emit(
        "update:idsValue",
        newVal.map((x) => x.id!)
    )
    emit("update:modelValue", newVal)
}

onMounted(async () => {
    if ((props.idsValue?.length || 0) > 0 && props.modelValue?.length != props.idsValue?.length) {
        const models = await list({ ids: props.idsValue })
        emit("update:modelValue", models)
    }
})
</script>
```

## 18. Selector dropdown — `selecting/SelectorDropdown.vue`

```vue
<template>
    <select v-model="selectedId" class="form-select">
        <option :value="undefined"></option>
        <option v-for="item in items" :value="item.id" :key="item.id">
            {{ item.$title }}
        </option>
    </select>
</template>

<script setup lang="ts">
import { computed, onMounted, watch, type Ref } from "vue"
import type Entity from "../data/Entity"
import useEntityStore from "../data/store"

const selectedItem = defineModel<Entity>()
const selectedId = defineModel<number | string>("idValue")
watch(selectedId, () => (selectedItem.value = items.value.find((x) => x.id == selectedId.value)))

const { fromCache } = useEntityStore()
const items = computed(() => (fromCache() as Array<Ref<Entity>>)!.map((x) => x.value))
onMounted(() => {
    if (!selectedItem.value && selectedId.value) {
        selectedItem.value = items.value.find((x) => x.id == selectedId.value)
    }
})
</script>
```

## 19. Selector list — `selecting/SelectorList.vue` (c)

```vue
<template>
    <div class="entity-list">
        <div class="row pb-2 border-bottom border-bottom-1">
            <div class="col-auto fw-bold">
                <IconButton icon="select" class="btn-default py-0 px-1 border-0" disabled />
            </div>
            <div class="col-2 fw-bold">{{ $t("code") }}</div>
            <div class="col fw-bold">{{ $t("name") }}</div>
        </div>

        <template v-for="(item, i) in items" :key="item.$id">
            <div class="row border-bottom border-bottom-1 py-2" :class="{ 'is-selected': isSelected(item) }">
                <div class="col-auto">
                    <IconButton :icon="isSelected(item) ? 'selected' : 'select'" class="btn-default py-0 px-1" @click="handleSelect(item)" />
                </div>
                <div class="col-2 text-truncate">
                    {{ item.code }}
                </div>
                <div class="col text-truncate">
                    <FormModalButton :modelValue="item" class="p-1" />
                    {{ item.$title }}
                </div>
            </div>
        </template>
    </div>
</template>

<script setup lang="ts">
import { computed } from "vue"
import { IconButton } from "@regira/modules/vue/ui"
import { type OverviewEmits } from "@regira/modules/vue/entities"
import config from "../config/config"
import type Entity from "../data/Entity"
import useEntityStore from "../data/store"
import FormModalButton from "../details/FormModalButton.vue"

interface Emits extends /* @vue-ignore */ OverviewEmits<Entity> {}
const emit = defineEmits<
    Emits & {
        (e: "update:modelValue", value: Array<Entity>): void
        (e: "update:selected", value?: Entity): void
        (e: "select", selected?: Entity): void
    }
>()

const props = defineProps<{
    modelValue?: Array<Entity>
    selected?: Entity
}>()

const isSelected = computed(() => (item: Entity) => item.$id == props.selected?.$id)
const { fromPool } = useEntityStore()
const items = computed<Array<Entity>>({
    get: () => fromPool(props.modelValue || []),
    set: (value) => emit("update:modelValue", value),
})

function handleSelect(item?: Entity) {
    emit("select", item?.$id !== props.selected?.$id ? item : undefined)
}
</script>
```

## 20. Selector modal button — `selecting/SelectorModalButton.vue`

```vue
<template>
    <button type="button" class="btn btn-default" @click="open">
        <slot><Icon name="search" /></slot>
        <Teleport to="#modals">
            <component
                :is="Modal"
                :is-visible="isOpen"
                :title="modalTitle || $t(config.overviewTitle || '')"
                :showFooter="true"
                :full-width="true"
                @close="close"
                @cancel="handleCancel"
                @submit="handleSubmit"
            >
                <SelectorSearch v-model="selected" :filter-defaults="filterDefaults" :item-defaults="itemDefaults" :page-size="maxResults" />
            </component>
        </Teleport>
    </button>
</template>

<script setup lang="ts">
import { ref, computed, watchEffect, type Ref } from "vue"
import { Icon, injectModal } from "@regira/modules/vue/ui"
import config from "../config/config"
import Entity from "../data/Entity"
import useEntityStore from "../data/store"
import SelectorSearch from "./SelectorSearch.vue"

const Modal = injectModal() // resolves the app-wide modal (modalPlugin swap-aware)

const emit = defineEmits<{
    (e: "update:modelValue", selected?: Entity): void
    (e: "select", selected?: Entity): void
}>()
const props = withDefaults(
    defineProps<{
        modelValue?: Entity
        filterDefaults?: Record<string, any>
        itemDefaults?: Ref<Record<string, any>> | Record<string, any>
        label?: string
        maxResults?: number
    }>(),
    { maxResults: 5 }
)

const selected = ref<Entity>()
const isOpen = ref(false)
const { service: entityService } = useEntityStore()
const modalTitle = computed(() => props.label || entityService.toEntity(props.modelValue || {}).$title)

function open() {
    selected.value = props.modelValue
    isOpen.value = true
}
function close() {
    isOpen.value = false
}
function handleCancel() {
    close()
}
function handleSubmit() {
    console.debug("submitSelection", { selected: selected.value })
    emit("update:modelValue", selected.value)
    emit("select", selected.value)
    close()
}

watchEffect(() => (selected.value = props.modelValue))
</script>
```

## 21. Selector search — `selecting/SelectorSearch.vue`

```vue
<template>
    <section class="selector-search">
        <div class="row mt-2">
            <div class="col col-md-auto order-1">
                <!-- Filter -->
                <Filter v-model="searchObject" :result-count="itemsCount" @filter="searchHandler(true)" @change="searchHandler(true)">
                    <template #inline="{ handleToggle }">
                        <slot
                            name="inline"
                            :result-count="itemsCount"
                            :search="searchHandler"
                            :search-object="searchObject"
                            :paging-info="pagingInfo"
                            :handle-toggle="handleToggle"
                        >
                            <FilterInline
                                v-model="searchObject"
                                :result-count="itemsCount"
                                @filter="searchHandler(true)"
                                @change="searchHandler(true)"
                                @toggle-adv="handleToggle"
                            />
                        </slot>
                    </template>
                    <template #adv="{ handleClose }">
                        <slot
                            name="filterAdv"
                            :result-count="itemsCount"
                            :search="searchHandler"
                            :search-object="searchObject"
                            :paging-info="pagingInfo"
                            :handle-close="handleClose"
                        >
                            <component
                                :is="FilterAdv"
                                v-model="searchObject"
                                :result-count="itemsCount"
                                @filter="searchHandler(true)"
                                @change="searchHandler(true)"
                                @close="handleClose"
                            />
                        </slot>
                    </template>
                </Filter>
            </div>
            <div class="col-12 col-md order-3 order-md-2">
                <div class="overflow-hidden">
                    <Feedback v-bind="{ feedback }" :hideCloseButton="true" />
                    <div v-show="!feedback.status" class="row g-0">
                        <div class="col-auto">
                            <div v-if="selected?.id" class="form-control bg-info py-0">
                                <IconButton icon="selected" class="px-1 me-1" @click="handleSelect(undefined)" />
                                <FormModalButton v-model="selected" class="px-1" />
                                {{ selected.$title }}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="col-auto order-2 mb-2">
                <FormModalButton :item-defaults="itemDefaults" :close-on-save="true" @save="({ saved }) => handleSelect(saved)" class="btn btn-info">
                    <Icon name="new" />
                    <span class="d-none d-sm-inline">{{ $t("new") }}</span>
                </FormModalButton>
            </div>
        </div>

        <!-- Paging - ResultSummary -->
        <div class="row">
            <div class="col order-2">
                <template v-if="pagingInfo != null">
                    <Paging
                        class="mt-2"
                        v-show="!isLoading && itemsCount != null && itemsCount > pagingInfo.pageSize!"
                        v-model="pagingInfo"
                        :button-type="ButtonType.button"
                        :count="itemsCount || 0"
                        @change="searchHandler(false)"
                    />
                </template>
            </div>
            <div class="col-12 col-sm-auto order-1 order-sm-3">
                <ResultSummary v-if="items?.length" :visibleCount="items.length" :totalCount="itemsCount" />
            </div>
        </div>

        <!-- List - Loading -->
        <LoadingContainer :is-loading="isLoading">
            <slot name="list" :items="items" :search-object="searchObject" :paging-info="pagingInfo">
                <component :is="List" v-model="items" :selected="selected" @select="handleSelect" />
            </slot>
        </LoadingContainer>

        <!-- Paging -->
        <template v-if="pagingInfo != null">
            <Paging
                class="mt-2"
                v-show="!isLoading && itemsCount != null && itemsCount > pagingInfo.pageSize!"
                v-model="pagingInfo"
                :button-type="ButtonType.button"
                :count="itemsCount || 0"
                @change="searchHandler(false)"
            />
        </template>

        <Debug :modelValue="{ items }" />
    </section>
</template>

<script setup lang="ts">
import { onMounted, type Ref } from "vue"
import { useSearchView } from "@regira/modules/vue/entities"
import { Icon, IconButton, Paging, LoadingContainer, Feedback, ButtonType, ResultSummary } from "@regira/modules/vue/ui"
import { Debug } from "@regira/modules/vue/debug"
import config from "../config/config"
import Entity from "../data/Entity"
import useEntityStore from "../data/store"
import SearchObject from "../filter/SearchObject"
import FormModalButton from "../details/FormModalButton.vue"
import FilterInline from "../filter/FilterInline.vue"
import FilterAdv from "../filter/FilterAdv.vue"
import Filter from "../filter/Filter.vue"
import List from "./SelectorList.vue"

const props = defineProps<{
    filterDefaults?: Record<string, any>
    itemDefaults?: Ref<Record<string, any>> | Record<string, any>
    pageSize?: number
}>()

const selected = defineModel<Entity>()

const { service } = useEntityStore()

const {
    searchObject,
    pagingInfo,

    items,
    itemsCount,

    isLoading,
    feedback,

    searchHandler,
} = useSearchView<Entity, SearchObject>({
    service,
    searchObject: Object.assign(new SearchObject(), props.filterDefaults || {}),
    defaultPageSize: props.pageSize || config.defaultPageSize,
})

console.debug("SelectorSearch", {
    searchObject,
    pagingInfo,
    items,
    itemsCount,
})

function handleSelect(item?: Entity) {
    feedback.success(item != null ? `${item.$title} selected` : `selection removed`)
    selected.value = item
}

onMounted(searchHandler)
</script>
```

## 22. Barrel — `index.ts`

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
export { default as SelectorDropdown } from "./selecting/SelectorDropdown.vue"
export { default as FormModalButton } from "./details/FormModalButton.vue"
export { default as InputSelector } from "./selecting/InputSelector.vue"
export { default as Selector } from "./selecting/Selector.vue"
export { default as SelectorList } from "./selecting/SelectorList.vue"
export { default as SelectorSearch } from "./selecting/SelectorSearch.vue"
export { default as SelectorModalButton } from "./selecting/SelectorModalButton.vue"

export { default as Overview } from "./overview/Overview.vue"
export { default as List } from "./overview/List.vue"
export { default as Details } from "./details/Details.vue"
export { default as Form } from "./details/Form.vue"

export { default as plugin } from "./setup"
```

## 23. Plugin — `setup.ts`

> Note: even a SIMPLE entity registers **both** Overview and Details routes here. `isComplex: false` does
> not drop the Details route — it only changes whether the new-item UX navigates to it or opens a modal.

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
        {
            path: `/${config.routePrefix}`,
            name: `${key}Overview`,
            component: Overview,
        },
        {
            path: `/${config.routePrefix}/:id`,
            name: `${key}Details`,
            component: Details,
            children: [
                {
                    path: "details",
                    name: `${key}Fiche`,
                    component: DetailsSummary,
                },
                {
                    path: "edit",
                    name: `${key}Form`,
                    component: Form,
                },
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

> A **lookup** entity (no list UI) omits `createRoutes()` and the views — its `install` only registers
> the service, icon, and config. Its `SearchObject` can be `class EntitySearchObject extends SearchObjectBase {}`.

---

# Part 2 — Standard slice (`Product`)

> **Framing note.** `Product` builds on the simple slice above. The shared boilerplate —
> `data/store.ts`, `details/Details.vue`, `details/FormModalButton.vue`, `filter/Filter.vue`,
> `filter/FilterInline.vue`, the `selecting/` picker set (`Autocomplete`, `InputSelector`, `Selector`,
> `SelectorDropdown`, `SelectorModalButton`, `SelectorSearch`), the `EntityService` `toEntity`-only shape,
> the `index.ts` barrel, and the `setup.ts` plugin shape — is **IDENTICAL** to Part 1 and is **not
> repeated**. Only the files `Product` actually changes are shown below; for every shared file, a one-line
> pointer up to its Part 1 section is given instead of a reprint.

What makes `Product` the **standard** tier rather than simple:

- `isComplex: true` → new/edit **navigates to a Details page** (not a modal) and the Form is tabbed.
  (`searchUrl` is `api + "/search"` for every entity — the overview always pages through it.)
- The model carries **relations** (`unitType`, `assemblies`, `components`, `facets`, `suppliers`) and extra
  fields.
- The `SearchObject` adds many relation/boolean filters; `FilterAdv.vue` is a full relation-picker panel.
- The `Form` is **tabbed** (`TabContainer`) with selectors and embedded child overviews.

## Product boilerplate — reuse Part 1 verbatim

These files are byte-identical to Part 1 (only the literal `Entity`/`Product` name differs where shown);
do not rewrite them:

- **Store** — `data/store.ts` → see [Part 1 §4](#4-store--datastorets).
- **Details** — `details/Details.vue` → see [Part 1 §12](#12-details--detailsdetailsvue).
- **Form modal button** — `details/FormModalButton.vue` → see [Part 1 §14](#14-form-modal-button--detailsformmodalbuttonvue).
- **Filter** — `filter/Filter.vue` → see [Part 1 §6](#6-filter--filterfiltervue).
- **Filter (inline)** — `filter/FilterInline.vue` → see [Part 1 §7](#7-filter-inline--filterfilterinlinevue).
- **Autocomplete** — `selecting/Autocomplete.vue` → see [Part 1 §15](#15-autocomplete--selectingautocompletevue).
- **Input selector** — `selecting/InputSelector.vue` → see [Part 1 §16](#16-input-selector--selectinginputselectorvue).
- **Selector** — `selecting/Selector.vue` → see [Part 1 §17](#17-selector--selectingselectorvue).
- **Selector dropdown** — `selecting/SelectorDropdown.vue` → see [Part 1 §18](#18-selector-dropdown--selectingselectordropdownvue).
- **Selector modal button** — `selecting/SelectorModalButton.vue` → see [Part 1 §20](#20-selector-modal-button--selectingselectormodalbuttonvue).
- **Selector search** — `selecting/SelectorSearch.vue` → see [Part 1 §21](#21-selector-search--selectingselectorsearchvue).
- **Service** — `data/EntityService.ts`: same `toEntity`-only shape as [Part 1 §3](#3-service--dataentityservicets-c); `Product` additionally overrides `prepareItem` (shown in §3 below) to drop transient children before save.
- **Barrel** — `index.ts`: same export shape as [Part 1 §22](#22-barrel--indexts).
- **Plugin** — `setup.ts`: same plugin shape as [Part 1 §23](#23-plugin--setupts).

## 1. Product model — `data/Entity.ts` (c)

```ts
import { EntityBase } from "@regira/modules/vue/entities"
import type { Entity as UnitType } from "@/entities/unit-types"
import type ProductComponent from "../product-components/Entity"
import type ProductFacet from "../product-facets/Entity"
import type ProductSupplier from "../product-suppliers/Entity"

export class Product extends EntityBase {
    id: number = 0
    title = ""
    description?: string

    unitTypeId?: number
    defaultQuantity?: number

    created?: Date
    lastModified?: Date

    unitType?: UnitType
    assemblies?: ProductComponent[]
    components?: ProductComponent[]
    facets?: ProductFacet[]
    suppliers?: ProductSupplier[]

    override get $id(): string | number {
        return this.id || "new"
    }
    override get $title(): string | undefined {
        return this.title
    }
}

export const Entity = Product

export default Product
```

## 2. Product config — `config/config.ts` (c)

`isComplex: true` flips the standard-tier behaviour: the Overview's "new" button navigates to the Details
page and the Form is tabbed. (`searchUrl` is `api + "/search"` for every entity — the overview always pages
through it.) `baseQueryParams.includes` requests the related collections on every list/search (the Details
GET ignores it and passes `EntityIncludes.All` to the server regardless).

```ts
import type { IConfig } from "@regira/modules/vue/entities"
import Entity from "../data/Entity"

const api = "/products"

const config: IConfig = {
    id: Entity.name,
    key: "Product",
    isComplex: true,

    routePrefix: "products",
    baseQueryParams: {
        includes: ["Facets", "Components"],
    },
    initialQuery: { isRoot: true },

    overviewTitle: "products",
    detailsTitle: "product",
    description: "product.description",
    icon: "bi bi-joystick",

    defaultPageSize: 10,

    api,
    detailsUrl: api,
    listUrl: api,
    searchUrl: api + "/search",
    saveUrl: api,
    deleteUrl: api,
}

export default config
```

## 3. Product service — `data/EntityService.ts` (c)

Same `toEntity`-only shape as [Part 1 §3](#3-service--dataentityservicets-c), plus a `prepareItem` override
that manages **related (owned child) collections** on save — the **`_deleted` pattern**: when the user removes
a child row in the form, the owned-collection composables (`useOwnedCollection` / `useListItemInput`) don't
splice it out — they set `_deleted = true` so the removal survives round-trips. `prepareItem` then **filters
out the `_deleted` rows** before the entity is sent, so the server deletes them (`EntityServiceBase` also
strips any leftover `_`-prefixed keys). Repeat per child collection (`components`, `facets`, `suppliers`, …).

> **→ See:** [entities.patterns.md → Owned (child) collections](entities.patterns.md#owned-child-collections)
> and [→ Transient client-only fields](entities.patterns.md#transient-client-only-fields) for the full
> `_deleted` recipe. For the attachments-aware variant of the service, see
> [entities.advanced.example.md](entities.advanced.example.md).

```ts
import type { AxiosInstance } from "axios"
import { EntityServiceBase, type IConfig } from "@regira/modules/vue/entities"
import Entity from "./Entity"

export class EntityService extends EntityServiceBase<Entity> {
    constructor(axios: AxiosInstance, config: IConfig) {
        super(axios, config)
    }

    protected override prepareItem(item: Entity): Entity {
        // related (owned) collections — drop rows the user removed (marked `_deleted` by useOwnedCollection)
        // so the server deletes them. Repeat per child collection, e.g.:
        // item.components = item.components?.filter((x) => !x._deleted)
        // ⚠️ never `|| []` — null means "untouched" to the server, [] means "delete every row", and a
        // collection this form never loaded is undefined.
        return super.prepareItem(item) // strips the root `_`-prefixed fields
    }

    override toEntity(item: object): Entity {
        return item instanceof Entity ? item : Object.assign(this.createInstance(Entity as new () => Entity), item || {})
    }
}

export default EntityService
```

## 4. Product search object — `filter/SearchObject.ts` (c)

> The class is named `EntitySearchObject` in the reference app — it is **not** renamed per entity (the
> barrel and consumers import it as the module default), so this name is reproduced verbatim.

```ts
import { SearchObjectBase } from "@regira/modules/vue/entities"

export class EntitySearchObject extends SearchObjectBase {
    title?: string

    assemblyId?: number | Array<number>
    componentId?: number | Array<number>
    allComponentId?: number | Array<number>
    excludeComponentId?: number | Array<number>

    facetGroupId?: number | Array<number>
    excludeFacetGroupId?: number | Array<number>

    facetId?: number | Array<number>
    allFacetId?: number | Array<number>
    excludeFacetId?: number | Array<number>

    unitTypeId?: number
    supplierId?: number | Array<number>

    isRoot?: boolean
    isComponent?: boolean
    isAssembly?: boolean

    minCreated?: Date
    maxCreated?: Date
    minLastModified?: Date
    maxLastModified?: Date
}

export default EntitySearchObject
```

## 5. Product filter (advanced) — `filter/FilterAdv.vue` (c)

```vue
<template>
    <div class="adv-filter">
        <div class="row">
            <div class="col mb-2" v-if="resultCount != null">
                <span class="text-info">{{ resultCount }} {{ $t("results") }}</span>
                <small v-if="filterIsActive" class="ms-2 italic-muted">({{ $t("filtersAreApplied") }})</small>
                <span v-if="isLoading" class="ms-2 text-muted"><Loading style="height: 1.5rem" /></span>
            </div>
            <div class="col mb-2 text-end">
                <IconButton icon="clear" @click="handleReset" :showText="true" />
            </div>
        </div>
        <div class="row">
            <!-- keywords -->
            <div class="col mb-2">
                <div class="input-group">
                    <div class="input-group-text">
                        <Icon name="search" />
                    </div>
                    <input v-model.lazy.trim="searchObject.q" class="form-control" :placeholder="$t('keywords')" />
                </div>
                <FormLabel :label="$t('keywords')" />
            </div>
            <!-- title -->
            <div class="col mb-2">
                <div class="input-group">
                    <div class="input-group-text">
                        <Icon name="search" />
                    </div>
                    <input v-model.lazy.trim="searchObject.title" class="form-control" :placeholder="$t('name')" />
                </div>
                <FormLabel :label="$t('name')" />
            </div>
        </div>
        <div class="row">
            <!-- isRoot, isAssembly, isComponent -->
            <div class="col mb-2">
                <div>
                    <div class="form-check form-check-inline">
                        <NullableCheckBox v-model="searchObject.isRoot" id="isRoot" class="form-check-input" />
                        <label class="form-check-label" for="isRoot">{{ $t("isRoot") }}</label>
                    </div>
                    <div class="form-check form-check-inline">
                        <NullableCheckBox v-model="searchObject.isAssembly" id="isAssembly" class="form-check-input" />
                        <label class="form-check-label" for="isAssembly">{{ $t("product.isAssembly") }}</label>
                    </div>
                    <div class="form-check form-check-inline">
                        <NullableCheckBox v-model="searchObject.isComponent" id="isComponent" class="form-check-input" />
                        <label class="form-check-label" for="isComponent">{{ $t("product.isComponent") }}</label>
                    </div>
                </div>
                <FormLabel :label="$t('assembly')" />
            </div>
            <!-- UnitType -->
            <div class="col mb-2">
                <UnitTypeInputSelector
                    v-model="unitType"
                    v-model:id-value="searchObject.unitTypeId"
                    :placeholder="$t('unitType')"
                    @select="handleFilter"
                />
                <FormLabel :label="$t('unitType')" />
            </div>
        </div>
        <div class="row">
            <!-- Component -->
            <div class="col mb-2">
                <InputSelector
                    v-model="component"
                    v-model:idValue="searchObject.componentId as number"
                    :canEdit="false"
                    :filterDefaults="{ isComponent: true }"
                    :placeholder="$t('product.component')"
                    @select="handleFilter"
                >
                    <template #prepend>
                        <span class="input-group-text">
                            <Icon name="component" />
                        </span>
                    </template>
                </InputSelector>
                <FormLabel :label="$t('product.component')" />
            </div>
            <!-- Assembly -->
            <div class="col mb-2">
                <InputSelector
                    v-model="assembly"
                    v-model:idValue="searchObject.assemblyId as number"
                    :canEdit="false"
                    :filterDefaults="{ isAssembly: true }"
                    :placeholder="$t('product.assembly')"
                    @select="handleFilter"
                >
                    <template #prepend>
                        <span class="input-group-text">
                            <Icon name="assembly" />
                        </span>
                    </template>
                </InputSelector>
                <FormLabel :label="$t('product.assembly')" />
            </div>
        </div>
        <div class="row">
            <!-- Facet Group -->
            <div class="col mb-2">
                <FacetGroupInputSelector
                    v-model="facetGroup"
                    v-model:idValue="searchObject.facetGroupId as number"
                    :canEdit="false"
                    :placeholder="$t('product.facetGroup')"
                    @select="handleFilter"
                >
                    <template #prepend>
                        <span class="input-group-text bg-success bg-opacity-25">
                            <Icon :name="facetGroupConfig.key" />
                        </span>
                    </template>
                </FacetGroupInputSelector>
                <FormLabel :label="$t('product.facetGroup')" />
            </div>
            <!-- Exclude Facet Group -->
            <div class="col mb-2">
                <FacetGroupInputSelector
                    v-model="excludeFacetGroup"
                    v-model:idValue="searchObject.excludeFacetGroupId as number"
                    :canEdit="false"
                    :placeholder="$t('product.facetGroup')"
                    @select="handleFilter"
                >
                    <template #prepend>
                        <span class="input-group-text bg-danger bg-opacity-25">
                            <Icon :name="facetGroupConfig.key" />
                        </span>
                    </template>
                </FacetGroupInputSelector>
                <FormLabel :label="$t('product.excludedFacetGroup')" />
            </div>
        </div>
        <div class="row">
            <!-- All Components -->
            <div class="col">
                <div class="row">
                    <div class="col-auto mb-2" v-for="c in allComponents" :key="c.id">
                        <div class="input-group mt-1">
                            <span class="input-group-text bg-success bg-opacity-50">
                                <Icon name="check" />
                            </span>
                            <div class="form-control">{{ c.$title }}</div>
                            <button class="btn btn-outline-secondary" @click="handleRemoveComponent(c)">
                                <Icon name="close" />
                            </button>
                        </div>
                    </div>
                    <div class="col-auto">
                        <InputSelector
                            @select="handleAddComponent"
                            :canEdit="false"
                            :filter-defaults="{ isComponent: true }"
                            :placeholder="$t('product.addComponent')"
                        >
                            <template #prepend>
                                <span class="input-group-text bg-success bg-opacity-25">
                                    <Icon name="component" />
                                </span>
                            </template>
                        </InputSelector>
                    </div>
                </div>
                <FormLabel :label="$t('product.allComponents')" />
            </div>
            <!-- Exclude Components -->
            <div class="col">
                <div class="row">
                    <div class="col-auto mb-2" v-for="c in excludeComponents" :key="c.id">
                        <div class="input-group mt-1">
                            <span class="input-group-text bg-danger bg-opacity-50">
                                <Icon name="ban" />
                            </span>
                            <div class="form-control">{{ c.$title }}</div>
                            <button class="btn btn-outline-secondary" @click="handleRemoveExcludedComponent(c)">
                                <Icon name="close" />
                            </button>
                        </div>
                    </div>
                    <div class="col-auto">
                        <InputSelector
                            @select="handleAddExcludedComponent"
                            :canEdit="false"
                            :filter-defaults="{ isComponent: true }"
                            :placeholder="$t('product.addComponent')"
                        >
                            <template #prepend>
                                <span class="input-group-text bg-danger bg-opacity-25">
                                    <Icon name="component" />
                                </span>
                            </template>
                        </InputSelector>
                    </div>
                </div>
                <FormLabel :label="$t('product.excludedComponents')" />
            </div>
        </div>
        <div class="row">
            <!-- All Facets -->
            <div class="col">
                <div class="row">
                    <div class="col-auto mb-2" v-for="f in allFacets" :key="f.id">
                        <div class="input-group mt-1">
                            <span class="input-group-text bg-success bg-opacity-50">
                                <Icon name="check" />
                            </span>
                            <div class="form-control">{{ f.$title }}</div>
                            <button class="btn btn-outline-secondary" @click="handleRemoveFacet(f)">
                                <Icon name="close" />
                            </button>
                        </div>
                    </div>
                    <div class="col-auto">
                        <FacetInputSelector @select="handleAddFacet" :canEdit="false" :placeholder="$t('product.addFacet')">
                            <template #prepend>
                                <span class="input-group-text bg-success bg-opacity-25">
                                    <Icon :name="facetConfig.key" />
                                </span>
                            </template>
                        </FacetInputSelector>
                    </div>
                </div>
                <FormLabel :label="$t('product.allFacets')" />
            </div>
            <!-- Exclude Facets -->
            <div class="col">
                <div class="row">
                    <div class="col-auto mb-2" v-for="f in excludeFacets" :key="f.id">
                        <div class="input-group mt-1">
                            <span class="input-group-text bg-danger bg-opacity-50">
                                <Icon name="ban" />
                            </span>
                            <div class="form-control">{{ f.$title }}</div>
                            <button class="btn btn-outline-secondary" @click="handleRemoveExcludedFacet(f)">
                                <Icon name="close" />
                            </button>
                        </div>
                    </div>
                    <div class="col-auto">
                        <FacetInputSelector @select="handleAddExcludedFacet" :canEdit="false" :placeholder="$t('product.addFacet')">
                            <template #prepend>
                                <span class="input-group-text bg-danger bg-opacity-25">
                                    <Icon :name="facetConfig.key" />
                                </span>
                            </template>
                        </FacetInputSelector>
                    </div>
                </div>
                <FormLabel :label="$t('product.excludedFacets')" />
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, watch, watchEffect } from "vue"
import { useFilter, type FilterEmits } from "@regira/modules/vue/entities"
import { config as unitTypeConfig, type Entity as UnitType, InputSelector as UnitTypeInputSelector } from "@/entities/unit-types"
import { config as facetConfig, type Entity as Facet, InputSelector as FacetInputSelector, useEntityStore as useFacetStore } from "@/entities/facets"
import { config as facetGroupConfig, type Entity as FacetGroup, InputSelector as FacetGroupInputSelector } from "@/entities/facet-groups"
import SearchObject from "./SearchObject"
import InputSelector from "../selecting/InputSelector.vue"
import Product from "../data/Entity"
import useEntityStore from "../data/store"

interface Emits extends /* @vue-ignore */ FilterEmits {}
const emit = defineEmits<
    Emits & {
        "update:modelValue": (value: SearchObject) => true
        filter: (value: SearchObject) => true
    }
>()

const props = defineProps<{
    resultCount?: number
    isLoading?: boolean
}>()

const searchObject = defineModel<SearchObject>({ required: true })

const unitType = ref<UnitType>()
const component = ref<Product>()
const assembly = ref<Product>()
const facetGroup = ref<FacetGroup>()
const excludeFacetGroup = ref<FacetGroup>()
const allComponents = ref<Array<Product>>()
const excludeComponents = ref<Array<Product>>()
const allFacets = ref<Array<Facet>>()
const excludeFacets = ref<Array<Facet>>()

const {
    filterIsActive,
    handleReset: handleProductReset,
    handleFilter,
} = useFilter({
    searchObject,
    emit,
    Constructor: SearchObject,
})

function handleReset() {
    handleProductReset()
    unitType.value = undefined
    component.value = undefined
    assembly.value = undefined
    facetGroup.value = undefined
    excludeFacetGroup.value = undefined
    allComponents.value = undefined
    excludeComponents.value = undefined
    allFacets.value = undefined
    excludeFacets.value = undefined
}

watch(allComponents, () => {
    searchObject.value = {
        ...searchObject.value,
        allComponentId: allComponents.value?.map((c) => c.id),
    }
    emit("filter", searchObject.value)
})
watch(excludeComponents, () => {
    searchObject.value = {
        ...searchObject.value,
        excludeComponentId: excludeComponents.value?.map((c) => c.id),
    }
    emit("filter", searchObject.value)
})
watch(allFacets, () => {
    searchObject.value = {
        ...searchObject.value,
        allFacetId: allFacets.value?.map((f) => f.id),
    }
    emit("filter", searchObject.value)
})
watch(excludeFacets, () => {
    searchObject.value = {
        ...searchObject.value,
        excludeFacetId: excludeFacets.value?.map((f) => f.id),
    }
    emit("filter", searchObject.value)
})

function handleAddComponent(product?: Product) {
    if (product && !allComponents.value?.some((c) => c.id === product.id)) {
        allComponents.value = [...(allComponents.value ?? []), product]
    }
}
function handleRemoveComponent(product: Product) {
    allComponents.value = allComponents.value?.filter((c) => c.id !== product.id)
}
function handleAddExcludedComponent(product?: Product) {
    if (product && !excludeComponents.value?.some((c) => c.id === product.id)) {
        excludeComponents.value = [...(excludeComponents.value ?? []), product]
    }
}
function handleRemoveExcludedComponent(product: Product) {
    excludeComponents.value = excludeComponents.value?.filter((c) => c.id !== product.id)
}
function handleAddFacet(facet?: Facet) {
    if (facet && !allFacets.value?.some((f) => f.id === facet.id)) {
        allFacets.value = [...(allFacets.value ?? []), facet]
    }
}
function handleRemoveFacet(facet: Facet) {
    allFacets.value = allFacets.value?.filter((f) => f.id !== facet.id)
}
function handleAddExcludedFacet(facet?: Facet) {
    if (facet && !excludeFacets.value?.some((f) => f.id === facet.id)) {
        excludeFacets.value = [...(excludeFacets.value ?? []), facet]
    }
}
function handleRemoveExcludedFacet(facet: Facet) {
    excludeFacets.value = excludeFacets.value?.filter((f) => f.id !== facet.id)
}

const { service } = useEntityStore()
const { service: facetService } = useFacetStore()
watchEffect(async () => {
    if (searchObject.value.allComponentId != null && allComponents.value == null) {
        allComponents.value = await service.list({ ids: searchObject.value.allComponentId as number[] })
    }
})
watchEffect(async () => {
    if (searchObject.value.excludeComponentId != null && excludeComponents.value == null) {
        excludeComponents.value = await service.list({ ids: searchObject.value.excludeComponentId as number[] })
    }
})
watchEffect(async () => {
    const hasFacetId =
        searchObject.value.allFacetId != null &&
        (!Array.isArray(searchObject.value.allFacetId) || (searchObject.value.allFacetId as Array<number>)?.length)

    if (hasFacetId && allFacets.value == null) {
        allFacets.value = await facetService.list({ ids: searchObject.value.allFacetId as number[] })
    }
})
watchEffect(async () => {
    const hasExcludeFacetId =
        searchObject.value.excludeFacetId != null &&
        (!Array.isArray(searchObject.value.excludeFacetId) || (searchObject.value.excludeFacetId as Array<number>)?.length)
    if (hasExcludeFacetId && excludeFacets.value == null) {
        console.debug("Loading excluded facets", searchObject.value.excludeFacetId)
        excludeFacets.value = await facetService.list({ ids: searchObject.value.excludeFacetId as number[] })
    }
})
</script>
```

## 6. Product list — `overview/List.vue` (c)

```vue
<template>
    <div class="entity-list">
        <div class="row pb-2 border-bottom border-bottom-1">
            <div class="col-auto">
                <span v-if="config.isComplex" class="btn btn-link p-1 disabled"><Icon name="edit" /></span>
                <button v-else type="button" class="btn btn-default" disabled><Icon :name="config.key" /></button>
            </div>
            <div class="col fw-bold">{{ $t("name") }}</div>
            <div class="d-none d-lg-block col-lg col-xl-3 fw-bold">
                {{ $t("product.facets") }}
            </div>
            <div class="d-none d-xl-block col-xl-3 fw-bold">
                {{ $t("product.components") }}
            </div>
            <div class="col-2 d-none d-md-block fw-bold">{{ $t("unitType") }}</div>
            <div class="col-auto fw-bold">
                <span class="btn disabled text-muted"><Icon name="delete" /></span>
            </div>
        </div>
        <template v-for="(item, i) in items" :key="item.$id">
            <ListItem
                v-model="items[i]!"
                :readonly="readonly"
                :class="{ 'bg-light': i % 2 == 0 }"
                @request-save="$emit('request-save', $event)"
                @request-remove="$emit('request-remove', $event)"
                @save="$emit('save', $event)"
                @remove="$emit('remove', $event)"
            />
        </template>
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

const props = defineProps<{
    modelValue?: Array<Entity>
    readonly?: boolean
}>()

const { fromPool } = useEntityStore()

const items = computed<Array<Entity>>({
    get: () => fromPool(props.modelValue || []),
    set: (value) => emit("update:modelValue", value),
})
</script>
```

## 7. Product list item — `overview/ListItem.vue` (c)

> This row renders **foreign relations** — `item.unitType`, `item.facets[].facet`, `item.components[].component`
> — by aliasing each owning store's `fromPool` (`getUnitType` / `getFacet` / `getProduct`) and reading the
> getter off the pooled instance: `getUnitType(item.unitType)?.$title`. `fromPool` rehydrates the plain nested
> relation into a shared, reactive model so `$title` resolves — pass the relation **object**, not its id.
> Because that model is shared, editing it anywhere (its own `FormModalButton`, a details form) updates every
> row that pooled it, live. See
> [entities.patterns.md → Resolving relations with `fromPool`](entities.patterns.md#resolving-relations-with-frompool).

```vue
<template>
    <div class="border-bottom border-bottom-1 py-2">
        <div class="row">
            <div class="col-auto">
                <template v-if="config.isComplex">
                    <!-- Complex entity: Link to input page -->
                    <router-link :to="{ name: config.key + 'Details', params: { id: item.$id } }" class="btn btn-link p-1">
                        <Icon :name="config.key" />
                    </router-link>
                </template>
                <template v-else>
                    <!-- Simple enitty: Open form modal -->
                    <FormModalButton v-model="item" @save="$emit('save', $event)" />
                </template>
            </div>
            <div class="col text-truncate">
                {{ item.$title }}
            </div>
            <div class="d-none d-lg-block col-lg col-xl-3 text-truncate">
                <span v-for="(itemFacet, i) in item.facets" :key="itemFacet.id" class="me-1">
                    {{ getFacet(itemFacet.facet)?.$title }}<span v-if="i < (item.facets ?? []).length - 1">,</span>
                </span>
            </div>
            <div class="d-none d-xl-block col-xl-3 text-truncate">
                <span v-for="(itemComponent, i) in item.components" :key="itemComponent.id" class="me-1">
                    {{ getProduct(itemComponent.component)?.$title }}<span v-if="i < (item.components ?? []).length - 1">,</span>
                </span>
            </div>
            <div class="col-2 d-none d-md-block text-truncate">
                <UnitTypeButton :model-value="item.unitType" />{{ getUnitType(item.unitType)?.$title }}
            </div>
            <div class="col-auto">
                <ConfirmButton icon="delete" class="m-0 p-1" :modal-type="ModalType.danger" @confirm="$emit('request-remove', item)">{{
                    $t("deleteItem", { title: item?.$title })
                }}</ConfirmButton>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { Icon, ModalType, ConfirmButton } from "@regira/modules/vue/ui"
import { formatCurrency } from "@regira/modules/vue/formatters"
import { type SaveResult } from "@regira/modules/vue/entities"
import { useEntityStore as useUnitTypeStore, FormModalButton as UnitTypeButton } from "@/entities/unit-types"
import { useEntityStore as useFacetStore, FormModalButton as FacetButton } from "@/entities/facets"
import config from "../config/config"
import Entity from "../data/Entity"
import useEntityStore from "../data/store"
import FormModalButton from "../details/FormModalButton.vue"

const emit = defineEmits<{
    (e: "save", args: SaveResult<Entity>): void
    (e: "remove", item: Entity): void
    (e: "request-save", item: Entity): void
    (e: "request-remove", item: Entity): void
}>()
const props = defineProps<{
    readonly?: boolean
}>()

const item = defineModel<Entity>({ required: true })

const { fromPool: getProduct } = useEntityStore()
const { fromPool: getUnitType } = useUnitTypeStore()
const { fromPool: getFacet } = useFacetStore()
</script>
```

## 8. Product overview — `overview/Overview.vue`

> The Overview shell is the boilerplate from [Part 1 §11](#11-overview--overviewoverviewvue-c), but `Product`'s
> copy carries a **`Product`-specific `Debug` projection** that flattens `item.unitType` / `item.components` /
> `item.facets` for display. Keep that projection only for entities with those relations.
>
> **Caveat:** the `Debug` block references `item.unitType` / `item.components` / `item.facets` — the
> `Product`-specific relations from `data/Entity.ts`. When copying this boilerplate `Overview.vue` to
> another entity, adjust that `Debug` projection to your own relations (or drop it).

```vue
<template>
    <section class="overview">
        <div class="row justify-content-between gx-0 gx-sm-1">
            <div class="col col-lg-auto order-1">
                <!-- Filter -->
                <Filter v-model="searchObject" @filter="updateOverviewRoute(true)" @change="updateOverviewRoute(true)" :result-count="itemsCount">
                    <template #adv="{ handleClose }">
                        <slot
                            name="filterAdv"
                            :result-count="itemsCount"
                            :search="updateOverviewRoute"
                            :search-object="searchObject"
                            :paging-info="pagingInfo"
                            :handle-close="handleClose"
                        >
                            <component
                                :is="FilterAdv"
                                v-model="searchObject"
                                :result-count="itemsCount"
                                :is-loading="isLoading"
                                @filter="updateOverviewRoute(true)"
                                @change="updateOverviewRoute(true)"
                                @close="handleClose"
                            />
                        </slot>
                    </template>
                </Filter>
            </div>
            <div class="col-12 col-lg order-3 order-lg-2">
                <Feedback v-bind="{ feedback }" :hideCloseButton="true" />
            </div>
            <div class="col-auto order-2 order-lg-3 ps-2">
                <RouterLink :to="{ name: config.key + 'Details', params: { id: 'new' } }" class="btn btn-info">
                    <Icon name="new" /><span class="d-none d-sm-inline ms-1">{{ $t("new") }}</span>
                </RouterLink>
            </div>
        </div>

        <!-- Paging - ResultSummary -->
        <div class="row">
            <div class="col order-2">
                <template v-if="pagingInfo != null">
                    <Paging
                        class="mt-2"
                        v-show="!isLoading && itemsCount != null && itemsCount > pagingInfo.pageSize!"
                        v-model="pagingInfo"
                        :count="itemsCount || 0"
                        @change="updateOverviewRoute(false)"
                    />
                </template>
            </div>
            <div class="col-12 col-sm-auto order-1 order-sm-3">
                <ResultSummary v-if="items?.length" :visibleCount="items.length" :totalCount="itemsCount" />
            </div>
        </div>

        <!-- List - Loading -->
        <LoadingContainer :is-loading="isLoading">
            <component
                :is="List"
                v-if="items && items.length > 0"
                v-model="items"
                @request-save="handleRequestSave"
                @request-remove="handleRequestRemove"
                @save="handleSave"
                @remove="handleRemove"
                @request-reload="updateOverviewRoute(false)"
            />
            <p v-if="items && items.length <= 0" class="italic-muted">
                {{ $t("noResults") }}
            </p>
        </LoadingContainer>

        <!-- Paging -->
        <template v-if="pagingInfo != null">
            <Paging
                class="mt-2"
                v-show="!isLoading && itemsCount != null && itemsCount > pagingInfo.pageSize!"
                v-model="pagingInfo"
                :count="itemsCount || 0"
                @change="updateOverviewRoute(false)"
            />
        </template>

        <Debug
            :modelValue="{
                pagingInfo,
                items: items?.map((item) => ({
                    ...item,
                    unitType: `${item.unitType?.title}`,
                    components: item.components?.map(
                        ({ id, component, quantity }) => `${component?.title} #${id} (${quantity} ${component?.unitType?.code})`
                    ),
                    facets: item.facets?.map(({ id, facet }) => `${facet?.title} #${id}`),
                })),
            }"
        />
    </section>
</template>

<script setup lang="ts">
import { useSearchView, useRouteOverview, type OverviewEmits } from "@regira/modules/vue/entities"
import { Icon, Paging, LoadingContainer, Feedback, ResultSummary } from "@regira/modules/vue/ui"
import { Debug } from "@regira/modules/vue/debug"
import { useAuthStore } from "@regira/modules/vue/auth"
import config from "../config/config"
import Entity from "../data/Entity"
import useEntityStore from "../data/store"
import SearchObject from "../filter/SearchObject"
import Filter from "../filter/Filter.vue"
import FilterAdv from "../filter/FilterAdv.vue"
import List from "./List.vue"

interface Emits extends /* @vue-ignore */ OverviewEmits<Entity> {}
defineEmits<
    Emits & {
        "update:modelValue": (value: SearchObject) => true
        filter: (value: SearchObject) => true
    }
>()

const { service } = useEntityStore()

const { searchObject, pagingInfo, items, itemsCount, isLoading, feedback, applySave, applyRemove, handleSave, handleRemove, searchHandler } =
    useSearchView<Entity, SearchObject>({
        service,
        searchObject: new SearchObject(),
        defaultPageSize: config.defaultPageSize,
    })
const { updateOverviewRoute } = useRouteOverview({
    searchObject,
    pagingInfo,
    handler: searchHandler,
    defaultPageSize: config.defaultPageSize,
})

// trigger searchHandler when logging in or refreshing token — no-auth app: delete these two lines (scaffold.mjs --no-auth strips them; see entities.setup.md#running-without-authentication)
const authStore = useAuthStore()
authStore.$onAction(({ name, after }) => ["login", "refresh"].includes(name) && after(() => authStore.isAuthenticated && searchHandler(false)))

async function handleRequestSave(item: Entity) {
    const result = await applySave(item)
    if (result != null) {
        handleSave(result)
    }
}
async function handleRequestRemove(item: Entity) {
    // Guard on the result, exactly like save: a delete the server refused (409 while the row is still
    // referenced) would otherwise show the failure AND remove the row until the next fetch.
    if (await applyRemove(item)) {
        handleRemove(item)
    }
}
</script>
```

## 9. Product form — `details/Form.vue` (c)

> The STANDARD-tier form: a `TabContainer` with selectors (`UnitTypeInputSelector`), embedded child
> overviews (components, assemblies, suppliers), and a flattened `Debug` projection. Contrast with the
> single-`FormSection`, text-only simple form in [Part 1 §13](#13-form--detailsformvue-c). A hierarchical
> **tree** view for a self-referencing entity is a separate recipe — see
> [entities.patterns.md → Hierarchical (tree) entities](entities.patterns.md#hierarchical-tree-entities).

```vue
<template>
    <form @submit.prevent="handleSubmit" :modelValue="item">
        <div class="row form-toolbar">
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
                <RouterLink
                    v-if="isPopup"
                    :to="{ name: `${config.key}Details`, params: { id: item.$id } }"
                    class="btn btn-default py-1"
                    target="_blank"
                    :title="$t('popOut')"
                >
                    <Icon name="popOut" />
                </RouterLink>
                <RouterLink v-else-if="overviewUrl" :to="overviewUrl" class="btn btn-info py-1">
                    <Icon name="list" />
                    <span class="d-none d-md-inline ms-1">{{ $t("overview") }}</span>
                </RouterLink>
            </div>
            <div class="col-md order-3 order-md-2">
                <Feedback :feedback="feedback" />
            </div>
        </div>

        <TabContainer :tabs="tabs" :active="initialTab" :use-route-nav="!isPopup">
            <template #form>
                <div class="row">
                    <div class="col-lg mb-2">
                        <FormSection :title="$t(config.detailsTitle || '')" :readonly="readonly">
                            <div class="row">
                                <div class="col-lg mb-2">
                                    <div class="input-group">
                                        <div class="input-group-text">
                                            <Icon name="title" />
                                        </div>
                                        <input v-model="item.title" maxlength="128" :readonly="readonly" class="form-control" />
                                    </div>
                                    <FormLabel :label="$t('name')" />
                                </div>
                            </div>
                            <div class="row">
                                <div class="col mb-2">
                                    <UnitTypeInputSelector v-model="item.unitType" v-model:idValue="item.unitTypeId" :readonly="readonly" />
                                    <FormLabel :label="$t('unitType')" />
                                </div>
                                <div class="col mb-2">
                                    <input
                                        type="number"
                                        v-model.number="item.defaultQuantity"
                                        :readonly="readonly"
                                        class="form-control"
                                        min="0"
                                        step="any"
                                    />
                                    <FormLabel :label="$t('product.defaultQuantity')" />
                                </div>
                            </div>
                            <div class="row">
                                <div class="col mb-2">
                                    <DescriptionInput v-model="item.description" :label="$t('description')" :readonly="readonly" />
                                </div>
                            </div>
                        </FormSection>

                        <FormSection :title="$t('product.suppliers')" class="d-none d-lg-block">
                            <SupplierInputSelectorOverview v-model="item" />
                        </FormSection>
                    </div>
                    <div class="col mb-2 d-none d-lg-block">
                        <FormSection :title="$t('product.facets')">
                            <InputSelectorInline v-model="item" />
                        </FormSection>

                        <FormSection :title="$t('product.components')">
                            <ComponentOverview v-model="item" />
                        </FormSection>
                    </div>
                </div>
            </template>

            <template #components>
                <FormSection :title="$t('product.components')">
                    <ComponentOverview v-model="item" />
                </FormSection>
            </template>

            <template #assemblies>
                <AssemblyOverview :product="item" />
            </template>

            <template #suppliers>
                <FormSection :title="$t('product.suppliers')">
                    <SupplierInputSelectorOverview v-model="item" />
                </FormSection>
            </template>
        </TabContainer>

        <Debug
            :modelValue="{
                screen: { size: screen.size },
                item: {
                    ...item,
                    unitType: item.unitType?.title,
                    components: item.components?.map(
                        ({ id, component, quantity }) => `${component?.title} (${quantity} ${component?.unitType?.title}) #${id}`
                    ),
                    facets: item.facets?.map(({ id, facet }) => `${facet?.title} #${id}`),
                    suppliers: item.suppliers?.map(({ id, supplier }) => `${supplier?.name} #${id}`),
                },
            }"
        />
    </form>
</template>

<script setup lang="ts">
import { computed } from "vue"
import type { RouteRecordRaw } from "vue-router"
import { useLang } from "@regira/modules/vue/lang"
import { Feedback, TabContainer, Tab, useScreen } from "@regira/modules/vue/ui"
import { FormButtonsRow } from "@regira/modules/vue/ui"
import { useForm, type FormEmits, formDefaults } from "@regira/modules/vue/entities"
import { SelectorDropdown as UnitTypeInputSelector } from "@/entities/unit-types"
import AssemblyOverview from "@/entities/products/product-assemblies/Overview.vue"
import ComponentOverview from "@/entities/products/product-components/Overview.vue"
import { InputSelectorInline } from "@/entities/products/product-facets/"
import { InputSelectorOverview as SupplierInputSelectorOverview } from "@/entities/products/product-suppliers/"
import config from "../config/config"
import Entity from "../data/Entity"
import useEntityStore from "../data/store"

interface Emits extends /* @vue-ignore */ FormEmits<Entity> {}
const emit = defineEmits<Emits>()

const props = withDefaults(
    defineProps<{
        modelValue: Entity
        readonly?: boolean
        overviewUrl?: string | RouteRecordRaw
        isPopup?: boolean
        initialTab?: string
    }>(),
    { ...formDefaults }
)

const { screen } = useScreen()

const { service: entityService } = useEntityStore()

const { item, feedback, handleCancel, handleSubmit, handleRemove, handleRestore } = useForm<Entity>({
    entityService,
    props,
    emit,
})

// Tabs
const { translate } = useLang()
const tabs = computed(() =>
    [
        Tab.create("form", { icon: "form", title: translate("form"), isDefault: true }),
        !screen.isLarge ? Tab.create("components", { icon: "component", title: translate("product.components") }) : undefined,
        Tab.create("assemblies", { icon: "assembly", title: translate("assemblies") }),
        !screen.isLarge ? Tab.create("suppliers", { icon: "supplier", title: translate("product.suppliers") }) : undefined,
    ]
)
</script>
```

## 10. Product selector list — `selecting/SelectorList.vue` (c)

```vue
<template>
    <div class="entity-list">
        <div class="row pb-2 border-bottom border-bottom-1">
            <div class="col-auto fw-bold">
                <IconButton icon="select" class="btn-default py-0 px-1 border-0" disabled />
            </div>
            <div class="col fw-bold">{{ $t("name") }}</div>
            <div class="col-4 col-lg-2 d-none d-md-block fw-bold">
                {{ $t("unitType") }}
            </div>
        </div>

        <template v-for="(item, i) in items" :key="item.$id">
            <div class="row border-bottom border-bottom-1 py-2" :class="{ 'is-selected': isSelected(item) }">
                <div class="col-auto">
                    <IconButton :icon="isSelected(item) ? 'selected' : 'select'" class="btn-default py-0 px-1" @click="handleSelect(item)" />
                </div>
                <div class="col text-truncate">
                    <FormModalButton :modelValue="item" class="p-1" />
                    {{ item.$title }}
                </div>
                <div class="col-4 col-lg-2 d-none d-md-block text-truncate">
                    <UnitTypeButton :model-value="item.unitType" />{{ getUnitType(item.unitType)?.$title }}
                </div>
            </div>
        </template>
    </div>
</template>

<script setup lang="ts">
import { computed } from "vue"
import { IconButton } from "@regira/modules/vue/ui"
import { type OverviewEmits } from "@regira/modules/vue/entities"
import { useEntityStore as useUnitTypeStore, FormModalButton as UnitTypeButton } from "@/entities/unit-types"
import type Entity from "../data/Entity"
import useEntityStore from "../data/store"
import FormModalButton from "../details/FormModalButton.vue"

interface Emits extends /* @vue-ignore */ OverviewEmits<Entity> {}
const emit = defineEmits<
    Emits & {
        (e: "update:modelValue", value: Array<Entity>): void
        (e: "update:selected", value?: Entity): void
        (e: "select", selected?: Entity): void
    }
>()

const props = defineProps<{
    modelValue?: Array<Entity>
    selected?: Entity
}>()

const isSelected = computed(() => (item: Entity) => item.$id == props.selected?.$id)
const { fromPool } = useEntityStore()
const items = computed<Array<Entity>>({
    get: () => fromPool(props.modelValue || []),
    set: (value) => emit("update:modelValue", value),
})

function handleSelect(item?: Entity) {
    emit("select", item?.$id !== props.selected?.$id ? item : undefined)
}

const { fromPool: getUnitType } = useUnitTypeStore()
</script>
```

---

## App aggregator

Each slice above ends at `setup.ts`. The app-level aggregator — `src/entities/index.ts`, which gathers
every slice's plugin and installs them in one `app.use(...)` (registration order drives navigation) — is
not part of an individual slice and lives in the app shell.

> **→ See:** [entities.setup.md](entities.setup.md#add-entities) — Add entities (the `src/entities/index.ts`
> aggregator).

## See also

- [entities.advanced.example.md](entities.advanced.example.md) — the complete COMPLEX slice (`Vehicle`):
  attachments service, many-to-many link model, owned child collection. It points back here
  for the byte-identical picker boilerplate.
- [entities.setup.md](entities.setup.md#entity-slice-anatomy) — the slice folder anatomy (the `(c)` legend)
  and the app shell that hosts this slice (tooling, router, navigation, aggregator, views).
- [entities.patterns.md](entities.patterns.md) — per-feature recipes: child collections, trees, JSON
  services, paging, soft-delete, relation pickers.
- [entities.signatures.md](entities.signatures.md) — exact TypeScript signatures ·
  [entities.namespaces.md](entities.namespaces.md) — import-specifier reference.
