# Regira Entities — API Signatures Reference

Verbatim TypeScript signatures for the front-end CRUD client (`@regira/modules/vue/entities`).

> **AI rule:** Do not guess a signature, generic parameter, or option name — look it up here first.
> Every block shows the `import` specifier above it. The barrel `@regira/modules/vue/entities`
> re-exports everything below; the deeper specifiers (`/abstractions`, `/details`, `/form`) are
> also published for granular imports. Full specifier list:
> [entities.namespaces.md](entities.namespaces.md).

## Table of contents

1. [Entity contracts](#1-entity-contracts)
2. [Service contracts](#2-service-contracts)
3. [Search, paging, sort](#3-search-paging-sort)
4. [Config & descriptor](#4-config--descriptor)
5. [Overview composables](#5-overview-composables)
6. [Details, form, filter composables](#6-details-form-filter-composables)
7. [Pooling (entity cache)](#7-pooling-entity-cache)
8. [Navigation](#8-navigation)
9. [Tree, preloading, utilities](#9-tree-preloading-utilities)
10. [Wiring (IoC + HTTP)](#10-wiring-ioc--http)
11. [Lean views (`EntityOverview` / `EntityForm`)](#11-lean-views-entityoverview--entityform)

---

## 1. Entity contracts

```ts
import { type IEntity, isNewEntity } from "@regira/modules/vue/entities"
export interface IEntity {
    get $id(): number | string // uniform identifier
    get $title(): string | undefined // uniform label used for display
}
// true for an unsaved-entity sentinel: null | undefined | "new" | "" | a non-positive number (0 or a negative temp id). save() inserts these.
export function isNewEntity(id: number | string | null | undefined): boolean
```

```ts
import { EntityBase } from "@regira/modules/vue/entities"
export abstract class EntityBase implements IEntity {
    constructor()
    abstract get $id(): string | number
    abstract get $title(): string | undefined
}
// EntityBase also defines a non-contract `entityType` getter on its prototype = this.constructor.name
```

---

## 2. Service contracts

```ts
import type { IEntityService } from "@regira/modules/vue/entities"
export interface IEntityService<T extends IEntity = IEntity> {
    details(id: number | string, so?: ISearchObject): Promise<T | undefined> // `{ archived: ArchivedFilter.included }` resolves an archived row
    list(so?: object): Promise<Array<T>>
    search(so?: object): Promise<SearchResult<T>>
    searchUnion(searchObjects: Array<object>, extra?: IPagingInfo | ISortByInfo): Promise<SearchResult<T>>
    save(item: T): Promise<SaveResult<T>>
    remove(item: T): Promise<void>
    toEntity(item: object): T
    newEntity(values?: Record<string, any>): Promise<T>
}
```

Result envelope types (`import type { ... } from "@regira/modules/vue/entities"`):

```ts
export type DetailsResult<T> = { item: T; duration?: number }
export type ListResult<T> = { items: Array<T>; duration?: number }
export type SearchResult<T> = { items: Array<T>; count: number; duration?: number }
export type SavedResult<T> = { item: T; isNew: boolean; duration?: number } // raw server insert/update shape
export type SaveResult<T> = { saved: T; isNew: boolean; affected?: number; duration?: number } // returned by save()
export type DeleteResult<T> = { item: T; affected?: number; duration?: number }
```

> **Note:** `SavedResult` (`{ item }`) ≠ `SaveResult` (`{ saved }`). The server returns `SavedResult`;
> `save()`/`insert()`/`update()` repackage it into `SaveResult`. Bind overview/form results to `saved`.

```ts
import { EntityServiceBase } from "@regira/modules/vue/entities"
export abstract class EntityServiceBase<T extends IEntity> implements IEntityService<T>, HasDefaultPageSize {
    protected axios: AxiosInstance
    protected config: IConfig
    defaultPageSize: number
    constructor(axios: AxiosInstance, config: IConfig)
    details(id: string | number, so?: ISearchObject): Promise<T | undefined> // `so` becomes the query string on `GET /{id}`
    list(so?: ISearchObject & IPagingInfo & Partial<ISortByInfo>): Promise<Array<T>>
    search(so?: ISearchObject & IPagingInfo & Partial<ISortByInfo>): Promise<SearchResult<T>>
    searchUnion(searchObjects: Array<ISearchObject>, extra?: IPagingInfo | ISortByInfo): Promise<SearchResult<T>>
    save(item: T): Promise<SaveResult<T>>
    remove(item: T): Promise<void>
    update(item: T): Promise<T | undefined>
    insert(item: T): Promise<T | undefined>
    protected fetchItems<TResult extends { items: Array<T> }>(api: string, so?: ISearchObject & IPagingInfo & Partial<ISortByInfo>): Promise<TResult>
    protected processItem(item: T | undefined): T | undefined // hydrates `created`/`lastModified` strings to Date
    protected prepareItem(item: T): T // strips top-level properties whose key starts with "_" (does not recurse)
    protected createInstance<T>(type: { new (): T }): T
    newEntity(values?: Record<string, any>): Promise<T>
    abstract toEntity(item: Object): T // the ONLY required override
}
```

⚠️ **`toEntity` must be idempotent.** `fromPool` and the library's `FormModalButton.modalTitle` call it from
inside a `computed`, so an unconditional conversion (`item.startsOn = new Date(item.startsOn)`) mutates the
computed's own reactive dependency and Vue aborts with `Maximum recursive updates exceeded` — reported
against the **library** component, which sends you looking in the wrong file. Return an existing instance
untouched, and guard every extra date/field conversion:

```ts
override toEntity(item: object): Entity {
    if (item instanceof Entity) return item
    const entity = Object.assign(this.createInstance(Entity as new () => Entity), item || {})
    if (entity.startsOn && !(entity.startsOn instanceof Date)) entity.startsOn = new Date(entity.startsOn)
    // an owned-collection lift needs the same guard — a fresh array is a mutation like a fresh Date
    if (entity.lines?.some((row) => !(row instanceof Line))) entity.lines = entity.lines.map((row) => Line.create(row))
    return entity
}
```

```ts
import { JSONService } from "@regira/modules/vue/entities"
// In-memory variant: fetches the full list once, then runs all CRUD client-side over a shared cache keyed by `key`.
export abstract class JSONService<T extends IEntity> extends EntityServiceBase<T> {
    protected key: string
    constructor(axios: AxiosInstance, config: IConfig, key: string)
    get cachedItems(): Array<T>
    set cachedItems(value: Array<T>)
    fetchJSONItems(): Promise<Array<T>>
    details(id: string | number): Promise<T | undefined> // client-side lookup — takes no search object (static JSON has no archived rows)
    list(so?: ISearchObject & IPagingInfo & Partial<ISortByInfo>): Promise<T[]>
    search(so?: ISearchObject & IPagingInfo & Partial<ISortByInfo>): Promise<SearchResult<T>>
    save(item: T): Promise<{ saved: T; isNew: boolean }>
    remove(item: T): Promise<void>
    processSearchObject(so?: ISearchObject): ISearchObject
    abstract toEntity(item: Object): T
}
```

---

## 3. Search, paging, sort

```ts
import { SearchObjectBase, DefaultSearchObject, ArchivedFilter } from "@regira/modules/vue/entities"
export interface ISearchObject extends Record<string, any> {
    q?: string // free-text search
    archived?: ArchivedFilter // omitted when unset → the server hides archived rows
}
export enum ArchivedFilter {
    excluded = "excluded", // archived rows invisible
    only = "only", // archived rows only — the recycle bin
    included = "included", // live + archived
}
export abstract class SearchObjectBase implements ISearchObject {
    q?: string
}
export class DefaultSearchObject extends SearchObjectBase {}
```

> **`archived` (search object) ≠ `isArchived` (entity).** `archived` selects which rows a read returns;
> `isArchived` is the row's own flag that `DELETE` sets and `useForm.handleRestore` clears. Declare
> `archived?: ArchivedFilter` on your `SearchObject` only when the UI exposes archived rows.

> ⚠️ **Paging and sorting are not members of your `SearchObject` — they ride the call argument.**
> `SearchObjectBase` carries only `q` (+ your filter fields), so `so.pageSize = 25` / `so.sortBy = [...]` on a
> scaffolded instance does **not** type-check (`TS2339`), and neither belongs on the class. `pageSize`/`page`
> come from `IPagingInfo`, `sortBy` from `ISortByInfo`, and the call parameter is their intersection:
> `search(so?: ISearchObject & IPagingInfo & Partial<ISortByInfo>)`. The overview composables merge them for
> you; a view you write passes them inline:
>
> ```ts
> const { items, count } = await service.search({ ...searchObject.value, pageSize: 0, sortBy: ["StartDesc"] })
> ```
>
> `ISearchObject extends Record<string, any>`, so an API-specific key that is on neither interface reaches the
> query string just as well — no cast needed (`{ ...so, tenantId: 3 }`). Arrays serialize as repeated keys,
> which is why `sortBy` accepts an array. `new PagingInfo(pageSize?, page?)` is for the overview composable's
> `pagingInfo` ref, **not** for `search()` — there is no nested `{ paging: … }` shape.

```ts
import { PagingInfo, DEFAULT_PAGESIZE } from "@regira/modules/vue/entities"
export const DEFAULT_PAGESIZE = 10
export interface IPagingInfo {
    pageSize?: number
    page?: number
}
export class PagingInfo implements IPagingInfo {
    page: number
    pageSize: number
    constructor(pageSize?: number, page?: number) // defaults: pageSize = DEFAULT_PAGESIZE, page = 1
}
```

```ts
import { SortByInfo } from "@regira/modules/vue/entities"
export interface ISortByInfo {
    sortBy: string | Array<string>
}
export class SortByInfo implements ISortByInfo {
    sortBy: string | Array<string>
}
```

---

## 4. Config & descriptor

```ts
import type { IConfig } from "@regira/modules/vue/entities"
import { NavTypes } from "@regira/modules/vue/entities"
export interface IConfig extends Record<string, any> {
    name?: string
    key: string // drives route names: `${key}Overview`, `${key}Details`, `${key}Fiche`, `${key}Form`
    requires?: Array<string>
    isComplex?: boolean // form on a Details PAGE (default true) vs a modal; also gates the FilterAdv toggle.
    //                     >~6 fields, any relation or any collection → page. Distinct from the back-end
    //                     simple/complex split, which is about For<> generic arity.
    routePrefix: string // URL path segment
    baseQueryParams?: Record<string, unknown> // merged into every list/search request
    initialQuery?: Record<string, unknown> // seeds the generated nav link's route query — nothing else reads it
    overviewTitle?: string
    detailsTitle?: string
    description?: string
    icon?: string
    defaultPageSize: number
    api: string // base path; every *Url below defaults to `api` when omitted
    detailsUrl?: string
    listUrl?: string
    searchUrl?: string // set it to `api + "/search"` for the counted /search endpoint every Regira controller exposes (the scaffold config does)
    saveUrl?: string
    deleteUrl?: string
}
export enum NavTypes {
    dashboard = "Dashboard",
    navbar = "Navbar",
}
```

⚠️ **`initialQuery` has exactly one consumer:** `createNavItem` copies it into the generated dashboard/navbar
link's route query. It is therefore **lost on refresh and on a deep link** — anything that must hold for every
request (`sortBy`, `includes`, a mandatory filter) belongs in `baseQueryParams`.

```ts
import { EntityDescriptor } from "@regira/modules/vue/entities"
type IEntityControls = { Overview?: any; Details?: any; Form?: any; Fiche?: any }
export interface IEntityDescriptor<T extends IEntity = IEntity> extends IEntityControls {
    Entity: { name: string; new (): T }
    serviceBuilder: (sp: IServiceProvider) => IEntityService<T>
    config: IConfig
    get key(): string
}
export class EntityDescriptor<T extends IEntity = IEntity> {
    constructor(
        Entity: { name: string; new (): T },
        serviceBuilder: (sp: IServiceProvider) => IEntityService<T>,
        config: IConfig,
        { Overview, Details, Form, Fiche }: IEntityControls
    )
    get key(): string // = Entity.name
}
```

> **Note:** `EntityDescriptor` is an alternative API; the demos wire entities with a plain `IConfig`
> object + IoC registration instead. See [entities.instructions.md](entities.instructions.md).

---

## 5. Overview composables

```ts
import { useSearchView, useListView, useOverviewCore, useRouteOverview } from "@regira/modules/vue/entities"
export const DEFAULT_DEBOUNCE = 250 // internal — NOT re-exported from the barrel

export type OverviewCoreIn<T extends IEntity, SO extends ISearchObject = ISearchObject> = {
    service: IEntityService<T>
    searchObject: SO
    defaultPageSize?: number
}
export type OverviewCoreOut<T extends IEntity, SO extends ISearchObject = ISearchObject> = {
    searchObject: Ref<SO>
    pagingInfo: Ref<IPagingInfo>
    items: Ref<Array<T> | undefined> // undefined until the first fetch resolves
    itemsCount: Ref<number | undefined>
    isLoading: Ref<boolean>
    feedback: FeedbackOut
    applySave(item: T): Promise<SaveResult<T> | undefined> // undefined = the save failed
    applyRemove(item: T): Promise<boolean> // false = the server refused the delete (409, 403, …)
    handleSave({ saved, isNew }: SaveResult<T>): void
    handleRemove(item: T): void
    resetPage(): void
}
export interface IListViewIn<T, SO> extends OverviewCoreIn<T, SO> {
    debounceDelay?: number
}
export interface ISearchViewOut<T, SO> extends OverviewCoreOut<T, SO> {
    searchHandler(resetPaging?: boolean): Promise<void>
    debouncedSearchHandler(): Promise<void>
}
export interface IListViewOut<T, SO> extends OverviewCoreOut<T, SO> {
    listHandler(): Promise<void>
    debouncedListHandler(): Promise<void>
}

export function useSearchView<T extends IEntity, SO extends ISearchObject = ISearchObject>({
    service,
    searchObject,
    defaultPageSize,
    debounceDelay,
}: IListViewIn<T, SO>): ISearchViewOut<T, SO>
export function useListView<T extends IEntity, SO extends ISearchObject = ISearchObject>({
    service,
    searchObject,
    defaultPageSize,
    debounceDelay,
}: IListViewIn<T, SO>): IListViewOut<T, SO>
export function useOverviewCore<T extends IEntity, SO extends ISearchObject = ISearchObject>({
    service,
    searchObject,
    defaultPageSize,
}: OverviewCoreIn<T, SO>): OverviewCoreOut<T, SO>
```

⚠️ **`applySave` and `applyRemove` both report failure through their return value, and both need guarding.**
They catch the error and raise it through `feedback`, so a rejected write does not throw at the call site —
the caller decides what happens to the list. Apply the result before mutating it:
`if (await applyRemove(item)) handleRemove(item)`. Calling `handleRemove(item)` unconditionally leaves the
failure message up and removes the row anyway, which is the shape a 409 on a still-referenced row takes.

```ts
export type RouteOverviewIn<SO extends ISearchObject = ISearchObject> = {
    pagingInfo: Ref<IPagingInfo>
    searchObject: Ref<SO>
    defaultPageSize?: number
    handler(): Promise<void>
}
export type RouteOverviewOut = {
    updateOverviewRoute(resetPaging?: boolean): void
    routeSearchHandler(): Promise<void>
    routeWatcher: WatchStopHandle
}
export function useRouteOverview({ pagingInfo, searchObject, defaultPageSize, handler }: RouteOverviewIn): RouteOverviewOut
```

`updateOverviewRoute` pushes onto the **current** route — it spreads `router.currentRoute` and replaces only
`query`, never naming a slice route. So a slice's `Overview` can be embedded in any app-owned view (a saved-
queue rail, a split view, a dashboard with a live list) and its filters and paging sync to that view's URL
instead of navigating away to `/entities`. The paired constraint: `routeWatcher` re-runs the search only while
the route **name** is unchanged, so a filter handler that pushes to a different named route stops the watcher.

`OverviewProps<T>` / `OverviewEmits<T>` (for custom overview components):

```ts
export interface OverviewProps<T> {
    modelValue: Array<T>
    config: IConfig
    title: string
    service: IEntityService<T>
}
export interface OverviewEmits<T> {
    "update:modelValue": [Array<T>]
    "update:searchObject": [SO]
    "update:pagingInfo": [IPagingInfo]
    save: [SaveResult<T>]
    remove: [T]
    "request-save": [T]
    "request-remove": [T]
}
```

---

## 6. Details, form, filter composables

```ts
import { useDetails } from "@regira/modules/vue/entities"
export function useDetails<T extends IEntity>(entityService: IEntityService<T>, feedback?: FeedbackOut): DetailsOut<T>
export type DetailsOut<T> = {
    item: Ref<T | undefined> // undefined until the onMounted load resolves — guard with v-if="item"
    routeId: ComputedRef<string>
    isNew: ComputedRef<boolean>
    overviewUrl?: RouteRecordRaw | string
    isForm: ComputedRef<boolean>
    isFiche: ComputedRef<boolean>
    hasFiche: ComputedRef<boolean>
    isLoading: Ref<boolean>
    feedback: FeedbackOut
    load(): Promise<void>
}
```

> `useDetails` (and `useModal`) load with `archived: ArchivedFilter.included`, so a soft-deleted row opens
> in the form with its Restore button instead of 404-ing. Row security is unaffected.

```ts
import { useForm, formDefaults, FormStates } from "@regira/modules/vue/entities"
export interface FormProps<T> {
    modelValue: T
    readonly?: boolean
    isPopup?: boolean
}
export interface FormEmits<T> {
    (e: "update:modelValue", item?: T): void
    (e: "save", result: SaveResult<T>): void
    (e: "remove", item: T): void
    (e: "restore", item: T): void
    (e: "cancel", arg: { canceled: T; original?: T }): void
    (e: "changeState", state: FormStates): void
}
export enum FormStates {
    pending = "Pending",
    saved = "Saved",
    removed = "Removed",
    error = "Error",
}
export const formDefaults: { readonly: boolean; isPopup: boolean }
export function useForm<T extends IEntity>({ entityService, props, emit, feedback }: FormIn<T>): FormOut<T>
export interface FormOut<T> {
    item: Ref<T>
    original?: Ref<T>
    feedback: FeedbackOut
    handleCancel(): void
    handleSubmit(): Promise<void>
    handleRemove(): Promise<void> // ⚠ takes NO args — removes item.value
    handleRestore(): Promise<void> // unarchive: sets the entity's isArchived=false then saves (write path needs no query param)
}
```

> **`handleRemove` arity differs by composable.** The **form**'s `handleRemove()` takes **no arguments**
> (it removes the bound `item.value`); the **overview**'s `handleRemove(item: T)` takes the row. Don't
> pass the item to the form's `handleRemove` — it's a common type error.

```ts
import { useModal, formModalDefaults } from "@regira/modules/vue/entities"
export interface FormModalProps<T> extends FormProps<T> {
    title?: string
    fullWidth?: boolean
    closeOnSave?: boolean
    closeOnDelete?: boolean
}
export interface FormModalEmits<T> extends FormEmits<T> {
    (e: "open", item: T, update: (newItem: T) => void): void
    (e: "close", item?: T): void
}
export const formModalDefaults: { closeOnSave: boolean; closeOnDelete: boolean }
// declared as useModalForm; the barrels re-export ONLY the useModal alias — always import useModal
export const useModal: typeof useModalForm
declare function useModalForm<T extends IEntity>({
    entityService,
    model,
    itemDefaults,
    closeOnSave,
    closeOnCancel,
    closeOnDelete,
    emit,
    feedback,
}: FormModalIn<T>): FormModalOut<T>
```

```ts
// FormModalButton — the workhorse edit affordance: a button that opens the entity's Form in a modal. Each
// slice re-exports its own from details/FormModalButton.vue (import { FormModalButton } from "@/entities/<slice>").
// Props: { modelValue?: T; readonly?; itemDefaults?; initialTab?; label?; closeOnSave?; fullWidth? }
// Emits: FormModalEmits<T> + update:modelValue | save(SaveResult<T>) | remove(T) | restore(T) | cancel | open | close
// In an overview row, forward @save AND @remove — a delete from inside the modal leaves the row stale otherwise.
```

```ts
import { useFilter } from "@regira/modules/vue/entities"
export interface FilterIn<SO> {
    searchObject: Ref<SO>
    emit: FilterEmits<SO>
    Constructor?: new () => SO
}
export interface FilterEmits<SO> {
    (e: "update:modelValue", args: SO): void
    (e: "filter", args: SO): void
    (e: "toggle-adv"): void
    (e: "close"): void
}
export interface FilterOut {
    filterIsActive: ComputedRef<boolean | undefined>
    handleToggle(): void
    handleFilter(): void
    handleUpdate(): void
    handleReset(): void
}
export function useFilter<SO extends ISearchObject = DefaultSearchObject>({ searchObject, emit, Constructor }: FilterIn<SO>): FilterOut
// handleUpdate = emit update:modelValue + filter (the one to bind on inputs); handleFilter = filter only.
```

⚠️ **`useFilter` refreshes nothing on its own — bind `handleUpdate` on every filter input.** A native
`<input>` takes `@change="handleUpdate"`; a custom component (`InputSelector`, `NullableCheckBox`,
`DateInput`) emits Vue custom events only, so it needs `@select="handleUpdate"` /
`@update:modelValue="handleUpdate"`. Miss it and the results **and** the result count keep showing the
previous search while the control displays the new value. Do **not** substitute a deep `watch` on the search
object — that refetches on every keystroke.

**Feedback** — the overview / details / form composables each return `feedback: FeedbackOut`
(from `@regira/modules/vue/ui`). Its surface (use these method names — they are not auto-completed elsewhere):

```ts
import type { FeedbackOut } from "@regira/modules/vue/ui"
// reactive(): read the fields directly, no .value — :disabled="feedback.isPending"
export interface FeedbackOut {
    status: FeedbackStatus // "" | "Pending" | "Success" | "Failed"
    message: string
    error: string | Record<string, string> | undefined
    readonly isPending: boolean // busy flag — gate submit buttons on it
    pending(msg: string): void // every setter REQUIRES a message
    success(msg: string): void
    fail(msg: string, ex?: string | Record<string, string>): void
    reset(): void
}
```

Owned child collections (`import { ... } from "@regira/modules/vue/entities"`):

⚠️ The `T extends IEntity & { id: number }` constraint means an **owned child model must still extend
`EntityBase`** (`$id` / `$title`) even though it has no service, no config and no store of its own.

```ts
export function useOwnedCollection<T extends IEntity & { id: number }>({
    props,
    emit,
    createRow, // () => T — mints the add-row from your model; without it the row is a bare { id: 0 }
}: Input<T>): {
    items: WritableComputedRef<T[]> // reads as [] while the parent's collection is unset — never undefined
    newItem: Ref<T | undefined>
    resetNewItem: () => Promise<void>
    handleSort: (e: any) => void
    handleSave: ({ saved, isNew }: SaveResult<T>) => void
}
export function useOwnedModal<T extends IEntity & { id: number }>(
    Entity: { new (): T },
    { props, emit }: Input<T>
): {
    item: Ref<T>
    isOpen: Ref<boolean>
    handleOpen: () => void
    handleCancel: () => void
    handleSubmit: () => void
}
export function useListInput<T extends IEntity & { id: number }>({
    props,
    emit,
}: ListInputIn<T>): {
    items: WritableComputedRef<T[]>
    newItem: Ref<T>
    handleSort: (e: any) => void
    handleSave: ({ saved, isNew }: SaveResult<T>) => void
}
export function useListItemInput<T extends IEntity & { id: number; _deleted: boolean }>({
    props,
    emit,
}: {
    props: Readonly<Record<string, unknown>>
    emit: any
}): {
    item: WritableComputedRef<T>
    handleSave: () => void
    handleRemove: (item: T) => void
}
```

`InputSelectorInline` is the default chip editor for an owned/join (m2m) collection — the marked-delete
UX the `useOwned*` composables and the multi-`Selector` can't deliver (recipe:
[entities.patterns.md → owned-m2m](entities.patterns.md#the-owned-m2m-recipe--inputselectorinline)):

```ts
import { InputSelectorInline } from "@regira/modules/vue/entities"

// InputSelectorInline — inline chip editor for an owned/join collection edited inside the parent form.
//   Generic over the row type: <T extends { _deleted?: boolean; id?: number | string | null }>.
//   Removing a PERSISTED row MARKS it (`_deleted`, tinted, undoable until save) — pair with a
//   `prepareItem` override that filters marked rows so `Related()` deletes by omission. A row ADDED THIS
//   SESSION (via the #selector slot's `add` — tracked by raw identity through toRaw, so reactive
//   re-wrapping doesn't break it and the row shape needs no `id` field) is removed outright — nothing to
//   undo. A positive numeric id overrides the session tracking (the row got persisted); string ids don't
//   (they may be client-minted GUIDs). Pass `isNew` when rows are created elsewhere.
//   props: { modelValue?: Array<T> (v-model);
//            rowKey?: (row: T) => string | number | undefined;      // stable :key per row; falls back to an internal per-row identity (never the index)
//            excludeKey?: (row: T) => number | undefined;           // related id per row → feeds the #selector `exclude`
//            isNew?: (row: T) => boolean }                          // override the unsaved-row detection
//   slots: chip({ row }), selector({ add, exclude })                // add: (row: T) => void; exclude: number[] (every current row, marked ones included)
//   emits: "add" (row: T) | "remove" (row: T) | "update:modelValue" (value: T[] | undefined)
//   "remove" fires for hard-removal, mark AND restore — discriminate AFTER the event: hard-removed row is
//   no longer in modelValue; marked row has `_deleted === true`; restored row has `_deleted === false`.
//   contract types (for a replacement skin): InputSelectorInlineProps<T> / InputSelectorInlineEmits<T> / InputSelectorInlineSlots<T>
```

`InputSelector` (scaffolded per-slice into `selecting/`, re-exported from the slice barrel) is the
single-relation (FK) picker — Autocomplete + inline create/edit + selector-modal in one `input-group`:

```ts
import { InputSelector } from "../../<slice>"

// InputSelector — single-relation FK picker.
//   props: { modelValue?: Entity (v-model — the displayed entity);
//            idValue?: number | string (v-model:idValue — the FK actually saved; bind BOTH, idValue alone renders blank);
//            readonly?: boolean; canEdit?: boolean (default true — shows the inline FormModalButton);
//            itemDefaults?: Ref<Record<string, any>> | Record<string, any>; filterDefaults?: Record<string, any>;
//            closeOnSave?: boolean; placeholder?: string }
//   slots: default (the Autocomplete) | prepend (create/edit button) | append (clear + selector-modal button)
//   emits: "update:modelValue" (args?: Entity) | "update:idValue" (args?: number | string) | "select" (args?: Entity)
//   NOTE: the "select" payload is NULLABLE (Entity | undefined) — the clear button emits undefined — so a
//         @select handler must accept undefined: @select="(e?: Entity) => …", not (e: Entity).
```

---

## 7. Pooling (entity cache)

```ts
import { createStore, usePooling, defaultPoolCache, PoolCache, PoolService } from "@regira/modules/vue/entities"
export function createStore<T extends IEntity>(service: IEntityService<T>, type: string): IPoolHandler<T>
export function usePooling<T extends IEntity>(service: IEntityService<T>, type: string, cache?: IPoolCache, persistent?: boolean): IPoolHandler<T>
export const defaultPoolCache: PoolCache

export interface IPoolService<T extends IEntity> extends IEntityService<T> {
    get(input: T): Ref<T> | undefined
    getMany(input: Array<T>): Array<Ref<T>>
}
export interface IPoolHandler<T extends IEntity> extends IPoolService<T> {
    service: IPoolService<T>
    cache: IPoolCache
    set(item: T): Ref<T>
    setMany(items: Array<T>): Array<Ref<T>>
    fromPool<P = Array<T> | T>(input: P): P // entity/relation (or array) → its shared pooled instance; runs toEntity, dedups by $id, caches on first sight (unsaved inputs pass through)
    fromCache(id?: string | number): Ref<T> | undefined | Array<Ref<T>> // read-only: id → that cached Ref (or undefined); no arg → all cached refs of the type; never fetches
}
export interface IPoolCache {
    persistentTypes: Array<string>
    set<T extends IEntity>(item: T): Ref<T>
    get<T extends IEntity>(type: string, key: number | string): Ref<T> | undefined
    remove<T extends IEntity>(item: T): boolean
    hasType(type: string): boolean
    getAll<T extends IEntity>(type: string): Array<Ref<T>>
    getEntityMap(type: string): Map<number | string, any>
}
export class PoolCache implements IPoolCache {
    constructor({ interval, expires, maxItems }?: ICacheOptions) /* + IPoolCache members */
}
export class PoolService<T extends IEntity> implements IPoolService<T> {
    constructor(service: IEntityService<T>, cache: IPoolCache, type: string) /* + IEntityService + get/getMany/set/setMany */
}
```

---

## 8. Navigation

```ts
import {
    NavItem,
    NavGroup,
    buildNavigationTree,
    createNavItem,
    createNavGroup,
    importDashboard,
    importNavbar,
    isNavItem,
} from "@regira/modules/vue/entities"
export interface INavCore {
    id: string
    parentId?: string
    title: string
    description?: string
    icon?: string
}
export interface IRoutingNavItem {
    routeName: string
    initialQuery?: Record<string, unknown>
}
export interface INavItem extends INavCore, IRoutingNavItem {}
export class NavGroup implements INavCore {
    id: string
    title: string
    parentId?: string
    icon?: string
}
export class NavItem implements INavItem {
    id: string
    name: string
    icon: string
    routeName: string
    title: string
    description?: string
    initialQuery?: Record<string, unknown>
    parentId?: string
}
export function createNavItem(input: IConfig, parentId?: string): INavItem
export function createNavGroup(input: { id: string; title: string; icon: string }): INavCore
export function buildNavigationTree(items: Array<INavCore>): TreeList<INavCore>
export function importDashboard(input: IImportDashboardInput): Array<INavCore>
export function importNavbar(input: IImportNavbarInput): Array<INavCore>
export function isNavItem(item: INavCore): item is NavItem
```

---

## 9. Tree, preloading, utilities

```ts
import { useTree, useDragDrop } from "@regira/modules/vue/entities"
export function useTree<T extends { $id: number | string }>(
    options?: TreeIn<T>
): {
    tree: Ref<TreeList<T> | undefined>
    nodes: ComputedRef<TreeNode<T>[]>
    ancestors: ComputedRef<TreeNode<T>[]>
    offspring: ComputedRef<TreeNode<T>[]>
    family: ComputedRef<TreeNode<T>[]>
    init: (values: Array<T>, data: Array<T>, findParents: IFindParents<T>) => void
}
export function useDragDrop<T = any>({ emit }: { emit: any }): DragDropEngine
```

```ts
import { usePreloader, preloaderPlugin } from "@regira/modules/vue/entities"
export function usePreloader(): { preload: typeof preload; ready: typeof ready }
export const plugin: { install(_: App): void; preload: typeof preload; ready: typeof ready } // exported as preloaderPlugin
```

```ts
import { cleanQueryParams, parseQueryParams } from "@regira/modules/vue/entities"
export function cleanQueryParams(queryParams: Record<string, unknown>, _defaultPageSize?: number): Record<string, unknown>
export function parseQueryParams(queryParams: Record<string, unknown>): { searchObject: Record<string, unknown>; pagingInfo: IPagingInfo } // → { searchObject, pagingInfo }
```

---

## 10. Wiring (IoC + HTTP)

The entities layer never creates its own HTTP client; it is injected. These are the registration/resolution
and HTTP entry points used at app startup (live in sibling modules).

```ts
import { ServiceProvider, get, type IServiceProvider } from "@regira/modules/vue/ioc"
export interface IServiceProvider {
    get<T = any>(key: any): T | undefined
    add<T = any>(key: any, factory: (sp: IServiceProvider) => T): IServiceProvider
}
export class ServiceProvider implements IServiceProvider {
    /* members above; factory re-runs on every get */
}
export function get<T>(key: any): T | undefined // resolves from the default ServiceProvider singleton
```

```ts
import { initAxios, useAxios, type AxiosWithFilesInstance } from "@regira/modules/vue/http"
import { createQueryString } from "@regira/modules/vue/http"
export interface AxiosWithFilesInstance extends AxiosInstance {
    getFile(url: string, method?: string, filename?: string, type?: string): Promise<Blob>
    upload(url: string, files: Array<Blob>, options?: UploadOptions): Promise<AxiosResponse>
}
export function initAxios(config: { api: string; includeCredentials?: boolean }): AxiosWithFilesInstance
export function useAxios(): AxiosWithFilesInstance
export function createQueryString(o: object): URLSearchParams
```

---

## 11. Lean views (`EntityOverview` / `EntityForm`)

Generic, service-driven components for the lean tier (see
[entities.setup.md → Lean tier](entities.setup.md#lean-tier-generic-views)). Both are generic over
`T extends IEntity` and take a constructed `IEntityService<T>`; they rely only on the service contract, so
they run without plugins, stores, or routes.

```ts
import { EntityOverview, EntityForm, useLeanOverview, useLeanForm, leanOverviewDefaults } from "@regira/modules/vue/entities"

// EntityOverview — list + built-in server paging + delete
//   props:   LeanOverviewProps<T> = { service: IEntityService<T>; query?: Record<string, unknown>; pageSize?: number }   // pageSize default 10
//   slots:   LeanOverviewSlots<T> = toolbar({ reload, setPage }), head(), row({ item, remove, reload }), paging({ page, pageCount, count, setPage })
//   exposes: { reload(): Promise<void>; setPage(p): Promise<void> }       // search({ ...query, page, pageSize })

// EntityForm — create ("new") / edit one item
//   props: LeanFormProps<T> = { service: IEntityService<T>; id: string | number }
//   slots: LeanFormSlots<T> = default({ item })                           // item from newEntity() or details(id)
//   emits: LeanFormEmits<T> = "saved" (item: T) | "cancel"                // save() result is the `saved` field

// behavior for replacement skins (reload-on-mount, page clamping, remove; load/save + double-submit guard):
export function useLeanOverview<T extends IEntity>(props: LeanOverviewProps<T>): LeanOverviewOut<T> // { items, count, page, pageCount, reload, setPage, remove }
export function useLeanForm<T extends IEntity>(props: LeanFormProps<T>, { emit }): LeanFormOut<T> // { item, saving, submit }
```

---

## See also

- [entities.namespaces.md](entities.namespaces.md) — which import specifier each type comes from
- [entities.instructions.md](entities.instructions.md) — the workflow that uses these signatures
- [entities.examples.md](entities.examples.md) — a full worked entity slice
