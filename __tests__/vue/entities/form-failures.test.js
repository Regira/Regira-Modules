import { describe, test, expect, vi, afterEach } from "vitest"
import { createApp, defineComponent, h, reactive } from "vue"
import { createRouter, createMemoryHistory } from "vue-router"
import { useForm } from "../../../src/vue/entities/form"
import { FeedbackStatus, toFeedbackError } from "../../../src/vue/ui/feedback"

// An Entities API answers a rule breach (EntityInputException) with a flat field map and model binding with a
// ProblemDetails that wraps its map in `errors`. The form puts either map on feedback.error, and the server's own
// text on feedback.message when there is no field to point at.
class Model {
    constructor(id = 7) {
        this.id = id
    }
    get $id() {
        return this.id
    }
    get $title() {
        return "row"
    }
}

function mountForm(props, save) {
    const entityService = {
        toEntity: (item) => Object.assign(new Model(), item),
        save,
        remove: async () => true,
    }
    const router = createRouter({ history: createMemoryHistory(), routes: [{ path: "/", component: { render: () => null } }] })
    let form = null
    const app = createApp(
        defineComponent({
            setup() {
                form = useForm({ entityService, props, emit: () => {} })
                return () => h("div")
            },
        })
    )
    app.use(router)
    app.mount(document.createElement("div"))
    return () => form
}

const rejecting = (status, data) => async () => {
    throw Object.assign(new Error(`Request failed with status code ${status}`), { response: { status, data } })
}

afterEach(() => vi.restoreAllMocks())

describe("useForm failure mapping", () => {
    test("a flat 400 field map reaches feedback.error, keys matching the model's fields", async () => {
        vi.spyOn(console, "error").mockImplementation(() => {})
        const form = mountForm({ modelValue: new Model() }, rejecting(400, { CategoryId: ["Category 99 does not exist"] }))

        await form().handleSubmit()

        expect(form().feedback.status).toBe(FeedbackStatus.failed)
        expect(form().feedback.error).toEqual({ categoryId: ["Category 99 does not exist"] })
    })

    test("a ProblemDetails 400 still yields its errors map", async () => {
        vi.spyOn(console, "error").mockImplementation(() => {})
        const body = { title: "One or more validation errors occurred.", status: 400, errors: { Price: ["Price cannot be negative"] } }
        const form = mountForm({ modelValue: new Model() }, rejecting(400, body))

        await form().handleSubmit()

        expect(form().feedback.error).toEqual({ price: ["Price cannot be negative"] })
    })

    test("a 400 without field errors shows the server's detail", async () => {
        vi.spyOn(console, "error").mockImplementation(() => {})
        const body = { title: "Bad Request", status: 400, detail: "The price list is closed." }
        const form = mountForm({ modelValue: new Model() }, rejecting(400, body))

        await form().handleSubmit()

        expect(form().feedback.message).toBe("Saving failed: The price list is closed.")
        expect(form().feedback.error).toBeUndefined()
    })

    test("a 409 ProblemDetails shows its detail", async () => {
        vi.spyOn(console, "error").mockImplementation(() => {})
        const body = { title: "Conflict", status: 409, detail: "A database constraint rejected the change." }
        const form = mountForm({ modelValue: new Model() }, rejecting(409, body))

        await form().handleSubmit()

        expect(form().feedback.message).toBe("Server error: A database constraint rejected the change.")
    })
})

describe("useForm readonly follows the props", () => {
    // A permission-gated form mounts before the stored token is restored, so `readonly` starts true and turns
    // false once access resolves; each handler answers to the prop as it is when it runs.
    test("a form unlocked after mount saves", async () => {
        const saved = []
        const props = reactive({ modelValue: new Model(), readonly: true })
        const form = mountForm(props, async (item) => {
            saved.push(item)
            return { saved: item, isNew: false }
        })

        props.readonly = false
        await form().handleSubmit()

        expect(saved).toHaveLength(1)
    })

    test("a form locked after mount refuses", async () => {
        const saved = []
        const props = reactive({ modelValue: new Model(), readonly: false })
        const form = mountForm(props, async (item) => {
            saved.push(item)
            return { saved: item, isNew: false }
        })

        props.readonly = true
        await form().handleSubmit()

        expect(saved).toHaveLength(0)
        expect(form().feedback.status).toBe(FeedbackStatus.failed)
    })
})

describe("toFeedbackError", () => {
    test("reads the server's message from a body without field errors", () => {
        expect(toFeedbackError({ response: { status: 404, data: { message: "Not found" } } })).toBe("Not found")
    })

    test("does not take a 400 body of plain strings for field errors", () => {
        expect(toFeedbackError({ response: { status: 400, data: { message: "Bad input" } } })).toBe("Bad input")
    })

    test("ignores a ProblemDetails without errors", () => {
        expect(toFeedbackError({ response: { status: 400, data: { title: "Bad Request", status: 400 } } })).toBeUndefined()
    })

    test("keeps the empty key of an error that belongs to no field", () => {
        expect(toFeedbackError({ response: { status: 400, data: { "": ["Credits must be positive."] } } })).toEqual({
            "": ["Credits must be positive."],
        })
    })

    test("reads a plain-text 400 body as the server's message", () => {
        expect(toFeedbackError({ response: { status: 400, data: "Name taken" } })).toBe("Name taken")
    })

    test("ignores a plain-text body on another status, such as an error page", () => {
        expect(toFeedbackError({ response: { status: 500, data: "<html>…</html>" } })).toBeUndefined()
    })

    test("falls through an empty detail to the message", () => {
        expect(toFeedbackError({ response: { status: 409, data: { detail: "", message: "Still referenced" } } })).toBe("Still referenced")
    })

    test("answers undefined for a network failure", () => {
        expect(toFeedbackError(new Error("Network Error"))).toBeUndefined()
    })
})
