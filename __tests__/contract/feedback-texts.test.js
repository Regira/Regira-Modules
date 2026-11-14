import { describe, test, expect, vi, afterEach } from "vitest"
import { feedbackTexts } from "../../src/core/entities/feedback-texts"
import { setErrorTranslator } from "../../src/core/feedback/errors"
import { useLang } from "../../src/vue/lang/useLang"
import { runOn } from "./drivers"
import { deferredService } from "./services"

// The entity views' own feedback texts are keys an app translates, in its useLang messages or through its
// setErrorTranslator. An app's translations name them by their English text, so a changed text fails here first.
describe("feedback texts", () => {
    test("the keys an app translates", () => {
        expect(Object.values(feedbackTexts)).toEqual([
            "Readonly",
            "Saving...",
            "Saved",
            "Saving failed",
            "Item not found",
            "Server error",
            "Deleting...",
            "Deleted",
            "Deleting failed",
            "Restoring...",
            "Restored",
            "Restoring failed",
            "fetching data failed",
            "Saved {title}",
            "Saving {title} failed",
            "Removing {title} failed",
            "Fetching item #{id} failed",
            "Fetching {title} failed",
            "Not allowed",
            "Not found",
        ])
    })
})

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
const rejecting = (status, data) => async () => {
    throw Object.assign(new Error(`Request failed with status code ${status}`), { response: { status, data } })
}
const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

// a translator that knows every key, in Dutch, filling `{name}` from its args
const dutch = {
    Saved: "Opgeslagen",
    "Server error": "Serverfout",
    "Saving {title} failed": "{title} opslaan mislukt",
    "Fetching item #{id} failed": "Item #{id} ophalen mislukt",
    "Not allowed": "Niet toegestaan",
}
const translator = (key, args) => dutch[key]?.replace(/\{(\w+)\}/g, (_, name) => String(args[name]))

let mounted = []
afterEach(() => {
    mounted.forEach((page) => page.unmount?.())
    mounted = []
    setErrorTranslator(undefined)
    vi.restoreAllMocks()
})

runOn(["core", "vue"], "feedback texts", (driver) => {
    const quiet = () => vi.spyOn(console, "error").mockImplementation(() => {})
    async function form(save) {
        const page = await driver.form({
            service: { toEntity: (item) => Object.assign(new Model(), item), save, remove: async () => true },
            props: { modelValue: new Model() },
            events: [],
        })
        mounted.push(page)
        return page
    }

    test("without a translation the English text shows", async () => {
        const { view } = await form(async (item) => ({ saved: item, isNew: false }))

        await view.call("handleSubmit")

        expect(view.read("feedback.message")).toBe("Saved")
    })

    test("the form's texts pass through the translator", async () => {
        setErrorTranslator(translator)
        quiet()
        const saved = await form(async (item) => ({ saved: item, isNew: false }))
        const crashed = await form(rejecting(500, { detail: "Boom." }))

        await saved.view.call("handleSubmit")
        await crashed.view.call("handleSubmit")

        expect(saved.view.read("feedback.message")).toBe("Opgeslagen")
        expect(crashed.view.read("feedback.message")).toBe("Serverfout: Boom.")
    })

    test("the overview's texts get the row's title as an argument", async () => {
        setErrorTranslator(translator)
        quiet()
        const service = deferredService("save")
        const view = driver.searchView({ service, searchObject: {} })

        const save = view.call("applySave", { $id: "1", $title: "chair" })
        service.rejectWith(0, { response: { status: 500, data: {} } })
        await driver.settle(save)

        expect(view.read("feedback.message")).toBe("chair opslaan mislukt")
    })

    test("the details page's texts get the id as an argument", async () => {
        setErrorTranslator(translator)
        quiet()
        const page = await driver.details({
            service: { details: async () => Promise.reject({ response: { status: 403 } }), newEntity: async () => ({ id: 0 }) },
            id: "7",
        })
        mounted.push(page)
        await flush()

        expect(page.view.read("feedback.message")).toBe("Item #7 ophalen mislukt: Niet toegestaan")
    })
})

runOn(["vue"], "feedback texts in useLang", (driver) => {
    test("a Vue app translates them in its useLang messages", async () => {
        const { loadMessages, replaceMessages, setLangCode, langCode, messages } = useLang()
        const [previousLang, previousMessages] = [langCode.value, messages.value]
        loadMessages({ Saved: { en: "Saved", nl: "Opgeslagen" } })
        setLangCode("nl")
        try {
            const page = await driver.form({
                service: { toEntity: (item) => Object.assign(new Model(), item), save: async (item) => ({ saved: item, isNew: false }) },
                props: { modelValue: new Model() },
                events: [],
            })
            mounted.push(page)

            await page.view.call("handleSubmit")

            expect(page.view.read("feedback.message")).toBe("Opgeslagen")
        } finally {
            replaceMessages(previousMessages)
            setLangCode(previousLang)
        }
    })
})
