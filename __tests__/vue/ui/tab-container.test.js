import { describe, test, expect } from "vitest"
import { createApp, defineComponent, h, nextTick, ref } from "vue"
import { createRouter, createMemoryHistory } from "vue-router"

import TabContainer from "../../../src/vue/ui/tabs/TabContainer.vue"
import { Tab } from "../../../src/vue/ui/tabs/Tab"

// A form that swaps to its tabbed layout once an insert is saved mounts TabContainer in the same tick as
// useForm's `router.replace` to the new id — mounting must leave that pending navigation alone.
async function setup(url, { active, tabs = ["form", "notes"], useRouteNav = true } = {}) {
    const router = createRouter({
        history: createMemoryHistory(),
        routes: [{ path: "/tickets/:id/edit", name: "ticketDetails", component: { render: () => null } }],
    })
    router.push(url)
    await router.isReady()

    const showTabs = ref(false)
    const tabList = ref(tabs)
    const selected = []
    const host = document.createElement("div")
    createApp(
        defineComponent({
            setup: () => () =>
                showTabs.value
                    ? h(
                          TabContainer,
                          { tabs: tabList.value, active, useRouteNav, onSelect: (tab) => selected.push(tab) },
                          { form: () => "FORM-BODY", notes: () => "NOTES-BODY" }
                      )
                    : null,
        })
    )
        .use(router)
        .mount(host)
    return { router, showTabs, tabList, selected, host }
}

const settle = () => new Promise((resolve) => setTimeout(resolve))

describe("TabContainer with useRouteNav", () => {
    test("mounting during a pending navigation lets it complete", async () => {
        const { router, showTabs } = await setup("/tickets/new/edit")

        const pending = router.replace({ name: "ticketDetails", params: { id: 42 } }) // what useForm does after an insert
        showTabs.value = true
        await nextTick()
        const failure = await pending
        await settle()

        expect(failure).toBeUndefined()
        expect(router.currentRoute.value.fullPath).toBe("/tickets/42/edit")
    })

    test("the tab comes from the hash, and the first select writes it", async () => {
        const { router, showTabs, selected, host } = await setup("/tickets/42/edit#notes")

        showTabs.value = true
        await nextTick()
        expect(selected).toEqual(["notes"])
        expect(host.textContent).toContain("NOTES-BODY")

        host.querySelector("a, button, [role=tab]")?.click()
        await settle()
        expect(router.currentRoute.value.hash).toBe("#form")
    })

    test("after Back, clicking the tab that was selected before selects it again", async () => {
        const { router, showTabs, host } = await setup("/tickets/42/edit")
        showTabs.value = true
        await nextTick()
        const [formLink, notesLink] = host.querySelectorAll("a")

        notesLink.click()
        await settle()
        expect(router.currentRoute.value.hash).toBe("#notes")

        router.back()
        await settle()
        expect(host.textContent).toContain("FORM-BODY")

        notesLink.click()
        await settle()
        expect(router.currentRoute.value.hash).toBe("#notes")
        expect(host.textContent).toContain("NOTES-BODY")
        expect(formLink).toBeTruthy()
    })

    test("without a hash the default tab shows and the URL is left alone", async () => {
        const { router, showTabs, selected, host } = await setup("/tickets/42/edit")

        showTabs.value = true
        await nextTick()
        await settle()

        expect(selected).toEqual(["form"])
        expect(host.textContent).toContain("FORM-BODY")
        expect(router.currentRoute.value.hash).toBe("")
    })

    test("without a hash the active tab shows, and Back to that URL shows it again", async () => {
        const { router, showTabs, selected, host } = await setup("/tickets/42/edit", { active: "notes" })

        showTabs.value = true
        await nextTick()
        await settle()
        expect(selected).toEqual(["notes"])
        expect(host.textContent).toContain("NOTES-BODY")
        expect(router.currentRoute.value.hash).toBe("")

        const [formLink] = host.querySelectorAll("a")
        formLink.click()
        await settle()
        expect(router.currentRoute.value.hash).toBe("#form")
        expect(host.textContent).toContain("FORM-BODY")

        router.back()
        await settle()
        expect(router.currentRoute.value.hash).toBe("")
        expect(host.textContent).toContain("NOTES-BODY")
        expect(selected).toEqual(["notes", "form", "notes"])

        formLink.click()
        await settle()
        expect(router.currentRoute.value.hash).toBe("#form")
    })

    test("a hash wins over the active tab", async () => {
        const { router, showTabs, selected, host } = await setup("/tickets/42/edit#form", { active: "notes" })

        showTabs.value = true
        await nextTick()
        await settle()

        expect(selected).toEqual(["form"])
        expect(host.textContent).toContain("FORM-BODY")
        expect(host.textContent).not.toContain("NOTES-BODY")
        expect(router.currentRoute.value.hash).toBe("#form")
    })
})

describe("TabContainer tab availability", () => {
    const formAndNotes = (notes) => [Tab.create("form", { isDefault: true }), Tab.create("notes", notes)]

    test("an active tab that is disabled or hidden falls back to the default tab", async () => {
        for (const notes of [{ isDisabled: true }, { isVisible: false }, { isVisible: () => false }]) {
            const { showTabs, selected, host } = await setup("/tickets/42/edit", { active: "notes", tabs: formAndNotes(notes) })

            showTabs.value = true
            await nextTick()

            expect(selected).toEqual(["form"])
            expect(host.textContent).toContain("FORM-BODY")
            expect(host.textContent).not.toContain("NOTES-BODY")
        }
    })

    test("a hash naming an unavailable or unknown tab falls back to active, then the default", async () => {
        const disabled = await setup("/tickets/42/edit#notes", { tabs: formAndNotes({ isDisabled: true }) })
        disabled.showTabs.value = true
        await nextTick()
        expect(disabled.host.textContent).toContain("FORM-BODY")

        const unknown = await setup("/tickets/42/edit#history", { active: "notes" })
        unknown.showTabs.value = true
        await nextTick()
        expect(unknown.selected).toEqual(["notes"])
        expect(unknown.host.textContent).toContain("NOTES-BODY")
    })

    test("a disabled tab named by the hash shows once it is enabled", async () => {
        const { router, showTabs, tabList, selected, host } = await setup("/tickets/42/edit#notes", {
            tabs: formAndNotes({ isDisabled: true }),
        })
        showTabs.value = true
        await nextTick()
        expect(host.textContent).toContain("FORM-BODY")

        tabList.value = formAndNotes({ isDisabled: false })
        await settle()

        expect(host.textContent).toContain("NOTES-BODY")
        expect(selected).toEqual(["form", "notes"])
        expect(router.currentRoute.value.hash).toBe("#notes")
    })

    test("clicking a disabled tab does nothing", async () => {
        const { router, showTabs, selected, host } = await setup("/tickets/42/edit", { tabs: formAndNotes({ isDisabled: true }) })
        showTabs.value = true
        await nextTick()

        host.querySelectorAll("a")[1].click()
        await settle()

        expect(router.currentRoute.value.hash).toBe("")
        expect(selected).toEqual(["form"])
        expect(host.textContent).toContain("FORM-BODY")
    })
})

describe("TabContainer without useRouteNav", () => {
    test("shows the active tab, switches on a click and never touches the URL", async () => {
        const { router, showTabs, selected, host } = await setup("/tickets/42/edit#form", { active: "notes", useRouteNav: false })

        showTabs.value = true
        await nextTick()
        expect(selected).toEqual(["notes"])
        expect(host.textContent).toContain("NOTES-BODY")

        host.querySelectorAll("a")[0].click()
        await settle()

        expect(selected).toEqual(["notes", "form"])
        expect(host.textContent).toContain("FORM-BODY")
        expect(router.currentRoute.value.fullPath).toBe("/tickets/42/edit#form")
    })

    test("a selection that turns unavailable falls back to active", async () => {
        const tabs = (files) => [Tab.create("form", { isDefault: true }), Tab.create("notes"), Tab.create("files", files)]
        const { showTabs, tabList, selected, host } = await setup("/tickets/42/edit", { active: "notes", tabs: tabs(), useRouteNav: false })
        showTabs.value = true
        await nextTick()

        host.querySelectorAll("a")[2].click()
        await settle()
        expect(host.textContent).not.toContain("NOTES-BODY")

        tabList.value = tabs({ isDisabled: true })
        await settle()

        expect(host.textContent).toContain("NOTES-BODY")
        expect(selected).toEqual(["notes", "files", "notes"])
    })
})
