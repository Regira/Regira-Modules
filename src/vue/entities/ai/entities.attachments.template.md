# Regira Entities — Attachments Slice Template (scaffold)

The **shared** `entity-attachments` slice: a file/picture editor that stages **offline** (add via drop or
browse, rename, remove, drag-to-reorder) and commits everything on the **parent entity's save**. Scaffold it
once per app, then bind it in a tab on every entity that owns files.

```bash
node .../scaffold.mjs <Entity> --attachments   # the shared slice + the wiring, into a NEW <Entity> slice
node .../scaffold.mjs --attachments            # the shared slice only → src/entities/entity-attachments/
```

Name an entity and the generator writes three of the four edits below into that slice — the `attachments`
field, the `insert`/`update` overrides and the `prepareItem` filter — leaving you the form tab. It only does
so for a slice it is generating: against one that already exists, it scaffolds the shared slice and prints
the same edits for you to apply, because those files are yours.

It builds on shipped primitives — `FileDropZone` (`vue/ui`), `useAxios().upload`/`getFile` (`vue/http`,
field name defaults to `"file"`, baseURL-aware), and `file-utility` — so **do not** reach for
`FileHelper.send` (bare axios, no baseURL, field `"files"`). Full explanation + host wiring:
[entities.patterns.md → Attachments (files)](entities.patterns.md#attachments-files--offline-add--rename--remove-confirm-on-save).

Rows are drag-sortable via **native HTML5 drag & drop** (no extra dependency). Order travels by **array
position**: the server assigns `SortOrder = index` over the incoming collection on every parent save
(`SetSortOrder()`, wired by `HasAttachments` — its input DTO has no sort field). The client sorts by the
server-sent `sortOrder` on load and mirrors the array index back into it after every change, so a re-map
(a host `prepareItem` assigning a fresh array) re-sorts to the same order instead of reverting a drag.

> **Shared slice — no per-entity tokens.** Unlike an entity slice, this is copied verbatim (one folder per
> app). You do not customize its files; you customize which entities _use_ it (the 3-line host wiring below).

## `attachments/Entity.ts`

```ts
import { EntityBase } from "regira/vue/entities"

// The file itself; `_file` is the raw Blob, staged in memory until the parent is saved.
export class Attachment extends EntityBase {
    id = 0
    fileName?: string
    contentType?: string
    length?: number
    _file?: Blob & { name?: string }

    override get $id() {
        return this.id || "new"
    }
    override get $title() {
        return this.fileName
    }

    static create(v?: object) {
        return Object.assign(new Attachment(), v || {})
    }
}

export const Entity = Attachment
export default Attachment
```

## `data/Entity.ts`

```ts
import { EntityBase } from "regira/vue/entities"
import Attachment from "../attachments/Entity"

// The owned join row on the parent (`parent.attachments`).
export class EntityAttachment extends EntityBase {
    id = 0
    objectId?: number
    attachmentId?: number
    uri?: string
    sortOrder = 0 // list position — mirrored from the array index client-side (keeps re-maps stable); the server derives SortOrder from the array order on save (its input DTO has no sort field, so the serialized value is informational)
    newFileName?: string // edited name for an existing file — applied on flush
    attachment?: Attachment
    _deleted = false // marked-delete (undoable) — filtered out in the host service's prepareItem

    override get $id() {
        return this.id || "new"
    }
    override get $title() {
        return this.fileName
    }
    get fileName() {
        return this.attachment?.fileName
    }
    set fileName(v) {
        ;(this.attachment ??= new Attachment()).fileName = v
    }

    static create(v?: object): EntityAttachment {
        const a = (v as EntityAttachment)?.attachment
        if (a && !(a instanceof Attachment)) (v as EntityAttachment).attachment = Attachment.create(a)
        const item = Object.assign(new EntityAttachment(), v || {})
        if (item.id > 0 && item.fileName && !item.newFileName) item.newFileName = item.fileName
        return item
    }
}

export const Entity = EntityAttachment
export default EntityAttachment
```

## `data/functions.ts`

```ts
import { ref, watch } from "vue"
import { browse, fileToBlob, saveAs } from "regira/utilities/file-utility"
import { enqueue } from "regira/utilities/promise-utility"
import { useAxios } from "regira/vue/http"
import Entity from "./Entity"
import Attachment from "../attachments/Entity"

// Stage a picked/dropped file: keep the Blob in memory + an object URL for instant preview/download.
export function createEntity(file: Blob & { name?: string }): Entity {
    const item = new Entity()
    item.attachment = Object.assign(new Attachment(), { _file: file, fileName: file.name, contentType: file.type, length: file.size })
    item.uri = URL.createObjectURL(file)
    return item
}

export function useEntityAttachments({
    props,
    emit,
}: {
    props: { modelValue?: Array<Entity>; readonly?: boolean }
    emit: (e: "update:modelValue", v: Array<Entity>) => void
}) {
    // Map incoming JSON rows to instances ONCE and own the array; emitting it up shares the refs, so in-place
    // edits (rename, _deleted, reorder) persist without re-mapping. Re-map only when the host swaps in a new record.
    // The ARRAY ORDER is the wire contract (the server assigns SortOrder from position on every parent
    // save) — but the client mirrors the index into sortOrder after every change, because re-maps sort by
    // it: a host prepareItem that assigns a fresh filtered array retriggers toItems, and stale values
    // would visually revert a drag at the moment of save.
    const renumber = (v: Array<Entity>) => v.forEach((x, i) => (x.sortOrder = i))
    const toItems = (v: Array<Entity>) => {
        const mapped = v.map((x) => Entity.create(x)).sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
        renumber(mapped)
        return mapped
    }
    const items = ref<Array<Entity>>(toItems(props.modelValue ?? []))
    watch(
        () => props.modelValue,
        (v) => {
            if (v && v !== items.value) items.value = toItems(v)
        }
    )
    const sync = () => emit("update:modelValue", items.value)

    function handleBrowse(files: Array<Blob>) {
        // defense-in-depth: every current caller is already readonly-gated (drop zone v-if, handleDrop
        // guard), but this is the only mutation entry point — it guards itself so no future caller can
        // mutate a view-only form
        if (props.readonly) return
        const minId = Math.min(0, ...items.value.map((x) => x.id))
        files.forEach((f, i) => {
            const e = createEntity(f)
            e.id = minId - 1 - i // negative temp ids, like any new owned row
            items.value.push(e)
        })
        renumber(items.value)
        sync()
    }
    async function triggerBrowse(opts: { multiple?: boolean; accept?: string } = {}) {
        handleBrowse(await browse(opts))
    }

    // Drag-to-reorder — native HTML5 drag & drop, no dependency. The handle records the source index on
    // dragstart; dropping on a row moves the source there (the new array order is what the parent save
    // sends — the server derives SortOrder from it). Rows preventDefault unconditionally — an unhandled
    // OS file drop would NAVIGATE to the file and unload the SPA (discarding unsaved form edits) — and
    // route external file drops through the same add path as the FileDropZone; dragend clears the index
    // so a cancelled drag (Esc, released outside a row) cannot leak into the next drop.
    const dragIndex = ref<number>()
    function handleDragStart(index: number, e: DragEvent) {
        dragIndex.value = index
        e.dataTransfer?.setData("text/plain", String(index)) // Firefox refuses to start a drag without data
        if (e.dataTransfer) e.dataTransfer.effectAllowed = "move"
    }
    function handleDragEnd() {
        dragIndex.value = undefined
    }
    function handleDrop(index: number, e: DragEvent) {
        if (props.readonly) return // defense-in-depth — the drag handle is hidden, but guard the mutation path too
        const from = dragIndex.value
        dragIndex.value = undefined
        if (from == null) {
            // external drop (e.g. files from the OS) — add them like the drop zone would
            const files = Array.from(e.dataTransfer?.files ?? [])
            if (files.length) handleBrowse(files)
            return
        }
        if (from === index) return
        items.value.splice(index, 0, ...items.value.splice(from, 1))
        renumber(items.value)
        sync()
    }

    return { items, sync, triggerBrowse, handleBrowse, handleDragStart, handleDragEnd, handleDrop }
}

// Insert needs the parent's id before it can POST files → save the record first, then upload.
export async function insertWithAttachments<T extends { id: number; attachments?: Array<Entity> }>(
    api: string,
    item: T,
    insert: () => Promise<T | undefined>,
    update: (saved: T) => Promise<T | undefined>
): Promise<T | undefined> {
    const attachments = item.attachments
    if (!attachments?.length) return await insert()
    delete item.attachments // the insert must POST without attachments; restored below so a failed save never loses the staged files
    try {
        const saved = await insert()
        if (saved == null) return undefined // insert failed — nothing to attach files to
        saved.attachments = attachments
        await saveAll(api, saved)
        attachments.forEach((x) => delete x.attachment?._file) // free the blobs
        // the file upload carries no order — the follow-up parent update sends the array in display order
        // and the server assigns SortOrder from position (saveAll assigned the ids, so the Related() sync
        // updates instead of re-inserting). It only conveys order, so it must never invalidate the
        // completed insert: a "failed" insert would make the user resubmit and create a duplicate record.
        try {
            return (await update(saved)) ?? saved
        } catch (ex) {
            console.warn("attachment order could not be persisted — saving the record again will retry it", { ex })
            return saved
        }
    } finally {
        item.attachments = attachments // the caller's live entity keeps its rows on every failure path
    }
}
export async function updateWithAttachments<T extends { id: number; attachments?: Array<Entity> }>(
    api: string,
    item: T,
    update: () => Promise<T | undefined>
): Promise<T | undefined> {
    await saveAll(api, item)
    item.attachments?.forEach((x) => delete x.attachment?._file) // free the blobs, like insert
    return await update()
}
async function saveAll(api: string, item: { id: number; attachments?: Array<Entity> }) {
    const pending = (item.attachments ?? []).filter((x) => x.attachment?._file != null && !x._deleted)
    await enqueue(
        pending.map((x) => async () => {
            // re-wrap under the edited name so the uploaded file carries it
            if (x.fileName && x.fileName !== x.attachment!._file!.name)
                x.attachment!._file = await fileToBlob(x.attachment!._file as File, x.fileName)
            const {
                data: { item: saved },
            } = await useAxios().upload(`${api}/${item.id}/files`, [x.attachment!._file!]) // field name "file"; baseURL-relative
            Object.assign(x, { id: saved.id, objectId: saved.objectId, attachmentId: saved.attachmentId })
        })
    )
}
export async function download(item: Entity) {
    await saveAs(item.attachment?._file ?? (await useAxios().getFile(item.uri!)), item.fileName)
}
```

## `overview/Overview.vue`

```vue
<template>
    <FormSection :title="$t('files')">
        <!-- drag the handle onto another row to reorder; sortOrder follows the array index.
             rows also accept OS file drops (added like the drop zone) — never let the browser navigate -->
        <div
            v-for="(row, i) in items"
            :key="row.$id"
            class="d-flex align-items-center gap-2 mb-2"
            @dragover.prevent
            @drop.prevent="handleDrop(i, $event)"
        >
            <span
                v-if="!readonly"
                class="text-muted"
                style="cursor: grab"
                draggable="true"
                @dragstart="handleDragStart(i, $event)"
                @dragend="handleDragEnd"
            >
                <Icon name="move" />
            </span>
            <ListItem v-model="items[i]!" :class="{ 'is-deleted': row._deleted }" class="flex-grow-1" :readonly="readonly" @change="sync" />
        </div>
        <FileDropZone v-if="!readonly" @drop-files="handleBrowse" @click="triggerBrowse()">
            <template #default="{ isDropping }">
                <div class="text-center text-info p-4 my-2 border rounded" :class="{ 'border-info bg-light': isDropping }">
                    {{ $t("addNewFile(s)") }}
                </div>
            </template>
        </FileDropZone>
        <Debug :modelValue="items" />
    </FormSection>
</template>

<script setup lang="ts">
import { FileDropZone, FormSection, Icon } from "regira/vue/ui"
import { Debug } from "regira/vue/debug"
import { useEntityAttachments } from "../data/functions"
import type Entity from "../data/Entity"
import ListItem from "./ListItem.vue"

const emit = defineEmits<{ (e: "update:modelValue", v: Array<Entity>): void }>()
const props = withDefaults(defineProps<{ modelValue?: Array<Entity>; readonly?: boolean }>(), { modelValue: () => [] })

const { items, sync, triggerBrowse, handleBrowse, handleDragStart, handleDragEnd, handleDrop } = useEntityAttachments({ props, emit })
</script>
```

## `overview/ListItem.vue`

```vue
<template>
    <div class="input-group">
        <a :href="item.uri" class="btn btn-outline-info" @click.prevent="handleDownload"><Icon name="download" /></a>
        <!-- an existing file edits newFileName; a staged file edits fileName directly -->
        <input
            v-if="item.id > 0"
            v-model.lazy="item.newFileName"
            :placeholder="item.fileName"
            :readonly="readonly"
            maxlength="256"
            class="form-control"
            @change="emit('change')"
        />
        <input v-else v-model.lazy="item.fileName" :readonly="readonly" maxlength="256" class="form-control" @change="emit('change')" />
        <span class="input-group-text">{{ formatFileSize(item.attachment?.length ?? 0) }}</span>
        <button v-if="!readonly" type="button" class="btn btn-outline-danger" @click="toggleRemove"><Icon name="delete" /></button>
    </div>
</template>

<script setup lang="ts">
import { formatFileSize } from "regira/utilities/file-utility"
import { Icon } from "regira/vue/ui"
import type Entity from "../data/Entity"
import { download } from "../data/functions"

const emit = defineEmits<{ (e: "change"): void }>()
defineProps<{ readonly?: boolean }>()
const item = defineModel<Entity>({ required: true })

function toggleRemove() {
    item.value._deleted = !item.value._deleted // undoable
    emit("change")
}
async function handleDownload() {
    await download(item.value)
}
</script>
```

## `index.ts`

```ts
export { default as Entity } from "./data/Entity"
export * from "./data/functions"
export { default as Overview } from "./overview/Overview.vue"
export { default as ListItem } from "./overview/ListItem.vue"
export { default as Attachment } from "./attachments/Entity"
```

## Wire it into an owning entity

Three edits in the owner's slice: the join field, the service overrides, and the form tab.

⚠️ **`setup.ts` needs nothing.** The helpers upload through `useAxios()`, so the service keeps its plain
`AxiosInstance` constructor and the default registration stands. It is only when you add endpoints of your
own — `getAttachments` / `addAttachment` calling `this.axios.upload` / `getFile`, as the Vehicle service in
[entities.advanced.example.md](entities.advanced.example.md) §13 does — that the constructor takes an
`AxiosWithFilesInstance` and `setup.ts` has to resolve one.

The helper signatures (they live in **your** scaffolded slice, not in `regira`):

```ts
// entity-attachments/data/functions.ts
export async function insertWithAttachments<T extends { id: number; attachments?: Array<Entity> }>(
    api: string,
    item: T,
    insert: () => Promise<T | undefined>,
    update: (saved: T) => Promise<T | undefined>
): Promise<T | undefined>
export async function updateWithAttachments<T extends { id: number; attachments?: Array<Entity> }>(
    api: string,
    item: T,
    update: () => Promise<T | undefined>
): Promise<T | undefined>
```

```ts
// data/Entity.ts — the join field (import the model aliased)
import type { Entity as EntityAttachment } from "../../entity-attachments"
attachments?: Array<EntityAttachment>
```

```ts
// data/EntityService.ts — flush files on save; drop marked rows (deleted by omission)
import { insertWithAttachments, updateWithAttachments } from "../../entity-attachments/data/functions"
override async insert(item: Owner): Promise<Owner | undefined> {
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

```ts
// setup.ts — ONLY if the service gained getAttachments/addAttachment of its own (they call this.axios
// .upload/.getFile). With just the overrides above, leave setup.ts and the constructor as generated.
import type { AxiosWithFilesInstance } from "regira/vue/http"
serviceProvider.add(Entity.name, (sp) => new EntityService(sp.get<AxiosWithFilesInstance>("axios")!, config))
```

> **Back-end:** register the owner's attachments (`WithAttachments` + `HasAttachments<>`); order the
> attachments include by sort order — `x.Attachments!.OrderBy(a => a.SortOrder)` — so the list loads in the
> saved order (`HasAttachments` assigns `SortOrder` from the incoming array position on every parent
> save). Expose the download **anonymously** if
> `<img src>` tags render thumbnails (a guarded download 401s — the tag sends no `Authorization` header).
> See `Regira.Entities` → _Public (anonymous) attachment downloads_.
