import { describe, test, expect, vi, afterEach } from "vitest"
import { createApp, defineComponent, h, nextTick, ref } from "vue"

// The generated slice Details, mounted against a stubbed slice: useDetails hands out the row and its load, and
// onAuthenticated hands the test the reload a token's arrival triggers. On a hard reload the mount fetch sends the stored
// token before the plugin has validated it, so the account the row belongs to is known only once it has.
const { auth, signIns, details } = vi.hoisted(() => ({ auth: {}, signIns: [], details: {} }))
vi.mock("@regira/modules/vue/auth", () => ({
    onAuthenticated: (callback) => signIns.push(callback),
    useAuth: () => auth,
    useGlobalAuth: () => auth,
}))
vi.mock("@regira/modules/vue/entities/details", () => ({ useDetails: () => details }))
vi.mock("@regira/modules/vue/entities/form", () => ({ FormStates: { pending: "pending" } }))
vi.mock("@regira/modules/vue/ui", async () => {
    const { defineComponent } = await import("vue")
    return {
        LoadingContainer: defineComponent({
            props: ["isLoading"],
            setup:
                (_, { slots }) =>
                () =>
                    slots.default?.(),
        }),
        Feedback: defineComponent({ setup: () => () => null }),
    }
})
vi.mock("vue-router", async () => {
    const { defineComponent } = await import("vue")
    const Form = defineComponent({ setup: () => () => null })
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
vi.mock("../../_template/entity-slice/data/store", () => ({ default: () => ({ service: {} }) }))
vi.mock("../../_template/entity-slice/config/config", () => ({ default: { key: "entity" } }))

const { default: Details } = await import("../../_template/entity-slice/details/Details.vue")

// what the auth plugin holds while a hard reload mounts the view: the stored token, not yet validated, so no account
function mountAfterReload(token, row, load = vi.fn()) {
    auth.tokenManager = { token }
    auth.authData = {}
    Object.assign(details, { item: ref(row), isLoading: ref(false), overviewUrl: undefined, load, feedback: ref() })
    createApp(defineComponent({ setup: () => () => h(Details) })).mount(document.createElement("div"))
    return load
}
function tokenArrives(token, userId) {
    auth.tokenManager.token = token
    auth.authData = { token, userId, isAuthenticated: true }
    signIns.forEach((reload) => reload())
}

describe("generated Details", () => {
    afterEach(() => {
        signIns.length = 0
    })

    test("a hard reload keeps the row once its stored token validates, and a refresh keeps it too", async () => {
        const row = { id: 1 }
        const load = mountAfterReload("stored", row)

        tokenArrives("stored", "A")
        tokenArrives("refreshed", "A")
        await nextTick()

        expect(details.item.value).toEqual(row)
        expect(load).not.toHaveBeenCalled()
    })

    test("another account's token clears the row before its own load", () => {
        let shownAtLoad = "not loaded"
        const load = mountAfterReload(
            "stored",
            { id: 1 },
            vi.fn(() => (shownAtLoad = details.item.value))
        )
        tokenArrives("stored", "A")

        tokenArrives("other", "B")

        expect(load).toHaveBeenCalledOnce()
        expect(shownAtLoad).toBeUndefined()
    })
})
