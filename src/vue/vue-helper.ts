import { computed, type WritableComputedRef, onMounted, onUnmounted, type ComputedRef } from "vue"
import type { IEntity, IPoolHandler } from "./entities"

export function useVModelField<T>(
    props: Readonly<Record<string, unknown>>,
    emit: any,
    name = "modelValue",
    defaultValue?: T
): WritableComputedRef<T> {
    return computed<T>({
        get: () => (typeof props[name] !== "undefined" ? props[name] : defaultValue) as T,
        set: (value: T) => {
            emit(`update:${name}`, value)
        },
    })
}

export function createFromComputedPool<T extends IEntity>(
    store: IPoolHandler<T>
): ComputedRef<(x: Array<T> | T | undefined) => Array<T> | T | undefined> {
    const { fromPool } = store
    return computed(() => (x) => fromPool(x))
}

export function useEventListener(
    target: HTMLElement | Document | Window,
    event: string,
    callback: (e: Event) => void,
    allChildren: boolean = false
): void {
    event.split(" ").forEach((e) => {
        onMounted(() => target.addEventListener(e, callback, allChildren))
        onUnmounted(() => target.removeEventListener(e, callback, allChildren))
    })
}
