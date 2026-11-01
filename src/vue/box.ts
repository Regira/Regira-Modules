import { customRef, isReadonly, isRef, isShallow, reactive, toRaw } from "vue"
import type { Box, BoxFactory } from "../core/box"

// what ref() keeps: an object as its reactive proxy, anything else as it is
const toReactive = <T>(value: T): T => (value !== null && typeof value === "object" ? (reactive(value as object) as T) : value)
// as ref() and Vue's own array writes: a readonly or shallow value is kept as it is
const isDirect = (value: unknown) => isShallow(value) || isReadonly(value)
const rawRow = (row: unknown) => (isDirect(row) ? row : toRaw(row))

// An array the core builds from one it read through a box holds the rows' reactive proxies. Vue's own array writes
// store raw rows, so the box does too: `toRaw(items.value)` stays plain, as structuredClone and IndexedDB need it.
// The rows are made raw in place, so the box keeps the array it was given, as ref() does — which means an array a
// caller still holds now has the raw rows where it had their proxies. An array that cannot be written (frozen, or with
// a read-only index) is copied instead, and a frozen one's copy is frozen too.
function withRawRows<T>(raw: T): T {
    if (!Array.isArray(raw) || raw.every((row) => rawRow(row) === row)) return raw
    if (!Object.isFrozen(raw)) {
        try {
            raw.forEach((row, index) => (raw[index] = rawRow(row)))
            return raw
        } catch {
            // a read-only index: the copy below
        }
    }
    const rows = raw.map(rawRow)
    return (Object.isFrozen(raw) ? Object.freeze(rows) : rows) as T
}

/**
 * The box the Vue layer hands the core's controllers: a ref that keeps what `ref()` keeps — a deep reactive value,
 * a readonly or shallow one as it is, and a ref passed in as that ref — so every box a composable returns is a Vue
 * ref that `watch`, `triggerRef` and templates treat as one. It differs only in storing an array's rows raw.
 */
export const vueBox: BoxFactory = <T>(initial: T): Box<T> => {
    if (isRef(initial)) return initial as unknown as Box<T>
    return customRef<T>((track, trigger) => {
        // `source` is the raw value last given, `raw` what is kept: the same, but for a frozen array whose rows were copied
        let source = toRaw(initial)
        let raw = isDirect(initial) ? source : withRawRows(source)
        let value = isDirect(initial) ? initial : toReactive(raw)
        return {
            get() {
                track()
                return value
            },
            set(next) {
                const nextSource = isDirect(next) ? next : toRaw(next)
                if (Object.is(nextSource, source) || Object.is(nextSource, raw)) return
                source = nextSource
                raw = isDirect(next) ? nextSource : withRawRows(nextSource)
                value = toReactive(raw)
                trigger()
            },
        }
    }) as unknown as Box<T>
}
