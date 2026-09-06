import { describe, test, expect } from "vitest"
import { createApp, defineComponent, h } from "vue"
import { createRouter, createMemoryHistory } from "vue-router"
import { useForm } from "../../../src/vue/entities/form"

// `readonly` is the write gate the permission-gating pattern threads through a slice, so every write handler
// has to answer to it. Restore was the one that did not: an archived row on a read-only form offered an
// enabled button that un-archived it.
class Model {
    constructor(id = 7, isArchived = true) {
        this.id = id
        this.isArchived = isArchived
    }
    get $id() {
        return this.id
    }
    get $title() {
        return "row"
    }
}

function mountForm(readonly) {
    const saved = []
    const entityService = {
        toEntity: (item) => Object.assign(new Model(), item),
        save: async (item) => {
            saved.push(item)
            return { saved: item, isNew: false }
        },
        remove: async () => true,
    }

    const router = createRouter({ history: createMemoryHistory(), routes: [{ path: "/", component: { render: () => null } }] })
    let form = null
    const app = createApp(
        defineComponent({
            setup() {
                form = useForm({ entityService, props: { modelValue: new Model(), readonly }, emit: () => {} })
                return () => h("div")
            },
        })
    )
    app.use(router)
    app.mount(document.createElement("div"))
    return { form: () => form, saved }
}

describe("useForm readonly", () => {
    test("handleRestore writes nothing on a readonly form", async () => {
        const { form, saved } = mountForm(true)

        await form().handleRestore()

        expect(saved).toHaveLength(0)
    })

    test("handleRestore un-archives when the form is writable", async () => {
        const { form, saved } = mountForm(false)

        await form().handleRestore()

        expect(saved).toHaveLength(1)
        expect(saved[0].isArchived).toBe(false)
    })
})
