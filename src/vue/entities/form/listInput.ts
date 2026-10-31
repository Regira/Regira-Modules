import { computed, watch, type Ref } from "vue"
import { useVModelField } from "../../vue-helper"
import type { IEntity } from "../../../core/entities/abstractions"
import { createListInput, createListItemInput } from "../../../core/entities/form/collections"
import { vueBox } from "../../box"

type ListInputIn<T> = {
    props: { modelValue?: Array<T> }
    emit: any
}

export function useListInput<T extends IEntity & { id: number }>({ props, emit }: ListInputIn<T>) {
    const list = createListInput<T>({ box: vueBox, modelValue: () => props.modelValue, update: (value) => emit("update:modelValue", value), emit })
    const items = computed<Array<T>>({ get: list.items, set: list.setItems })
    // the last write is pending until the parent's prop catches up, so two appends in one tick keep both rows
    watch(() => props.modelValue, list.onModelValueChange)

    return {
        items,
        newItem: list.newItem as Ref<T>,
        handleSort: list.handleSort,
        handleSave: list.handleSave,
    }
}

export function useListItemInput<T extends IEntity & { id: number; _deleted: boolean }>({
    props,
    emit,
}: {
    props: Readonly<Record<string, unknown>>
    emit: any
}) {
    const item = useVModelField<T>(props, emit)
    const { handleSave, handleRemove } = createListItemInput<T>({ item: () => item.value, emit })

    return {
        item,
        handleSave,
        handleRemove,
    }
}

export default useListInput
