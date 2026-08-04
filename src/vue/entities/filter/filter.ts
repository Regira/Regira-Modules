import { computed, type Ref, type ComputedRef } from "vue"
import type { ISearchObject } from "../abstractions/ISearchObject"
import { DefaultSearchObject } from "../abstractions/SearchObjectBase"

export interface FilterEmits<SO extends ISearchObject = ISearchObject> {
    (e: "update:modelValue", args: SO): void
    (e: "filter", args: SO): void
    (e: "toggle-adv"): void
    (e: "close"): void
}
export interface FilterIn<SO extends ISearchObject = ISearchObject> {
    searchObject: Ref<SO>
    emit: FilterEmits<SO>
    Constructor?: new () => SO
}
export interface FilterOut {
    filterIsActive: ComputedRef<boolean | undefined>
    handleToggle(): void
    handleFilter(): void
    handleUpdate(): void
    handleReset(): void
}

export function useFilter<SO extends ISearchObject = DefaultSearchObject>({ searchObject, emit, Constructor }: FilterIn<SO>): FilterOut {
    const handleUpdate = () => {
        emit("update:modelValue", { ...searchObject.value })
    }
    const handleFilter = () => {
        emit("filter", searchObject.value)
    }

    const filterIsActive = computed<boolean | undefined>(() => {
        const defaultItem = Constructor ? new Constructor() : new DefaultSearchObject()
        const defaultKeys = Object.keys(defaultItem)
        const activeKeys = Object.entries(searchObject.value || {})
            .filter(([, value]) => value != null)
            .map(([key]) => key)
        return defaultKeys.some((dk) => activeKeys.some((ak) => dk == ak))
    })

    return {
        filterIsActive,
        handleToggle: () => emit("toggle-adv"),
        handleFilter,
        handleUpdate: () => {
            handleUpdate()
            handleFilter()
        },
        handleReset: () => {
            //searchObject.value.reset()
            //set all values to undefined
            const newValue = Object.fromEntries(
                Object.entries({
                    ...searchObject.value,
                }).map(([key]) => [key, undefined])
            ) as SO
            emit("update:modelValue", newValue)
            handleFilter()
        },
    }
}

export default useFilter
