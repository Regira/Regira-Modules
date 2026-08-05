# Regira Entities — Advanced Worked Example (`Vehicle`)

ONE complete **complex** slice — `Vehicle`, a production-shaped example you can copy verbatim. This is
the advanced counterpart of the basic
[`Product`](entities.examples.md) slice: it shows every per-entity file plus the patterns a simple slice
omits. Where the basic example is fully self-contained, this file is self-contained for everything
**Vehicle-specific** and for the **advanced features**; for the handful of byte-identical picker/shell
boilerplate files it points back to the Product slice rather than reprinting them.

> **Reading order** (use everywhere): `instructions` → `setup` (new app) → `namespaces` → `signatures` →
> `examples` (simple `UnitType` + standard `Product` slices) / **`advanced.example`** (this file) →
> `patterns` (recipes, load on demand). Read [entities.examples.md](entities.examples.md) first if you have
> not built a slice before — this file assumes the boilerplate it establishes.

## What this adds over the simpler examples

The simple (`UnitType`) and standard (`Product`) slices in [entities.examples.md](entities.examples.md)
cover the per-entity set (config, model, plain service, search object, form, list, selectors, setup).
`Vehicle` layers on the things they don't have:

| Delta                             | Where, in this file                                                                             | Mechanism                                                                                                                                    |
| --------------------------------- | ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| **Attachments** (upload/download) | §4 service (`getAttachments`/`addAttachment`, `insert`/`update` overrides), §5 form `files` tab | `EntityService` round-trips files via the app-local `entity-attachments` helpers; service constructed with an `AxiosWithFilesInstance` (§13) |
| **Many-to-many link model**       | §3 `VehicleInterventionType`, §5 form (`InputSelectorInline` chips)                             | a join entity with `_deleted` + `create()`; the form edits links inline as marked-deletable chips (no flatten/rebuild bridge)                |
| **Owned child collection**        | §6 `vehicle-interventions/Overview.vue` (embedded `interventions` tab)                          | a child list resolved from the IoC container and (re)loaded on save                                                                          |
| **Hierarchical tree**             | _not in the Vehicle slice_ — see redirect below                                                 | `useTree` / `useDragDrop` — recipe in [entities.patterns.md — Hierarchical (tree) entities](entities.patterns.md)                            |

> **Fidelity note (CONTRACT §6).** Every code block below is reproduced **verbatim** from the reference
> app — templates included — so both markup and `<script setup>` wiring are normative. Two scope caveats:
>
> - The Vehicle child collection (§6) is a **hand-rolled** read-mostly list (resolve service from IoC →
>   load on mount/after-save). It is the owned-collection pattern as the reference app ships it; it does
>   **not** use the `useOwnedCollection` composable. For the inline-editable `useOwnedCollection` /
>   `useOwnedModal` variant, see the recipe at
>   [entities.patterns.md — Owned (child) collections](entities.patterns.md#owned-child-collections).
> - The Vehicle slice has **no tree**. `useTree` is listed above as a delta the basic example also lacks;
>   its worked recipe lives in [entities.patterns.md — Hierarchical (tree) entities](entities.patterns.md#hierarchical-tree-entities)
>   (which links the `treelist` module). It is **not** fabricated into the Vehicle slice here.
>
> Library code imports from `@regira/modules/...`; app code uses app-local aliases (`@/entities/...`,
> `@/components/...`, `../...`) — resolve those against your own app. Resolve any `@regira/modules` import
> you don't recognise from [entities.namespaces.md](entities.namespaces.md); never guess one.

## 1. Config — `config/config.ts`

```ts
import type { IConfig } from "@regira/modules/vue/entities"
import Entity from "../data/Entity"

const api = "/vehicles"

const config: IConfig = {
    id: Entity.name,
    key: "Vehicle",

    routePrefix: "vehicles",
    // Empty even though the list renders `brand` and `vehicleType` (§10): a to-one shown on every row belongs
    // in the API's unconditional `e.Includes(...)`. Name a flag here only for a gated COLLECTION the list needs
    // — `labels` lives on the form, whose data comes from the Details eager-load.
    baseQueryParams: {},

    overviewTitle: "vehicles",
    detailsTitle: "vehicle",
    description: "vehiclesDescription",
    icon: "bi bi-car-front",

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

## 2. Model — `data/Entity.ts`

```ts
import { EntityBase } from "@regira/modules/vue/entities"
import type { Entity as Brand } from "../../brands"
import type { Entity as VehicleType } from "../../vehicle-types"
import type { EntityLabel } from "@/entities/entity-labels"
import type { Entity as EntityAttachment } from "../../entity-attachments"
import type { VehicleInterventionType } from "./VehicleInterventionType"

export class Vehicle extends EntityBase {
    id: number = 0
    code = ""
    model = ""

    brandId?: number
    vehicleTypeId?: number

    notes?: string

    created?: Date
    lastModified?: Date

    brand?: Brand
    vehicleType?: VehicleType
    labels?: Array<EntityLabel>
    interventionTypes?: Array<VehicleInterventionType>
    attachments?: Array<EntityAttachment>

    override get $id(): string | number {
        return this.id || "new"
    }
    override get $title(): string | undefined {
        return `${this.code || ""} ${this.vehicleType?.title || ""}`.trim()
    }
}

export const Entity = Vehicle

export default Vehicle
```

## 3. Intervention-type link — `data/VehicleInterventionType.ts`

The join model for the many-to-many `Vehicle`↔`InterventionType` relation. `_deleted` lets the form mark a
link for removal without dropping it from the array before save; `create()` builds an instance from a plain
payload. The form (§5) edits this collection inline with `InputSelectorInline` chips. This link is
payload-free (just the two foreign-key ids); for a join that carries its own scalar fields — e.g. a
`quantity` edited in a row — see `Product`↔`ProductComponent` in
[entities.examples.md](entities.examples.md).

```ts
import type InterventionType from "@/entities/intervention-types/data/Entity"
import { EntityBase } from "@regira/modules/vue/entities"

export class VehicleInterventionType extends EntityBase {
    id: number = 0
    interventionTypeId: number = 0
    vehicleId: number = 0

    interventionType?: InterventionType

    _deleted: boolean = false

    override get $id(): string | number {
        return this.id || "new"
    }
    override get $title(): string | undefined {
        return this.interventionType?.title ?? "New intervention type"
    }

    static create(values?: object): VehicleInterventionType {
        return Object.assign(new VehicleInterventionType(), values || {})
    }
}
```

## 4. Service (with attachments) — `data/EntityService.ts`

The "with attachments" variant of the boilerplate service: it overrides `insert`/`update` to round-trip files via
`insertWithAttachments`/`updateWithAttachments`, exposes `getAttachments`/`addAttachment` endpoints built off
`this.config.api`, and `prepareItem` drops soft-deleted children before save. The constructor takes an
`AxiosWithFilesInstance` (not a plain `AxiosInstance`) — see `setup.ts` (§13).

> **API check (CONTRACT §6).** `AxiosWithFilesInstance` and `createQueryString` are verified
> `@regira/modules/vue/http` exports — see [entities.signatures.md §10](entities.signatures.md#10-wiring-ioc--http)
> (`AxiosWithFilesInstance` adds `getFile`/`upload`; `createQueryString(o): URLSearchParams`). The
> `insertWithAttachments` / `updateWithAttachments` / `createEntity` helpers live in **your own
> `entity-attachments` slice** — build it once from the copy-paste recipe in
> [entities.patterns.md → Attachments (files)](entities.patterns.md#attachments-files--offline-add--rename--remove-confirm-on-save)
> (offline add/rename/remove + drop zone), not the `@regira/modules` reference.

```ts
import { type AxiosWithFilesInstance, createQueryString } from "@regira/modules/vue/http"
import { EntityServiceBase, type ListResult, type IConfig } from "@regira/modules/vue/entities"
import {
    Entity as EntityAttachment,
    insertWithAttachments,
    updateWithAttachments,
    createEntity,
    save as saveAttachments,
} from "../../entity-attachments"
import Entity from "./Entity"

export class EntityService extends EntityServiceBase<Entity> {
    constructor(axios: AxiosWithFilesInstance, config: IConfig) {
        super(axios, config)
        console.debug("VehicleService", this, { config })
    }

    async getAttachments(so?: object): Promise<Array<EntityAttachment>> {
        const url = `${this.config.api}/attachments`
        const queryString = createQueryString(so || {})
        const {
            data: { items },
        } = await this.axios.get<ListResult<EntityAttachment>>(`${url}?${queryString}`)

        return items.map((x) => EntityAttachment.create(x))
    }
    async addAttachment(itemId: number, file: Blob): Promise<EntityAttachment> {
        const url = `${this.config.api}/${itemId}/files`
        const attachment = createEntity(file)
        await saveAttachments(url, [attachment])
        return attachment
    }

    override async insert(item: Entity): Promise<Entity | undefined> {
        // the follow-up update sends the attachments in display order — the server assigns SortOrder from array position
        return await insertWithAttachments(
            this.config.api,
            item,
            async () => await super.insert(item),
            async (saved) => await super.update(saved)
        )
    }
    override async update(item: Entity): Promise<Entity | undefined> {
        return await updateWithAttachments(this.config.api, item, async () => await super.update(item))
    }

    protected override prepareItem(item: Entity): Entity {
        item.labels = item.labels?.filter((x) => !x._deleted)
        item.interventionTypes = item.interventionTypes?.filter((x) => !x._deleted)
        item.attachments = item.attachments?.filter((x) => !x._deleted)
        return super.prepareItem(item)
    }

    override toEntity(item: object): Entity {
        return item instanceof Entity ? item : Object.assign(this.createInstance(Entity as new () => Entity), item || {})
    }
}

export default EntityService
```

> **Store — `data/store.ts`** is identical to the Product slice — see
> [entities.examples.md](entities.examples.md) (`createStore(service, Entity.name)`). The only difference
> is which `EntityService` the IoC resolves, which is handled by `setup.ts` (§13).

## 5. Form — `details/Form.vue`

Three tabs: the main `form` (code, type, brand, model, labels, allowed intervention types), a `files` tab
backed by the shared `EntityAttachments` overview, and an `interventions` child collection (§6, disabled
until the vehicle is saved). The `interventionTypes` join rows (§3) are edited inline with
**`InputSelectorInline`**: each chip embeds the related `InterventionType`'s `FormModalButton`, its delete
toggle marks `_deleted` (visible, undoable), and `#selector`'s `add()` appends a new join row — no
flatten/rebuild bridge, so a removed chip marks pending instead of hard-removing.

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
                    <Icon name="list" /> <span class="d-none d-md-inline ms-1">{{ $t("overview") }}</span>
                </RouterLink>
            </div>
            <div class="col-md order-3 order-md-2">
                <Feedback :feedback="feedback" />
            </div>
        </div>

        <div class="row">
            <div class="col">
                <TabContainer :tabs="tabs" :active="initialTab" :use-route-nav="!isPopup">
                    <template #form>
                        <FormSection :title="$t(config.detailsTitle ?? config.routePrefix)">
                            <div class="row">
                                <div class="col-md mb-2">
                                    <div class="input-group">
                                        <div class="input-group-text">
                                            <Icon name="code" />
                                        </div>
                                        <input
                                            v-model="item.code"
                                            required
                                            :readonly="readonly"
                                            :placeholder="$t('vehicleCodePlaceholder')"
                                            class="form-control"
                                        />
                                    </div>
                                    <FormLabel :label="$t('code')" />
                                </div>
                                <div class="col-md mb-2">
                                    <VehicleTypeSelector
                                        v-model="item.vehicleType"
                                        v-model:idValue="item.vehicleTypeId as number"
                                        :readonly="readonly"
                                        :placeholder="$t('selectType')"
                                    />
                                    <FormLabel :label="$t('type')" />
                                </div>
                            </div>
                            <div class="row">
                                <div class="col-md mb-2">
                                    <BrandSelector
                                        v-model="item.brand"
                                        v-model:idValue="item.brandId as number"
                                        :readonly="readonly"
                                        :placeholder="$t('selectBrand')"
                                    />
                                    <FormLabel :label="$t('brand')" />
                                </div>
                                <div class="col-md mb-2">
                                    <div class="input-group">
                                        <div class="input-group-text">
                                            <Icon name="title" />
                                        </div>
                                        <input v-model="item.model" :readonly="readonly" class="form-control" :placeholder="$t('modelPlaceholder')" />
                                    </div>
                                    <FormLabel :label="$t('model')" />
                                </div>
                            </div>
                        </FormSection>

                        <Labels v-model="item.labels" :show-summary="item.id > 0" />

                        <FormSection :title="$t('interventionType')">
                            <div class="row">
                                <div class="col mb-2">
                                    <InputSelectorInline
                                        v-model="item.interventionTypes"
                                        :row-key="(r) => r.interventionTypeId"
                                        :exclude-key="(r) => r.interventionTypeId"
                                    >
                                        <template #chip="{ row }">
                                            <InterventionTypeButton :modelValue="row.interventionType" />
                                            {{ row.interventionType?.title }}
                                        </template>
                                        <template #selector="{ add, exclude }">
                                            <InterventionTypeSelector
                                                :filter-defaults="{ exclude }"
                                                :readonly="readonly"
                                                :placeholder="$t('selectType')"
                                                @select="
                                                    (it: InterventionType) =>
                                                        add(
                                                            VehicleInterventionType.create({
                                                                interventionTypeId: it.id!,
                                                                interventionType: it,
                                                                vehicleId: item.id,
                                                            })
                                                        )
                                                "
                                            />
                                        </template>
                                    </InputSelectorInline>
                                    <FormLabel :label="$t('allowedInterventionTypes')" />
                                </div>
                            </div>
                        </FormSection>
                    </template>

                    <template #files>
                        <EntityAttachments v-model="item.attachments" :readonly="readonly" />
                    </template>

                    <template #interventions>
                        <Interventions :owner="item" :readonly="readonly" />
                    </template>
                </TabContainer>
            </div>
        </div>

        <Debug
            :modelValue="{
                ...item,
                brand: item.brand ? `${item.brand.title} #${item.brand.id}` : undefined,
                vehicleType: item.vehicleType ? `${item.vehicleType.title} #${item.vehicleType.id}` : undefined,
            }"
        />
    </form>
</template>

<script setup lang="ts">
import { computed } from "vue"
import type { RouteRecordRaw } from "vue-router"
import { Feedback, TabContainer, Tab } from "@regira/modules/vue/ui"
import { useForm, type FormEmits, formDefaults, InputSelectorInline } from "@regira/modules/vue/entities"
import { useLang } from "@regira/modules/vue/lang"
import { FormButtonsRow } from "@regira/modules/vue/ui"
import config from "../config/config"
import { Overview as Labels } from "../../entity-labels"
import { Overview as EntityAttachments } from "../../entity-attachments"
import { InputSelector as BrandSelector } from "../../brands"
import { InputSelector as VehicleTypeSelector } from "../../vehicle-types"
import { Entity as Intervention } from "../../interventions"
import { InputSelector as InterventionTypeSelector, FormModalButton as InterventionTypeButton } from "../../intervention-types"
import Entity from "../data/Entity"
import useEntityStore from "../data/store"
import Interventions from "../vehicle-interventions/Overview.vue"
import { VehicleInterventionType } from "../data/VehicleInterventionType"
import InterventionType from "@/entities/intervention-types/data/Entity"

interface Emits extends /* @vue-ignore */ FormEmits<Entity> {}
const emit = defineEmits<Emits>()
const props = withDefaults(
    defineProps<{
        modelValue: Entity
        initialTab?: string
        readonly?: boolean
        overviewUrl?: string | RouteRecordRaw
        isPopup?: boolean
    }>(),
    { ...formDefaults }
)

const { service: entityService } = useEntityStore()

const { item, feedback, handleCancel, handleSubmit, handleRemove, handleRestore } = useForm<Entity>({ entityService, props, emit })

// Tabs
const { translate } = useLang()
const tabs = computed(() =>
    [
        Tab.create("form", { icon: "form", title: translate("form"), isDefault: true }),
        Tab.create("files", { icon: "attachment", title: translate("files") }),
        Tab.create("interventions", { icon: Intervention.name, title: translate("interventions"), isDisabled: !item.value?.id }),
    ].filter((x) => x)
)
</script>
```

### The many-to-many link, end to end

The four moving parts of an editable, **undoable** link — join model, inline chip editor, pooled display, and
the save-time filter — collected in one place (full files in §3–§5):

```ts
// 1. Join model (§3): key on the plain FK; `_deleted` marks a row (never splice); `create()` from a payload.
class VehicleInterventionType extends EntityBase {
    id = 0
    interventionTypeId = 0
    vehicleId = 0
    interventionType?: InterventionType
    _deleted = false
    override get $id() {
        return this.id || "new"
    }
    static create(v?: object) {
        return Object.assign(new VehicleInterventionType(), v || {})
    }
}
```

```vue
<!-- 2. Inline chip editor (§5): InputSelectorInline binds the join rows directly. Its delete toggle marks
     `_deleted` (tinted, undoable) — there is no flatten/rebuild bridge and no hard-remove. `#selector`'s
     add() appends a new join row; :exclude-key drops already-linked rows from the picker. -->
<InputSelectorInline v-model="item.interventionTypes" :row-key="(r) => r.interventionTypeId" :exclude-key="(r) => r.interventionTypeId">
    <template #chip="{ row }">
        <InterventionTypeButton :modelValue="row.interventionType" /> {{ row.interventionType?.title }}
    </template>
    <template #selector="{ add, exclude }">
        <InterventionTypeSelector :filter-defaults="{ exclude }"
            @select="(it: InterventionType) => add(VehicleInterventionType.create({ interventionTypeId: it.id!, interventionType: it, vehicleId: item.id }))" />
    </template>
</InputSelectorInline>
```

```ts
// 3. Show a current link elsewhere (chip/summary): the nested relation is plain JSON, so hydrate it
//    through its pooled store for a reactive `$title` — or bind the projected field directly.
const { fromPool } = useInterventionTypeStore() // the intervention-types slice store
const linkTitle = (l: VehicleInterventionType) => fromPool(l.interventionType)?.$title ?? l.interventionType?.title

// 4. Save-time filter (§4, EntityService): drop `_deleted` links so they are ABSENT from the payload —
//    `e.Related(...)` then deletes them by omission. Marking alone won't: prepareItem strips only top-level
//    `_` keys, so a marked link is still sent and Related() keeps it.
protected override prepareItem(item: Entity): Entity {
    item.interventionTypes = item.interventionTypes?.filter((x) => !x._deleted)
    return super.prepareItem(item)
}
```

**Key the new row on the FK, never `$id`** — an included relation's `$id` getter is `undefined`, so
`interventionTypeId: undefined` slips through and the **second** save 400s. **Mark → filter → absent →
deleted** is the whole delete path, and `InputSelectorInline` owns the mark: a removed chip is visibly
pending until save, never gone on click.

## 6. Interventions overview (owned child collection) — `vehicle-interventions/Overview.vue`

A read-mostly list of the owning vehicle's interventions, embedded as the form's `interventions` tab. It
resolves the `interventions` service from the IoC container, loads on mount (and after a save via the
`InterventionButton`), and renders related `operator`/`interventionType` through the shared computed pools.

> This is the owned-collection pattern as the reference app ships it (manual IoC resolve + load). For the
> inline-editable `useOwnedCollection` / `useOwnedModal` variant, see
> [entities.patterns.md — Owned (child) collections](entities.patterns.md#owned-child-collections).

```vue
<template>
    <FormSection>
        <template #title>
            <div class="d-flex justify-content-between">
                <h3 class="p-2 mb-2">{{ $t("interventions") }}</h3>
                <InterventionButton
                    v-if="!readonly"
                    :item-defaults="{ vehicle: owner, vehicleId: owner?.id }"
                    class="btn btn-info py-1 my-1"
                    @save="load"
                    ><Icon name="new"
                /></InterventionButton>
            </div>
        </template>
        <LoadingContainer :is-loading="isLoading">
            <div class="row pb-2 border-bottom border-bottom-1">
                <div class="col-auto fw-bold"><Icon name="edit" class="m-1" /></div>
                <div class="col-3 col-md-2 col-xl-1 fw-bold">{{ $t("date") }}</div>
                <div class="col fw-bold">{{ $t("type") }}</div>
                <div class="col d-none d-lg-block fw-bold">{{ $t("supplier") }}</div>
                <div class="col d-none d-md-block fw-bold">{{ $t("invoice") }}</div>
            </div>
            <div v-for="item in items" :key="item.id" class="row border-bottom border-bottom-1 py-2">
                <div class="col-auto">
                    <InterventionButton :modelValue="item" :readonly="readonly" class="p-1" />
                </div>
                <div class="col-3 col-md-2 col-xl-1">
                    <div class="italic-muted">{{ formatDate(item.interventionDate, $culture) }}</div>
                </div>
                <div class="col text-truncate">
                    <InterventionTypeButton :modelValue="item.interventionType" class="p-1" />
                    {{ getInterventionType(item.interventionType)?.$title }}
                </div>
                <div class="col d-none d-lg-block text-truncate">
                    <OperatorButton :modelValue="item.operator" :readonly="readonly" class="p-1" />
                    {{ getOperator(item.operator).$title }}
                </div>
                <div class="col text-truncate d-none d-md-block">{{ item.invoice?.invoiceNumber }}</div>
            </div>
        </LoadingContainer>
    </FormSection>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue"
import { get } from "@regira/modules/vue/ioc"
import { createFromComputedPool } from "@regira/modules/vue/vue-helper"
import { formatDate } from "@regira/modules/vue/formatters"
import type Vehicle from "../data/Entity"
import { Entity, type EntityService, FormModalButton as InterventionButton } from "../../interventions"
import { FormModalButton as OperatorButton, useEntityStore as useOperatorStore } from "../../intervention-operators"
import { FormModalButton as InterventionTypeButton, useEntityStore as useInterventionTypeStore } from "../../intervention-types"

const props = defineProps<{
    owner: Vehicle
    readonly?: boolean
}>()

const service = get<EntityService>(Entity.name)!
const items = ref<Array<Entity>>()
const isLoading = ref(false)

const getOperator = createFromComputedPool(useOperatorStore()) as any
const getInterventionType = createFromComputedPool(useInterventionTypeStore()) as any

async function load() {
    try {
        isLoading.value = true
        items.value = await service.list({ vehicleId: props.owner.id })
    } finally {
        isLoading.value = false
    }
}

onMounted(load)
</script>
```

## 7. Filter (advanced) — `filter/FilterAdv.vue`

```vue
<template>
    <div class="adv-filter" style="min-height: 50vh">
        <div class="row">
            <div class="col mb-2" v-if="resultCount != null">
                <span class="text-info">{{ resultCount }} {{ $t("results") }}</span>
                <small v-if="filterIsActive" class="ms-2 italic-muted">({{ $t("filtersAreApplied") }})</small>
            </div>
            <div class="col mb-2 text-end">
                <IconButton icon="clear" @click="handleReset" :showText="true" />
            </div>
        </div>

        <!-- keywords -->
        <div class="row">
            <div class="col mb-2">
                <div class="input-group">
                    <div class="input-group-text"><Icon name="search" /></div>
                    <input v-model.lazy.trim="searchObject.q" class="form-control" :placeholder="$t('keywords')" />
                </div>
            </div>
        </div>

        <div class="row">
            <!-- code -->
            <div class="col mb-2">
                <div class="input-group">
                    <div class="input-group-text"><Icon name="code" /></div>
                    <input v-model.lazy.trim="searchObject.code" class="form-control" placeholder="code" />
                </div>
            </div>
            <!-- VehicleType -->
            <div class="col-md mb-2">
                <VehicleTypeSelector
                    v-model="vehicleType"
                    v-model:idValue="searchObject.vehicleTypeId as number"
                    placeholder="vehicle type"
                    @select="handleUpdate"
                >
                    <template #prepend>
                        <div class="input-group-text"><Icon :name="VehicleType.name" /></div>
                    </template>
                </VehicleTypeSelector>
            </div>
        </div>

        <div class="row">
            <!-- Brand -->
            <div class="col-md mb-2">
                <BrandSelector v-model="brand" v-model:idValue="searchObject.brandId as number" placeholder="brand" @select="handleUpdate">
                    <template #prepend>
                        <div class="input-group-text"><Icon :name="Brand.name" /></div>
                    </template>
                </BrandSelector>
            </div>
            <!-- model -->
            <div class="col mb-2">
                <div class="input-group">
                    <div class="input-group-text"><Icon name="title" /></div>
                    <input v-model.lazy.trim="searchObject.model" class="form-control" placeholder="model" />
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue"
import { useFilter, type FilterEmits } from "@regira/modules/vue/entities"
import { useAuthStore } from "@regira/modules/vue/auth"
import { Entity as Brand, InputSelector as BrandSelector } from "../../brands"
import { Entity as VehicleType, InputSelector as VehicleTypeSelector } from "../../vehicle-types"
import SearchObject from "./SearchObject"

interface Emits extends /* @vue-ignore */ FilterEmits {}

const emit = defineEmits<Emits>()
defineProps<{
    resultCount?: number | null
}>()

const searchObject = defineModel<SearchObject>({ required: true })

const brand = ref<Brand>()
const vehicleType = ref<VehicleType>()

const { filterIsActive, handleReset, handleUpdate } = useFilter({ searchObject, emit, Constructor: SearchObject })

const { hasPermission } = useAuthStore()
const showOperatorFilter = computed(() => hasPermission("ReadAllActivities"))
</script>
```

## 8. Search object — `filter/SearchObject.ts`

```ts
import { SearchObjectBase } from "@regira/modules/vue/entities"

export class EntitySearchObject extends SearchObjectBase {
    code?: string
    title?: string
    model?: string

    brandId?: number | Array<number>
    vehicleTypeId?: number | Array<number>

    minDate?: Date
    maxDate?: Date
    isBillable?: boolean
    isBilled?: boolean
}

export default EntitySearchObject
```

## 9. List — `overview/List.vue`

```vue
<template>
    <div class="entity-list">
        <div class="row pb-2 border-bottom border-bottom-1">
            <div class="col-auto fw-bold"><Icon name="edit" class="m-1" /></div>
            <div class="col-2 col-lg-1 fw-bold">{{ $t("code") }}</div>
            <div class="col fw-bold">{{ $t("type") }}</div>
            <div class="col d-none d-md-block fw-bold">{{ $t("brand") }}</div>
            <div class="col d-none d-lg-block fw-bold">{{ $t("model") }}</div>
        </div>
        <template v-for="(item, i) in items" :key="item.$id">
            <ListItem
                v-model="items[i]"
                :readonly="readonly"
                :class="{ 'bg-light': i % 2 == 0 }"
                @request-save="$emit('request-save', $event)"
                @request-remove="$emit('request-remove', $event)"
                @save="$emit('save', $event)"
                @remove="$emit('remove', $event)"
                @request-load="$emit('request-reload')"
            />
        </template>
    </div>
</template>

<script setup lang="ts">
import { computed } from "vue"
import type { OverviewEmits, SaveResult } from "@regira/modules/vue/entities"
import useEntityStore from "../data/store"
import type Entity from "../data/Entity"
import ListItem from "./ListItem.vue"

interface Emits extends /* @vue-ignore */ OverviewEmits<Entity> {
    (e: "save", args: SaveResult<Entity>): void | Promise<void>
    (e: "request-reload"): void
}
const emit = defineEmits<Emits>()
const props = defineProps<{
    modelValue?: Array<Entity>
    readonly: boolean
}>()

const { fromPool } = useEntityStore()

const items = computed<Array<Entity>>({
    get: () => fromPool(props.modelValue || []),
    set: (value) => emit("update:modelValue", value),
})
</script>
```

## 10. List item — `overview/ListItem.vue`

```vue
<template>
    <div class="row border-bottom border-bottom-1 py-2">
        <div class="col-auto">
            <!-- <FormModalButton v-model="item" class="p-1" /> -->
            <router-link :to="{ name: config.key + 'Details', params: { id: item.$id } }" class="btn btn-link p-1">
                <Icon :name="config.key" />
            </router-link>
        </div>
        <div class="col-2 col-lg-1 text-nowrap">
            <div>
                {{ item.code }}
            </div>
        </div>
        <div class="col text-truncate">
            <div v-if="item.vehicleType != null">
                <VehicleTypeButton :modelValue="item.vehicleType!" :readonly="readonly" class="p-1" />
                {{ getVehicleType(item.vehicleType)?.title }}
            </div>
        </div>
        <div class="col d-none d-md-block text-truncate">
            <div v-if="item.brand != null">
                <BrandButton :modelValue="item.brand!" :readonly="readonly" class="p-1" />
                {{ getBrand(item.brand)?.title }}
            </div>
        </div>
        <div class="col d-none d-lg-block text-truncate">
            <div>{{ item.model }}</div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { createFromComputedPool } from "@regira/modules/vue/vue-helper"
import type { SaveResult } from "@regira/modules/vue/entities"
import config from "../config/config"
import Entity from "../data/Entity"
import { FormModalButton as BrandButton, useEntityStore as useBrandStore } from "../../brands"
import { FormModalButton as VehicleTypeButton, useEntityStore as useVehicleTypeStore } from "../../vehicle-types"

const emit = defineEmits<{
    (e: "update:modelValue", args: Entity): void
    (e: "save", args: SaveResult<Entity>): void
    (e: "remove", args: Entity): void
    (e: "request-load", args: Entity): void
    (e: "request-save", args: Entity): void
    (e: "request-remove", args: Entity): void
}>()
defineProps<{
    readonly?: boolean
}>()

const item = defineModel<Entity>({ required: true })
const getBrand = createFromComputedPool(useBrandStore()) as any
const getVehicleType = createFromComputedPool(useVehicleTypeStore()) as any
</script>
```

## 11. Selector list — `selecting/SelectorList.vue`

```vue
<template>
    <div class="entity-list">
        <div class="row pb-2 border-bottom border-bottom-1">
            <div class="col-auto fw-bold"><Icon name="select" class="m-1" /></div>
            <div class="col-1 fw-bold">Code</div>
            <div class="col fw-bold">Model</div>
        </div>

        <template v-for="(item, i) in items" :key="item.$id">
            <div class="row border-bottom border-bottom-1 py-2" :class="{ 'is-selected': isSelected(item) }">
                <div class="col-auto">
                    <IconButton :icon="isSelected(item) ? 'selected' : 'select'" class="btn-default py-0 px-1" @click="handleSelect(item)" />
                </div>
                <div class="col text-truncate">
                    <FormModalButton v-model="items[i]" class="p-1" />
                    {{ item.code }}
                </div>
                <div class="col text-nowrap">
                    <BrandButton :modelValue="item.brand!" class="p-1" />
                    {{ getBrand(item.brand)?.title }}
                </div>
                <div class="col text-truncate">
                    {{ item.model }}
                </div>
            </div>
        </template>
    </div>
</template>

<script setup lang="ts">
import { computed } from "vue"
import { createFromComputedPool } from "@regira/modules/vue/vue-helper"
import type { OverviewEmits } from "@regira/modules/vue/entities"
import { FormModalButton as BrandButton, useEntityStore as useBrandStore } from "../../brands"
import type Entity from "../data/Entity"
import useEntityStore from "../data/store"
import FormModalButton from "../details/FormModalButton.vue"

interface Emits extends /* @vue-ignore */ OverviewEmits<Entity> {
    (e: "select", selected: Entity | null): void
}
const emit = defineEmits<Emits>()
const props = defineProps<{
    modelValue?: Array<Entity> | null
    selected?: Entity | null
}>()

const isSelected = computed(() => (item: Entity) => item.$id == props.selected?.$id)
const { fromPool } = useEntityStore()
const items = computed<Array<Entity>>({
    get: () => fromPool(props.modelValue || []),
    set: (value) => emit("update:modelValue", value),
})
const getBrand = createFromComputedPool(useBrandStore()) as any

function handleSelect(item: Entity) {
    emit("select", item?.$id !== props.selected?.$id ? item : null)
}
</script>
```

## 12. Barrel — `index.ts`

```ts
export { default as config } from "./config/config"
export { default as Entity } from "./data/Entity"
export { default as EntityService } from "./data/EntityService"
export { default as useEntityStore } from "./data/store"

export { default as Filter } from "./filter/Filter.vue"
export { default as FilterInline } from "./filter/FilterInline.vue"
export { default as FilterAdv } from "./filter/FilterAdv.vue"

export { default as Autocomplete } from "./selecting/Autocomplete.vue"
export { default as FormModalButton } from "./details/FormModalButton.vue"
export { default as InputSelector } from "./selecting/InputSelector.vue"
export { default as Selector } from "./selecting/Selector.vue"
export { default as SelectorDropDown } from "./selecting/SelectorDropDown.vue"
export { default as SelectorList } from "./selecting/SelectorList.vue"
export { default as SelectorSearch } from "./selecting/SelectorSearch.vue"

export { default as Overview } from "./overview/Overview.vue"
export { default as Details } from "./details/Details.vue"
export { default as Form } from "./details/Form.vue"

export { default as plugin } from "./setup"
```

## 13. Plugin — `setup.ts`

The vehicle service needs file uploads, so `addServices` resolves `axios` as an `AxiosWithFilesInstance`
and the route key is taken from `Entity.name`.

```ts
import type { App } from "vue"
import type { RouteRecordRaw } from "vue-router"
import type { AxiosWithFilesInstance } from "@regira/modules/vue/http/axios"
import type { IServiceProvider } from "@regira/modules/vue/ioc"
import type { IIconProvider } from "@regira/modules/vue/ui/icons"
import { DetailsSummary } from "@regira/modules/vue/entities"
import config from "./config/config"
import { Entity } from "./data/Entity"
import { EntityService } from "./data/EntityService"
import Overview from "./overview/Overview.vue"
import Details from "./details/Details.vue"
import Form from "./details/Form.vue"

export function createRoutes(): Array<RouteRecordRaw> {
    const key = Entity.name
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
    serviceProvider.add(Entity.name, (sp) => new EntityService(sp.get<AxiosWithFilesInstance>("axios")!, config))
}

export function addIcons(icons: IIconProvider) {
    icons.add(Entity.name, config.icon!)
}

export default {
    install(app: App<Element>, { routes }: { routes: Array<RouteRecordRaw> }) {
        routes.push(...createRoutes())

        addServices(app.config.globalProperties.$services)
        addIcons(app.config.globalProperties.$icons)

        app.config.globalProperties.$configs[Entity.name] = config

        console.debug("install", Entity.name)
    },
}
```

## Boilerplate shared with the example slices (not reprinted)

These files are **byte-identical** to the slices in [entities.examples.md](entities.examples.md) — the
picker components and the details/filter shells that carry no Vehicle-specific markup (shown in full under
the simple `UnitType` slice there). Copy them and only change the slice folder they live in:

| File                                                                                                                                            | Source                                                                                                            |
| ----------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `details/Details.vue` (the `<router-view>` host shell)                                                                                          | identical — see [entities.examples.md](entities.examples.md)                                                      |
| `details/FormModalButton.vue`                                                                                                                   | identical — see [entities.examples.md](entities.examples.md)                                                      |
| `filter/Filter.vue` · `filter/FilterInline.vue`                                                                                                 | identical — see [entities.examples.md](entities.examples.md)                                                      |
| `overview/Overview.vue`                                                                                                                         | identical — see [entities.examples.md](entities.examples.md)                                                      |
| `selecting/Autocomplete.vue` · `InputSelector.vue` · `Selector.vue` · `SelectorDropdown.vue` · `SelectorSearch.vue` · `SelectorModalButton.vue` | identical — see [entities.examples.md](entities.examples.md)                                                      |
| `data/store.ts`                                                                                                                                 | identical — see [entities.examples.md](entities.examples.md) (the resolved `EntityService` differs, wired in §13) |

> Only the **Vehicle-specific** picker (`selecting/SelectorList.vue`, §11) and overview list
> (`overview/List.vue`, §9 / `overview/ListItem.vue`, §10) carry entity-specific columns — those are
> reprinted in full above.

## App-level aggregator

The slice is collected, with every other entity plugin, in `src/entities/index.ts` and installed in a
single `app.use(...)`. That file is **not** part of the slice — it lives with the app shell.

> **→ See:** [entities.setup.md](entities.setup.md#bootstrap--maints) — the app aggregator and bootstrap.

## See also

- [entities.examples.md](entities.examples.md) — the **simple** (`UnitType`) + **standard** (`Product`) slices + all shared boilerplate (read these first)
- [entities.setup.md](entities.setup.md) — app scaffolding, the [Entity slice anatomy](entities.setup.md#entity-slice-anatomy), router, bootstrap, app shell
- [entities.patterns.md](entities.patterns.md) — per-feature recipes: [owned (child) collections](entities.patterns.md#owned-child-collections), [hierarchical (tree) entities](entities.patterns.md#hierarchical-tree-entities) (links the `treelist` module), [navigation from the config map](entities.patterns.md#navigation-from-the-config-map), custom endpoints, soft-delete, paging, JSON services
- [entities.signatures.md](entities.signatures.md) · [entities.namespaces.md](entities.namespaces.md) — exact signatures and import specifiers
