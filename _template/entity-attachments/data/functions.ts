import { ref, watch } from "vue"
import { browse, fileToBlob, saveAs } from "@regira/modules/utilities/file-utility"
import { enqueue } from "@regira/modules/utilities/promise-utility"
import { useAxios } from "@regira/modules/vue/http"
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
