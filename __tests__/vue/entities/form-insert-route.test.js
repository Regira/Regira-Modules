import { describe, test, expect, vi } from "vitest"
import { createApp, defineComponent, h } from "vue"
import { createRouter, createMemoryHistory } from "vue-router"
import { useForm } from "../../../src/vue/entities/form"

// After an insert, useForm replaces the `/new` route: with the new id by default, or with the route `afterInsertRoute`
// gives. A popup form stays where it is, and so does an update.
class Thing {
    constructor(id = 0) {
        this.id = id
    }
    get $id() {
        return this.id
    }
}

async function mountForm(props, { afterInsertRoute, saved = { saved: new Thing(7), isNew: true } } = {}) {
    const page = { render: () => null }
    const router = createRouter({
        history: createMemoryHistory(),
        routes: [
            { path: "/things", name: "things", component: page },
            { path: "/things/:id", name: "thing", component: page },
            { path: "/things/:id/conversation", name: "thingConversation", component: page },
        ],
    })
    await router.push("/things")
    await router.push("/things/new?src=overview#notes")
    const entityService = { toEntity: (item) => Object.assign(new Thing(), item), save: async () => saved }
    let form = null
    const app = createApp(
        defineComponent({
            setup() {
                form = useForm({ entityService, props, emit: () => {}, afterInsertRoute })
                return () => h("div")
            },
        })
    )
    app.use(router)
    app.mount(document.createElement("div"))
    return { form, router }
}

describe("useForm after an insert", () => {
    test("replaces /new with the new id, keeping the hash and dropping src", async () => {
        const { form, router } = await mountForm({ modelValue: new Thing() })

        await form.handleSubmit()

        await vi.waitFor(() => expect(router.currentRoute.value.fullPath).toBe("/things/7#notes"))
    })

    test("goes to the route afterInsertRoute gives, in place of /new", async () => {
        const afterInsertRoute = (saved) => ({ name: "thingConversation", params: { id: saved.$id } })
        const { form, router } = await mountForm({ modelValue: new Thing() }, { afterInsertRoute })

        await form.handleSubmit()

        await vi.waitFor(() => expect(router.currentRoute.value.fullPath).toBe("/things/7/conversation"))
        // replaced, not pushed: Back returns to the page that opened /new
        router.back()
        await vi.waitFor(() => expect(router.currentRoute.value.fullPath).toBe("/things"))
    })

    test("a popup form and an update stay where they are", async () => {
        const afterInsertRoute = vi.fn(() => ({ name: "things" }))
        const popup = await mountForm({ modelValue: new Thing(), isPopup: true }, { afterInsertRoute })
        const update = await mountForm({ modelValue: new Thing(7) }, { afterInsertRoute, saved: { saved: new Thing(7), isNew: false } })

        await popup.form.handleSubmit()
        await update.form.handleSubmit()
        await new Promise((resolve) => setTimeout(resolve))

        expect(afterInsertRoute).not.toHaveBeenCalled()
        expect(popup.router.currentRoute.value.path).toBe("/things/new")
        expect(update.router.currentRoute.value.path).toBe("/things/new")
    })
})
