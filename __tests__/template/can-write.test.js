import { describe, test, expect, vi, afterEach } from "vitest"
import { createApp, defineComponent, h, nextTick, ref } from "vue"

// The generated Overview and Details, mounted against a stubbed slice whose config carries (or lacks) canWrite: the
// gate the Permission-gated UI recipe sets per slice. The stubs record the readonly the views hand down.
const { cfg, rendered } = vi.hoisted(() => ({ cfg: { key: "entity", isComplex: true, defaultPageSize: 10 }, rendered: {} }))
vi.mock("@regira/modules/vue/auth", () => ({ onAuthenticated: () => {}, useAuth: () => ({}), useGlobalAuth: () => ({}) }))
vi.mock("@regira/modules/vue/debug", async () => {
    const { defineComponent } = await import("vue")
    return { Debug: defineComponent({ setup: () => () => null }) }
})
vi.mock("@regira/modules/vue/ui", async () => {
    const { defineComponent } = await import("vue")
    const pass = defineComponent({
        setup:
            (_, { slots }) =>
            () =>
                slots.default?.(),
    })
    const none = defineComponent({ setup: () => () => null })
    return { LoadingContainer: pass, Feedback: none, Icon: none, Paging: none, ResultSummary: none }
})
vi.mock("@regira/modules/vue/entities", async () => {
    const { ref } = await import("vue")
    return {
        useSearchView: () => ({
            searchObject: ref({}),
            pagingInfo: ref(),
            items: ref([{ id: 1 }]),
            itemsCount: ref(1),
            isLoading: ref(false),
            feedback: ref(),
            applySave: () => {},
            applyRemove: () => {},
            handleSave: () => {},
            handleRemove: () => {},
            searchHandler: () => {},
        }),
        useRouteOverview: () => ({ updateOverviewRoute: () => {} }),
    }
})
vi.mock("@regira/modules/vue/entities/details", async () => {
    const { ref } = await import("vue")
    return { useDetails: () => ({ item: ref({ id: 1 }), isLoading: ref(false), overviewUrl: undefined, load: () => {}, feedback: ref() }) }
})
vi.mock("@regira/modules/vue/entities/form", () => ({ FormStates: { pending: "pending" } }))
vi.mock("vue-router", async () => {
    const { defineComponent } = await import("vue")
    const Form = defineComponent({
        props: ["readonly"],
        setup: (props) => () => ((rendered.form = props.readonly), null),
    })
    return {
        RouterView: defineComponent({
            setup:
                (_, { slots }) =>
                () =>
                    slots.default?.({ Component: Form }),
        }),
        useRouter: () => ({ push: () => {} }),
    }
})
vi.mock("../../_template/entity-slice/config/config", () => ({ default: cfg }))
vi.mock("../../_template/entity-slice/data/store", () => ({ default: () => ({ service: {} }) }))
vi.mock("../../_template/entity-slice/data/Entity", () => ({ default: class {} }))
vi.mock("../../_template/entity-slice/filter/SearchObject", () => ({ default: class {} }))
vi.mock("../../_template/entity-slice/filter/Filter.vue", async () => {
    const { defineComponent } = await import("vue")
    return { default: defineComponent({ setup: () => () => null }) }
})
vi.mock("../../_template/entity-slice/filter/FilterAdv.vue", async () => {
    const { defineComponent } = await import("vue")
    return { default: defineComponent({ setup: () => () => null }) }
})
vi.mock("../../_template/entity-slice/details/FormModalButton.vue", async () => {
    const { defineComponent } = await import("vue")
    return { default: defineComponent({ setup: () => () => null }) }
})
vi.mock("../../_template/entity-slice/overview/List.vue", async () => {
    const { defineComponent } = await import("vue")
    return {
        default: defineComponent({
            props: ["readonly", "modelValue"],
            setup: (props) => () => ((rendered.list = props.readonly), null),
        }),
    }
})

const { default: Overview } = await import("../../_template/entity-slice/overview/Overview.vue")
const { default: Details } = await import("../../_template/entity-slice/details/Details.vue")

const RouterLink = defineComponent({ setup: () => () => h("a", { class: "new-link" }) })
function mount(component) {
    const root = document.createElement("div")
    const app = createApp(defineComponent({ setup: () => () => h(component) }))
    app.component("RouterLink", RouterLink)
    app.config.globalProperties.$t = (key) => key
    app.mount(root)
    return root
}

describe("generated slice — config.canWrite", () => {
    afterEach(() => {
        delete cfg.canWrite
        for (const key of Object.keys(rendered)) delete rendered[key]
    })

    test("without canWrite everyone writes: a New button, editable rows and an editable form", () => {
        const overview = mount(Overview)
        mount(Details)

        expect(overview.querySelector(".new-link")).not.toBeNull()
        expect(rendered.list).toBe(false)
        expect(rendered.form).toBe(false)
    })

    test("canWrite answering false drops New and hands readonly to the rows and the form", () => {
        cfg.canWrite = () => false
        const overview = mount(Overview)
        mount(Details)

        expect(overview.querySelector(".new-link")).toBeNull()
        expect(rendered.list).toBe(true)
        expect(rendered.form).toBe(true)
    })

    test("follows a change in what canWrite reads, such as a sign-in", async () => {
        const allowed = ref(false)
        cfg.canWrite = () => allowed.value
        const overview = mount(Overview)
        mount(Details)

        allowed.value = true
        await nextTick()

        expect(overview.querySelector(".new-link")).not.toBeNull()
        expect(rendered.list).toBe(false)
        expect(rendered.form).toBe(false)
    })
})
