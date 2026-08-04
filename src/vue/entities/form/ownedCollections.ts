import { computed, ref, watch, onMounted } from "vue"
import { min } from "../../../utilities/array-utility"
import { useVModelField } from "../../vue-helper"
import type { IEntity, SaveResult } from "../abstractions"

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
    const items = computed<Array<T>>({
        get: () => model.value ?? [],
        set: (value) => (model.value = value),
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
            const minId = Math.min((min(items.value, (x) => x.id) as number | undefined) ?? 0, 0) - 1
            saved.id = minId
            const newItems = items.value.concat([saved])
            items.value = newItems
            resetNewItem()
        }
    }

    // don't use watchEffect -> bad emit timing?
    watch(
        () => props.modelValue,
        () => (items.value = props.modelValue || [])
    )
    onMounted(async () => {
        items.value = props.modelValue || []
        await resetNewItem()
    })

    return {
        items,
        newItem,

        resetNewItem,
        handleSort,
        handleSave,
    }
}

export default useOwnedCollection
