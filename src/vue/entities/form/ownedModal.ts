import { ref, unref, type Ref } from "vue"
import { deepCopy } from "../../../utilities/object-utility"
import type { IEntity, SaveResult } from "../abstractions"

type Input<T> = {
    props: {
        modelValue?: T
        itemDefaults?: Ref<Record<string, unknown>> | Record<string, unknown>
    }
    emit: {
        (e: "update:modelValue", args?: T): void
        (e: "save", args: SaveResult<T>): void
        (e: "cancel"): void
    }
}

export function useOwnedModal<T extends IEntity & { id: number }>(Entity: { new (): T }, { props, emit }: Input<T>) {
    const item = ref(props.modelValue || { id: 0 }) as Ref<T>
    const isOpen = ref(false)

    function handleOpen() {
        const modelValue = props.modelValue || {}
        const itemDefaults = deepCopy(unref(props.itemDefaults || {}))

        item.value = Object.assign(new Entity(), {
            ...modelValue,
            ...itemDefaults,
        })
        isOpen.value = true
    }
    function handleCancel() {
        emit("cancel")
        isOpen.value = false
    }
    function handleSubmit() {
        emit("save", { saved: item.value!, isNew: item.value!.id == 0 })
        emit("update:modelValue", item.value)
        isOpen.value = false
    }

    return {
        item,
        isOpen,

        handleOpen,
        handleCancel,
        handleSubmit,
    }
}

export default useOwnedModal
