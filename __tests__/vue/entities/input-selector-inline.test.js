import { describe, test, expect } from "vitest"
import { createApp, defineComponent, h, nextTick, reactive, ref } from "vue"
import InputSelectorInline from "../../../src/vue/entities/form/InputSelectorInline.vue"

function mount(rowsRef, extraProps = {}) {
    const host = document.createElement("div")
    document.body.appendChild(host)
    let slotScope = null
    const app = createApp(
        defineComponent({
            setup() {
                return () =>
                    h(
                        InputSelectorInline,
                        {
                            modelValue: rowsRef.value,
                            "onUpdate:modelValue": (v) => (rowsRef.value = v),
                            excludeKey: (row) => row.facetId,
                            ...extraProps,
                        },
                        {
                            chip: ({ row }) => h("span", { class: "chip-label" }, row.title),
                            selector: (scope) => {
                                slotScope = scope
                                return h("span", { class: "selector-slot" })
                            },
                        }
                    )
            },
        })
    )
    app.mount(host)
    return { app, host, getSlotScope: () => slotScope }
}

describe("InputSelectorInline", () => {
    test("removing a PERSISTED row marks _deleted (undoable) — it never splices the row", async () => {
        const rows = ref(reactive([{ facetId: 1, title: "Red" }, { facetId: 2, title: "Blue" }]))
        const { host } = mount(rows)

        const buttons = host.querySelectorAll("button")
        buttons[0].click()
        await nextTick()

        expect(rows.value.length).toBe(2) // still present
        expect(rows.value[0]._deleted).toBe(true)
        expect(host.querySelector(".is-deleted")).toBeTruthy()

        buttons[0].click() // toggle = restore
        await nextTick()
        expect(rows.value[0]._deleted).toBe(false)
        expect(host.querySelector(".is-deleted")).toBeFalsy()
    })

    test("exclude covers every row (marked ones included) and add() appends via the slot", async () => {
        const rows = ref(reactive([{ facetId: 1, title: "Red", _deleted: true }]))
        const { getSlotScope } = mount(rows)

        expect(getSlotScope().exclude).toEqual([1]) // marked row still excluded from the picker

        getSlotScope().add({ facetId: 3, title: "Green" })
        await nextTick()
        expect(rows.value.length).toBe(2)
        expect(rows.value[1].facetId).toBe(3)
        expect(getSlotScope().exclude).toEqual([1, 3])
    })

    // The parent binds a deep-reactive collection, so the row read back out of modelValue is a PROXY of
    // the object handed to add() — session tracking must compare raw identity or this silently falls back
    // to _deleted-marking (the pre-toRaw bug).
    test("removing a row added THIS SESSION splices it — no _deleted mark", async () => {
        const rows = ref(reactive([{ facetId: 1, title: "Red" }]))
        const { host, getSlotScope } = mount(rows)

        getSlotScope().add({ facetId: 3, title: "Green" })
        await nextTick()
        expect(rows.value.length).toBe(2)

        host.querySelectorAll("button")[1].click() // remove the just-added chip
        await nextTick()

        expect(rows.value.length).toBe(1) // spliced, not marked
        expect(rows.value[0].facetId).toBe(1) // the persisted row is untouched
        expect(rows.value.some((x) => x.facetId === 3)).toBe(false)
        expect(host.querySelector(".is-deleted")).toBeFalsy()
        expect(getSlotScope().exclude).toEqual([1]) // and it is re-pickable again
    })

    test("a positive numeric id overrides session tracking — an added-then-persisted row marks instead", async () => {
        const rows = ref(reactive([]))
        const { host, getSlotScope } = mount(rows)

        getSlotScope().add({ id: 42, facetId: 3, title: "Green" }) // already has a server id
        await nextTick()

        host.querySelectorAll("button")[0].click()
        await nextTick()

        expect(rows.value.length).toBe(1) // kept, marked — the server must be told to delete it
        expect(rows.value[0]._deleted).toBe(true)
    })

    test("isNew overrides the default detection", async () => {
        const rows = ref(reactive([{ facetId: 1, title: "Red" }]))
        const { host } = mount(rows, { isNew: () => true }) // caller declares every row unsaved

        host.querySelectorAll("button")[0].click()
        await nextTick()

        expect(rows.value.length).toBe(0) // spliced despite never going through add()
    })
})
