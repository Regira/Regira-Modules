import { computed, ref, watch, onMounted } from "vue"
import { min } from "../../../utilities/array-utility"
import { useVModelField } from "../../vue-helper"
import type { IEntity, SaveResult } from "../../../core/entities/abstractions"

type Input<T> = {
    props: {
        modelValue?: Array<T>
    }
    emit: any
    /**
     * Mints the add-row. Pass the owning model's named constructor — `createRow: () => OrderLine.create()`
     * — and the row arrives with its class field defaults and computed getters; without it the row is a
     * bare `{ id: 0 }`, so an enum dropdown renders blank and a getter used in the template is `undefined`.
     * `id` is always overwritten with `0`, which is what marks the row unsaved.
     */
    createRow?: () => T
}

export function useOwnedCollection<T extends IEntity & { id: number }>({ props, emit, createRow }: Input<T>) {
    // Reads never yield `undefined`: a parent whose collection is still unset renders as an empty editor
    // instead of throwing on `items.value.map(...)` in a computed that evaluates before onMounted.
    const model = useVModelField<Array<T> | undefined>(props, emit)
    // The last write until the parent's prop catches up: the prop only changes on the parent's re-render,
    // so a second append in the same tick would otherwise build on the stale array and drop the first.
    let pending: Array<T> | undefined
    const items = computed<Array<T>>({
        get: () => model.value ?? [],
        set: (value) => {
            pending = value
            model.value = value
        },
    })
    const createEmptyItem = () => {
        const row = (createRow?.() ?? {}) as T
        row.id = 0
        return row
    }
    const newItem = ref<T>()

    async function resetNewItem() {
        newItem.value = createEmptyItem()
    }
    // sorting
    const handleSort = (e: any) => {
        // no need to emit, draggable component handles this with computed items setter
        //emit("update:modelValue", items.value)
        emit("sort", e)
    }
    function handleSave({ saved, isNew }: SaveResult<T>) {
        if (isNew) {
            const current = pending ?? items.value
            const minId = Math.min((min(current, (x) => x.id) as number | undefined) ?? 0, 0) - 1
            saved.id = minId
            items.value = current.concat([saved])
            resetNewItem()
        }
    }

    // Never write the prop back on mount or when it changes: an unset collection must stay unset, since a
    // save sends `[]` as "delete every row" and `null`/absent as "leave the rows alone".
    watch(
        () => props.modelValue,
        () => (pending = undefined)
    )
    onMounted(resetNewItem)

    return {
        items,
        newItem,

        resetNewItem,
        handleSort,
        handleSave,
    }
}

export default useOwnedCollection
