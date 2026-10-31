import { computed, watch, onMounted, type Ref } from "vue"
import type { IEntity } from "../../../core/entities/abstractions"
import { createOwnedCollection } from "../../../core/entities/form/collections"
import { vueBox } from "../../box"

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
    const collection = createOwnedCollection<T>({
        box: vueBox,
        modelValue: () => props.modelValue,
        update: (value) => emit("update:modelValue", value),
        emit,
        createRow,
    })
    // Reads never yield `undefined`: a parent whose collection is still unset renders as an empty editor
    // instead of throwing on `items.value.map(...)` in a computed that evaluates before onMounted.
    const items = computed<Array<T>>({ get: collection.items, set: collection.setItems })

    // Never write the prop back on mount or when it changes: an unset collection must stay unset, since a
    // save sends `[]` as "delete every row" and `null`/absent as "leave the rows alone".
    watch(() => props.modelValue, collection.onModelValueChange)
    onMounted(collection.mount)

    return {
        items,
        newItem: collection.newItem as Ref<T | undefined>,

        resetNewItem: collection.resetNewItem,
        handleSort: collection.handleSort,
        handleSave: collection.handleSave,
    }
}

export default useOwnedCollection
