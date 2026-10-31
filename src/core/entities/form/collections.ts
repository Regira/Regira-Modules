import type { Box, BoxFactory } from "../../box"
import { min } from "../../../utilities/array-utility"
import type { IEntity, SaveResult } from "../abstractions"

// The editors of a collection an entity owns (its order lines, its tags): the collection is the owner's, held in its
// prop, and an editor hands it a new one rather than editing it.

type CollectionInput<T> = {
    box: BoxFactory
    /** the owner's collection, as its prop holds it now */
    modelValue(): Array<T> | undefined
    /** hands the owner a new collection; its prop catches up when the owner re-renders */
    update(value: Array<T>): void
    emit(event: "sort", e: any): void
}
type Collection<T> = {
    /** never `undefined`: an unset collection reads as an empty one, and stays unset until a row is added */
    items(): Array<T>
    setItems(value: Array<T>): void
    handleSort(e: any): void
    /** the owner's prop changed: a write it has caught up with is no longer pending */
    onModelValueChange(): void
}

function createCollection<T extends IEntity & { id: number }>({ modelValue, update, emit }: CollectionInput<T>) {
    // The last write until the owner's prop catches up: the prop only changes on the owner's re-render,
    // so a second append in the same tick would otherwise build on the stale array and drop the first.
    let pending: Array<T> | undefined
    const items = () => modelValue() ?? []
    function setItems(value: Array<T>) {
        pending = value
        update(value)
    }
    /** adds a saved row with a temporary id: always negative, since a positive one could name a stored row */
    function append(saved: T) {
        const current = pending ?? items()
        const minId = Math.min((min(current, (x) => x.id) as number | undefined) ?? 0, 0) - 1
        saved.id = minId
        setItems(current.concat([saved]))
    }
    return {
        items,
        setItems,
        append,
        // sorting: no need to hand the owner the collection, the draggable component writes it through setItems
        handleSort: (e: any) => emit("sort", e),
        onModelValueChange: () => void (pending = undefined),
    }
}

export type OwnedCollectionInput<T> = CollectionInput<T> & {
    /**
     * Mints the add-row. Pass the owning model's named constructor — `createRow: () => OrderLine.create()` — and the
     * row arrives with its class field defaults and computed getters; without it the row is a bare `{ id: 0 }`.
     * `id` is always overwritten with `0`, which is what marks the row unsaved.
     */
    createRow?: () => T
}
export type OwnedCollection<T> = Collection<T> & {
    newItem: Box<T | undefined>
    resetNewItem(): Promise<void>
    handleSave({ saved, isNew }: SaveResult<T>): void
    /** the view mounted: mints the first add-row */
    mount(): Promise<void>
}

export function createOwnedCollection<T extends IEntity & { id: number }>({ createRow, ...input }: OwnedCollectionInput<T>): OwnedCollection<T> {
    const { items, setItems, append, handleSort, onModelValueChange } = createCollection(input)
    const createEmptyItem = () => {
        const row = (createRow?.() ?? {}) as T
        row.id = 0
        return row
    }
    const newItem = input.box<T | undefined>(undefined)

    async function resetNewItem() {
        newItem.value = createEmptyItem()
    }
    function handleSave({ saved, isNew }: SaveResult<T>) {
        if (isNew) {
            append(saved)
            resetNewItem()
        }
    }

    // Never write the owner's collection on mount or when it changes: an unset collection must stay unset, since a
    // save sends `[]` as "delete every row" and `null`/absent as "leave the rows alone".
    return { items, setItems, newItem, resetNewItem, handleSort, handleSave, onModelValueChange, mount: resetNewItem }
}

export type ListInput<T> = Collection<T> & {
    newItem: Box<T>
    handleSave({ saved, isNew }: SaveResult<T>): void
}

export function createListInput<T extends IEntity & { id: number }>(input: CollectionInput<T>): ListInput<T> {
    const { items, setItems, append, handleSort, onModelValueChange } = createCollection(input)
    const newItem = input.box<T>({ id: 0 } as T)

    function handleSave({ saved, isNew }: SaveResult<T>) {
        if (isNew) {
            append(saved)
            newItem.value = { id: 0 } as T
        }
    }

    return { items, setItems, newItem, handleSort, handleSave, onModelValueChange }
}

export type ListItemInput<T> = {
    handleSave(): void
    /** marks the row deleted, or not any more: an owned row is removed by a mark the save sends, never by a splice */
    handleRemove(item: T): void
}

export function createListItemInput<T extends IEntity & { id: number; _deleted: boolean }>({
    item,
    emit,
}: {
    /** the row, as the owner's prop holds it now */
    item(): T
    emit(event: "save" | "remove", arg: unknown): void
}): ListItemInput<T> {
    return {
        handleSave: () => emit("save", { saved: item(), isNew: !item().id }),
        handleRemove(row: T) {
            row._deleted = !row._deleted
            emit("remove", row)
        },
    }
}
