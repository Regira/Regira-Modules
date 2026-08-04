import { ref, type Ref } from "vue"
import { min } from "../../../utilities/array-utility"
import { useVModelField } from "../../vue-helper"
import type { IEntity, SaveResult } from "./../abstractions"

type ListInputIn<T> = {
    props: { modelValue?: Array<T> }
    emit: any
}

export function useListInput<T extends IEntity & { id: number }>({ props, emit }: ListInputIn<T>) {
    const items = useVModelField<Array<T>>(props, emit)
    const newItem = ref<T>({ id: 0 } as T) as Ref<T>

    // sorting
    const handleSort = (e: any) => {
        // no need to emit, draggable component handles this with computed items setter
        //emit("update:modelValue", items.value)
        emit("sort", e)
    }
    function handleSave({ saved, isNew }: SaveResult<T>) {
        if (isNew) {
            const minId = ((min(items.value, (x) => x.id) as number | undefined) ?? 0) - 1
            saved.id = minId
            emit("update:modelValue", items.value.concat([saved]))
            newItem.value = { id: 0 } as T
        }
    }

    return {
        items,
        newItem,
        handleSort,
        handleSave,
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

    function handleSave() {
        emit("save", { saved: item.value, isNew: !item.value.id })
    }
    function handleRemove(item: T) {
        item._deleted = !item._deleted
        emit("remove", item)
    }

    return {
        item,
        handleSave,
        handleRemove,
    }
}

export default useListInput
