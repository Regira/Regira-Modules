import { describe, test, expect, vi, afterEach } from "vitest"
import { FeedbackStatus } from "../../src/core/feedback/feedback"
import { FormStates } from "../../src/core/entities/form/form"
import { runOn } from "./drivers"

// An Entities API answers a rule breach (EntityInputException) and a model binding failure with a ProblemDetails that
// holds its field map in `errors`; a bare field map is read too. The form puts the map on feedback.error, and the server's own
// text on feedback.message when there is no field to point at. A write emits `pending`, then one final state.
class Model {
    constructor(id = 7, isArchived = false) {
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

const rejecting = (status, data) => async () => {
    throw Object.assign(new Error(`Request failed with status code ${status}`), { response: { status, data } })
}
const saving = async (item) => ({ saved: item, isNew: false })
const states = (events) => events.filter(([name]) => name === "changeState").map(([, state]) => state)
const names = (events) => events.map(([name]) => name)

let mounted = []
afterEach(() => {
    mounted.forEach((form) => form.unmount?.())
    mounted = []
    vi.restoreAllMocks()
})

runOn(["core", "vue"], "form", (driver) => {
    /** a form over `props`, saving with `save`; `events` collects every emit as [name, arg] */
    async function form(props, save, { remove = async () => true, events = [], toEntity = (item) => Object.assign(new Model(), item) } = {}) {
        const page = await driver.form({ service: { toEntity, save, remove }, props, events })
        mounted.push(page)
        return page
    }
    const quiet = () => vi.spyOn(console, "error").mockImplementation(() => {})

    describe("failure mapping", () => {
        test("a flat 400 field map reaches feedback.error, keys matching the model's fields", async () => {
            quiet()
            const { view } = await form({ modelValue: new Model() }, rejecting(400, { CategoryId: ["Category 99 does not exist"] }))

            await view.call("handleSubmit")

            expect(view.read("feedback.status")).toBe(FeedbackStatus.failed)
            expect(view.read("feedback.error")).toEqual({ categoryId: ["Category 99 does not exist"] })
        })

        test("a ProblemDetails 400 still yields its errors map", async () => {
            quiet()
            const body = { title: "One or more validation errors occurred.", status: 400, errors: { Price: ["Price cannot be negative"] } }
            const { view } = await form({ modelValue: new Model() }, rejecting(400, body))

            await view.call("handleSubmit")

            expect(view.read("feedback.error")).toEqual({ price: ["Price cannot be negative"] })
        })

        test("a 400 without field errors shows the server's detail", async () => {
            quiet()
            const body = { title: "Bad Request", status: 400, detail: "The price list is closed." }
            const { view } = await form({ modelValue: new Model() }, rejecting(400, body))

            await view.call("handleSubmit")

            expect(view.read("feedback.message")).toBe("Saving failed: The price list is closed.")
            expect(view.read("feedback.error")).toBeUndefined()
        })

        test("a 409 ProblemDetails shows its detail as a refused save", async () => {
            quiet()
            const body = { title: "Conflict", status: 409, detail: "A database constraint rejected the change." }
            const { view } = await form({ modelValue: new Model() }, rejecting(409, body))

            await view.call("handleSubmit")

            expect(view.read("feedback.message")).toBe("Saving failed: A database constraint rejected the change.")
        })

        test("a 403 is a refused save, a 5xx or a request without an answer a server error", async () => {
            quiet()
            const forbidden = await form({ modelValue: new Model() }, rejecting(403, { title: "Forbidden", status: 403, detail: "Not yours." }))
            const crashed = await form({ modelValue: new Model() }, rejecting(500, { title: "Internal Server Error", status: 500, detail: "Boom." }))
            const offline = await form({ modelValue: new Model() }, async () => {
                throw new Error("Network Error")
            })

            await forbidden.view.call("handleSubmit")
            await crashed.view.call("handleSubmit")
            await offline.view.call("handleSubmit")

            expect(forbidden.view.read("feedback.message")).toBe("Saving failed: Not yours.")
            expect(crashed.view.read("feedback.message")).toBe("Server error: Boom.")
            expect(offline.view.read("feedback.message")).toBe("Server error: Network Error")
        })

        test.each([
            ["handleSubmit", (refusal) => ({ save: refusal })],
            ["handleRemove", (refusal) => ({ save: saving, remove: refusal })],
        ])("%s on a 404 shows the item as not found, with the server's detail or plain message", async (handler, services) => {
            quiet()
            const detail = services(rejecting(404, { title: "Not Found", status: 404, detail: "Thing 7 is gone." }))
            const message = services(rejecting(404, { message: "No thing 7." }))
            const gone = await form({ modelValue: new Model() }, detail.save, { remove: detail.remove })
            const missing = await form({ modelValue: new Model() }, message.save, { remove: message.remove })

            await gone.view.call(handler)
            await missing.view.call(handler)

            expect(gone.view.read("feedback.message")).toBe("Item not found: Thing 7 is gone.")
            expect(missing.view.read("feedback.message")).toBe("Item not found: No thing 7.")
        })

        // only a 400 shows a field map: another status shows the server's text, whatever errors its body lists
        test("a 409 whose body lists errors still shows its detail", async () => {
            quiet()
            const body = { title: "Conflict", status: 409, detail: "Still referenced by 3 orders", errorDetails: [{ key: "", message: "InUse" }] }
            const { view } = await form({ modelValue: new Model() }, saving, { remove: rejecting(409, body) })

            await view.call("handleRemove")

            expect(view.read("feedback.message")).toBe("Deleting failed: Still referenced by 3 orders")
        })
    })

    // A consumer keyed on changeState must not read a refused write as done.
    describe("state", () => {
        test("a delete a validator refuses ends in error, not removed", async () => {
            quiet()
            const events = []
            const { view } = await form({ modelValue: new Model() }, saving, {
                remove: rejecting(400, { "": ["A shipped order cannot be deleted."] }),
                events,
            })

            await view.call("handleRemove")

            expect(states(events)).toEqual([FormStates.pending, FormStates.error])
            expect(names(events)).not.toContain("remove")
            expect(view.read("feedback.error")).toEqual({ "": ["A shipped order cannot be deleted."] })
        })

        test("a delete refused with a 409 ends in error", async () => {
            quiet()
            const events = []
            const remove = rejecting(409, { title: "Conflict", status: 409, detail: "A database constraint rejected the change." })
            const { view } = await form({ modelValue: new Model() }, saving, { remove, events })

            await view.call("handleRemove")

            expect(states(events)).toEqual([FormStates.pending, FormStates.error])
        })

        test("a delete that succeeds ends in removed", async () => {
            const events = []
            const { view } = await form({ modelValue: new Model() }, saving, { events })

            await view.call("handleRemove")

            expect(states(events)).toEqual([FormStates.pending, FormStates.removed])
            expect(names(events)).toContain("remove")
        })

        test.each([
            ["handleSubmit", "save"],
            ["handleRestore", "restore"],
        ])("%s ends in saved when it succeeds and in error when it fails", async (handler, event) => {
            quiet()
            const succeeded = []
            const failed = []

            await (await form({ modelValue: new Model() }, saving, { events: succeeded })).view.call(handler)
            await (
                await form({ modelValue: new Model() }, rejecting(400, { Price: ["Price cannot be negative"] }), { events: failed })
            ).view.call(handler)

            expect(states(succeeded)).toEqual([FormStates.pending, FormStates.saved])
            expect(states(failed)).toEqual([FormStates.pending, FormStates.error])
            expect(names(failed)).not.toContain(event)
        })

        test("a save sends its events in order, and hands the owner the saved item", async () => {
            const events = []
            const { view } = await form({ modelValue: new Model() }, saving, { events })

            await view.call("handleSubmit")

            expect(names(events)).toEqual(["changeState", "save", "update:modelValue", "changeState"])
            expect(events[2][1]).toBe(view.read("item"))
        })

        // the server took the write: a throw in what the form does with the result afterwards is no refusal of it, and the
        // handler still resolves, as `@submit.prevent="handleSubmit"` needs
        test.each(["handleSubmit", "handleRestore"])("%s ends in saved when the work after an accepted write throws", async (handler) => {
            const logged = quiet()
            const events = []
            // the result the server answered cannot be read back into the form
            let answered = false
            const save = async (item) => {
                answered = true
                return { saved: item, isNew: false }
            }
            const toEntity = (item) => {
                if (answered) {
                    throw new TypeError("unexpected payload")
                }
                return Object.assign(new Model(), item)
            }
            const { view } = await form({ modelValue: new Model() }, save, { events, toEntity })

            await expect(view.call(handler)).resolves.toBeUndefined()

            expect(states(events)).toEqual([FormStates.pending, FormStates.saved])
            expect(view.read("feedback.status")).toBe(FeedbackStatus.success)
            expect(logged).toHaveBeenCalled()
        })

        // in a dev build without an app errorHandler, Vue re-throws a listener's error out of emit
        test.each([
            ["handleSubmit", "save"],
            ["handleRestore", "restore"],
        ])("%s reports the accepted write when a %s listener throws", async (handler, event) => {
            quiet()
            const events = new Proxy([], {
                get: (target, name) =>
                    name === "push"
                        ? (entry) => {
                              target.push(entry)
                              if (entry[0] === event) {
                                  throw new Error("listener failed")
                              }
                          }
                        : Reflect.get(target, name),
            })
            const { view } = await form({ modelValue: new Model() }, saving, { events })

            await expect(view.call(handler)).resolves.toBeUndefined()

            expect(states(events)).toEqual([FormStates.pending, FormStates.saved])
            expect(view.read("feedback.status")).toBe(FeedbackStatus.success)
            expect(view.read("feedback.isPending")).toBe(false)
        })

        test.each(["handleSubmit", "handleRemove", "handleRestore"])("%s ends in error when the rejection carries no reason", async (handler) => {
            quiet()
            const events = []
            const reasonless = () => Promise.reject()
            const { view } = await form({ modelValue: new Model() }, reasonless, { remove: reasonless, events })

            await view.call(handler)

            expect(states(events)).toEqual([FormStates.pending, FormStates.error])
            expect(view.read("feedback.status")).toBe(FeedbackStatus.failed)
        })

        test("cancel goes back to the item as it was, every time", async () => {
            const events = []
            const page = await form({ modelValue: Object.assign(new Model(), { title: "Laptop" }) }, saving, { events })

            page.view.read("item").title = "Laptop Pro"
            page.view.call("handleCancel")
            page.view.read("item").title = "Laptop Max"
            page.view.call("handleCancel")

            expect(page.view.read("item").title).toBe("Laptop")
            expect(page.view.read("item") instanceof Model).toBe(true)
            expect(names(events)).toEqual(["cancel", "cancel"])
        })
    })

    // The form edits the item the owner handed it until a save or Cancel puts a copy in its place: a new modelValue
    // replaces it, and a save replaces it with what the server answered.
    describe("the item", () => {
        const titled = (id, title) => Object.assign(new Model(id), { title })
        const read = (view) => [view.read("item").$id, view.read("item").title]

        test("a new modelValue becomes the item, and Cancel goes back to it", async () => {
            const page = await form({ modelValue: titled(7, "Laptop") }, saving)

            await page.setProps({ modelValue: titled(8, "Mouse") }) // a reload passes the fresh row up
            expect(read(page.view)).toEqual([8, "Mouse"])

            page.view.read("item").title = "Mouse Pro"
            page.view.call("handleCancel")

            expect(read(page.view)).toEqual([8, "Mouse"])
        })

        test("after a save the form shows what the server answered, and Cancel goes back to that", async () => {
            const answering = async (item) => ({ saved: Object.assign(new Model(), item, { title: "Laptop Pro", version: 2 }), isNew: false })
            const page = await form({ modelValue: titled(7, "laptop pro") }, answering)

            await page.view.call("handleSubmit")
            expect([...read(page.view), page.view.read("item").version]).toEqual([7, "Laptop Pro", 2])

            page.view.read("item").title = "Laptop Max"
            page.view.call("handleCancel")

            expect(read(page.view)).toEqual([7, "Laptop Pro"])
            expect(page.view.read("item") instanceof Model).toBe(true)
        })
    })

    // `failure` keeps the status and ProblemDetails title of the last refused write, so a form tells a stale concurrency
    // token ("Concurrency conflict") from a database constraint ("Conflict") and offers a Reload for the first
    describe("failure", () => {
        const stale = { title: "Concurrency conflict", status: 409, detail: "The row changed since it was read." }

        test.each([
            ["handleSubmit", { save: rejecting(409, stale) }],
            ["handleRemove", { save: saving, remove: rejecting(409, stale) }],
            ["handleRestore", { save: rejecting(409, stale) }],
        ])("%s keeps the status and title of a refused write", async (handler, { save, remove }) => {
            quiet()
            const { view } = await form({ modelValue: new Model() }, save, { remove })

            expect(view.read("failure")).toBeUndefined()
            await view.call(handler)

            expect(view.read("failure")).toEqual({ status: 409, title: "Concurrency conflict" })
        })

        test("the next write clears it", async () => {
            quiet()
            let refuse = true
            const { view } = await form({ modelValue: new Model() }, async (item) => {
                if (refuse) {
                    await rejecting(409, stale)()
                }
                return { saved: item, isNew: false }
            })
            await view.call("handleSubmit")
            expect(view.read("failure")?.status).toBe(409)

            refuse = false
            await view.call("handleSubmit")

            expect(view.read("failure")).toBeUndefined()
        })

        test("a new modelValue clears it, as a reload passes the fresh row up", async () => {
            quiet()
            const page = await form({ modelValue: new Model() }, rejecting(409, stale))
            await page.view.call("handleSubmit")
            expect(page.view.read("failure")?.status).toBe(409)

            await page.setProps({ modelValue: new Model() })

            expect(page.view.read("failure")).toBeUndefined()
        })

        test("a failure without a response has no status", async () => {
            quiet()
            const { view } = await form({ modelValue: new Model() }, async () => {
                throw new Error("Network Error")
            })

            await view.call("handleSubmit")

            expect(view.read("failure")).toBeDefined()
            expect(view.read("failure").status).toBeUndefined()
        })
    })

    // A permission-gated form mounts before the stored token is restored, so `readonly` starts true and turns
    // false once access resolves; each handler answers to the prop as it is when it runs.
    describe("readonly", () => {
        test("a form unlocked after mount saves", async () => {
            const saved = []
            const page = await form({ modelValue: new Model(), readonly: true }, async (item) => (saved.push(item), { saved: item, isNew: false }))

            await page.setProps({ readonly: false })
            await page.view.call("handleSubmit")

            expect(saved).toHaveLength(1)
        })

        test("a form locked after mount refuses", async () => {
            const saved = []
            const page = await form({ modelValue: new Model(), readonly: false }, async (item) => (saved.push(item), { saved: item, isNew: false }))

            await page.setProps({ readonly: true })
            await page.view.call("handleSubmit")

            expect(saved).toHaveLength(0)
            expect(page.view.read("feedback.status")).toBe(FeedbackStatus.failed)
        })

        // `readonly` is the write gate the permission-gating pattern threads through a slice, so every write handler
        // has to answer to it: an archived row on a read-only form must not offer a working restore
        test("restore writes nothing on a readonly form", async () => {
            const saved = []
            const { view } = await form(
                { modelValue: new Model(7, true), readonly: true },
                async (item) => (saved.push(item), { saved: item, isNew: false })
            )

            await view.call("handleRestore")

            expect(saved).toHaveLength(0)
        })

        test("restore un-archives when the form is writable", async () => {
            const saved = []
            const { view } = await form(
                { modelValue: new Model(7, true), readonly: false },
                async (item) => (saved.push(item), { saved: item, isNew: false })
            )

            await view.call("handleRestore")

            expect(saved).toHaveLength(1)
            expect(saved[0].isArchived).toBe(false)
        })
    })

    // After an insert the form goes to the saved item (the Vue layer replaces `/new`); a popup stays where it is, and
    // so does an update.
    describe("after an insert", () => {
        const inserting = async (item) => ({ saved: Object.assign(new Model(), item, { id: 9 }), isNew: true })

        test("an insert goes to the saved item", async () => {
            const page = await form({ modelValue: new Model(0) }, inserting)

            await page.view.call("handleSubmit")

            expect(page.navigated.map((saved) => saved.$id)).toEqual([9])
        })

        test("a popup form and an update stay where they are", async () => {
            const popup = await form({ modelValue: new Model(0), isPopup: true }, inserting)
            const update = await form({ modelValue: new Model(7) }, saving)

            await popup.view.call("handleSubmit")
            await update.view.call("handleSubmit")

            expect(popup.navigated).toEqual([])
            expect(update.navigated).toEqual([])
        })
    })
})
