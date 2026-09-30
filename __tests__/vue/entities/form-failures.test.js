import { describe, test, expect, vi, afterEach } from "vitest"
import { createApp, defineComponent, h, reactive } from "vue"
import { createRouter, createMemoryHistory } from "vue-router"
import { useForm, FormStates } from "../../../src/vue/entities/form"
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

// `events` collects every emit as [name, arg]
function mountForm(props, save, { remove = async () => true, events = [] } = {}) {
    const entityService = {
        toEntity: (item) => Object.assign(new Model(), item),
        save,
        remove,
    }
    const router = createRouter({ history: createMemoryHistory(), routes: [{ path: "/", component: { render: () => null } }] })
    let form = null
    const app = createApp(
        defineComponent({
            setup() {
                form = useForm({ entityService, props, emit: (name, arg) => events.push([name, arg]) })
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

// A write emits `pending`, then one final state: a consumer keyed on changeState must not read a refused write as done.
describe("useForm state", () => {
    const states = (events) => events.filter(([name]) => name === "changeState").map(([, state]) => state)
    const names = (events) => events.map(([name]) => name)
    const saving = async (item) => ({ saved: item, isNew: false })

    test("a delete a validator refuses ends in error, not removed", async () => {
        vi.spyOn(console, "error").mockImplementation(() => {})
        const events = []
        const form = mountForm({ modelValue: new Model() }, saving, {
            remove: rejecting(400, { "": ["A shipped order cannot be deleted."] }),
            events,
        })

        await form().handleRemove()

        expect(states(events)).toEqual([FormStates.pending, FormStates.error])
        expect(names(events)).not.toContain("remove")
        expect(form().feedback.error).toEqual({ "": ["A shipped order cannot be deleted."] })
    })

    test("a delete refused with a 409 ends in error", async () => {
        vi.spyOn(console, "error").mockImplementation(() => {})
        const events = []
        const form = mountForm({ modelValue: new Model() }, saving, {
            remove: rejecting(409, { title: "Conflict", status: 409, detail: "A database constraint rejected the change." }),
            events,
        })

        await form().handleRemove()

        expect(states(events)).toEqual([FormStates.pending, FormStates.error])
    })

    test("a delete that succeeds ends in removed", async () => {
        const events = []
        const form = mountForm({ modelValue: new Model() }, saving, { events })

        await form().handleRemove()

        expect(states(events)).toEqual([FormStates.pending, FormStates.removed])
        expect(names(events)).toContain("remove")
    })

    test.each([
        ["handleSubmit", "save"],
        ["handleRestore", "restore"],
    ])("%s ends in saved when it succeeds and in error when it fails", async (handler, event) => {
        vi.spyOn(console, "error").mockImplementation(() => {})
        const succeeded = []
        const failed = []

        await mountForm({ modelValue: new Model() }, saving, { events: succeeded })()[handler]()
        await mountForm({ modelValue: new Model() }, rejecting(400, { Price: ["Price cannot be negative"] }), { events: failed })()[handler]()

        expect(states(succeeded)).toEqual([FormStates.pending, FormStates.saved])
        expect(states(failed)).toEqual([FormStates.pending, FormStates.error])
        expect(names(failed)).not.toContain(event)
    })

    test.each(["handleSubmit", "handleRemove", "handleRestore"])("%s ends in error when the rejection carries no reason", async (handler) => {
        vi.spyOn(console, "error").mockImplementation(() => {})
        const events = []
        const reasonless = () => Promise.reject()
        const form = mountForm({ modelValue: new Model() }, reasonless, { remove: reasonless, events })

        await form()[handler]()

        expect(states(events)).toEqual([FormStates.pending, FormStates.error])
        expect(form().feedback.status).toBe(FeedbackStatus.failed)
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
