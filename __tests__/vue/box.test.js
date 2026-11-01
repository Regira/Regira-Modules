import { describe, test, expect } from "vitest"
import { isProxy, isReadonly, isRef, isShallow, reactive, readonly, ref, shallowReactive, toRaw, triggerRef, watch, watchEffect } from "vue"
import { vueBox } from "../../src/vue/box"

// The box the Vue layer hands the core is what `ref()` was before the logic moved: the composables return it as a ref.

describe("vueBox is a deep ref", () => {
    test("a ref to Vue, and a deep one", () => {
        const box = vueBox({ nested: { title: "chair" } })

        expect(isRef(box)).toBe(true)
        expect(isShallow(box)).toBe(false)
        expect(isProxy(box.value.nested)).toBe(true)
    })

    test("an edit deep inside the value re-runs what read it, as a filter's in-place edit does", () => {
        const box = vueBox({ nested: { title: "chair" } })
        const seen = []
        watchEffect(() => seen.push(box.value.nested.title), { flush: "sync" })

        box.value.nested.title = "armchair"

        expect(seen).toEqual(["chair", "armchair"])
    })

    test("assignments and triggerRef re-run what read it exactly as they do for ref()", () => {
        function runs(make) {
            const rows = [{ id: 1 }]
            const box = make(rows)
            let effects = 0
            let watched = 0
            watchEffect(() => (box.value, effects++), { flush: "sync" })
            watch(box, () => watched++, { flush: "sync" })

            box.value = rows // the same value
            box.value = box.value // its own proxy: the same raw array
            box.value = [...rows]
            triggerRef(box)
            return { effects, watched }
        }

        expect(runs(vueBox)).toEqual(runs(ref))
        expect(runs(vueBox)).toEqual({ effects: 3, watched: 1 })
    })

    test("keeps what ref() keeps: a readonly or shallow value as it is, and a ref passed in as that ref", () => {
        function kept(make) {
            const inner = ref({ q: "x" })
            const assignedReadonly = make({})
            assignedReadonly.value = readonly({ q: "" })
            const assignedShallow = make({})
            assignedShallow.value = shallowReactive({ a: { b: 1 } })
            return {
                readonly: isReadonly(make(readonly({ q: "" })).value),
                assignedReadonly: isReadonly(assignedReadonly.value),
                shallow: isShallow(make(shallowReactive({ a: { b: 1 } })).value),
                assignedShallow: isShallow(assignedShallow.value),
                sameRef: make(inner) === inner,
                deep: isProxy(make({ a: { b: 1 } }).value.a),
            }
        }

        expect(kept(vueBox)).toEqual(kept(ref))
        expect(kept(vueBox)).toEqual({ readonly: true, assignedReadonly: true, shallow: true, assignedShallow: true, sameRef: true, deep: true })
    })

    test("unwraps inside reactive(), as a composable's ref does", () => {
        const state = reactive({ status: vueBox("Pending") })

        expect(state.status).toBe("Pending")
    })
})

describe("vueBox keeps raw rows", () => {
    test("an array built from the box's own rows stores them raw, so it can be cloned", () => {
        const box = vueBox([{ id: 1 }, { id: 2 }])

        box.value = [...box.value, { id: 3 }] // rows read through the box are its proxies

        expect(toRaw(box.value).some(isProxy)).toBe(false)
        expect(structuredClone(toRaw(box.value))).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }])
        expect(isProxy(box.value[0])).toBe(true) // reads stay reactive
    })

    test("it keeps the array it was given, as ref() does, so a row added to it later is read", () => {
        function rowsRead(make) {
            const rows = [...vueBox([{ id: 1 }]).value] // rows that are proxies
            const box = make([])
            box.value = rows
            rows.push({ id: 2 })
            triggerRef(box)
            return { kept: toRaw(box.value) === rows, read: box.value.length }
        }

        expect(rowsRead(vueBox)).toEqual(rowsRead(ref))
        expect(rowsRead(vueBox)).toEqual({ kept: true, read: 2 })
    })

    test("assigning the same array again, or its own proxy, triggers nothing", () => {
        for (const frozen of [false, true]) {
            const rows = [...vueBox([{ id: 1 }]).value] // rows that are proxies
            const withProxies = frozen ? Object.freeze(rows) : rows
            const box = vueBox([])
            box.value = withProxies
            let effects = 0
            let watched = 0
            watchEffect(() => (box.value, effects++), { flush: "sync" })
            watch(box, () => watched++, { flush: "sync" })

            box.value = withProxies
            box.value = box.value

            expect({ frozen, effects, watched }).toEqual({ frozen, effects: 1, watched: 0 })
        }
    })

    test("a frozen array is copied to make its rows raw, and the copy stays frozen", () => {
        const box = vueBox([])

        box.value = Object.freeze([...vueBox([{ id: 1 }]).value])

        expect(Object.isFrozen(toRaw(box.value))).toBe(true)
        expect(toRaw(box.value).some(isProxy)).toBe(false)
    })

    test("an array with a read-only index is copied, not thrown on", () => {
        const rows = [...vueBox([{ id: 1 }, { id: 2 }]).value]
        Object.defineProperty(rows, 0, { writable: false })
        const box = vueBox([])

        box.value = rows

        expect(toRaw(box.value)).not.toBe(rows)
        expect(toRaw(box.value).some(isProxy)).toBe(false)
    })

    test("a readonly or shallow array keeps its rows as they are, made or assigned", () => {
        const rowsOf = (array) => toRaw(array).map((row) => isProxy(row))
        const proxies = () => [...vueBox([{ id: 1 }]).value]
        const assigned = vueBox([])
        assigned.value = readonly(proxies())
        const assignedShallow = vueBox([])
        assignedShallow.value = shallowReactive(proxies())

        expect(rowsOf(vueBox(readonly(proxies())).value)).toEqual([true])
        expect(rowsOf(vueBox(shallowReactive(proxies())).value)).toEqual([true])
        expect(rowsOf(assigned.value)).toEqual([true])
        expect(rowsOf(assignedShallow.value)).toEqual([true])
    })

    test("a readonly or shallow row is kept as it is, as Vue's own array writes keep it", () => {
        const plain = { id: 1 }
        const locked = readonly({ id: 2 })
        const shallow = shallowReactive({ id: 3 })
        const box = vueBox([])

        box.value = [reactive(plain), locked, shallow]

        expect(toRaw(box.value)).toEqual([plain, locked, shallow])
        expect(toRaw(box.value)[0]).toBe(plain)
        expect(toRaw(box.value)[1]).toBe(locked)
        expect(toRaw(box.value)[2]).toBe(shallow)
    })
})
