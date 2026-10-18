import { describe, test, expect, vi, beforeEach, afterEach } from "vitest"
import { createApp, defineComponent, nextTick, reactive } from "vue"

// The generated attachments composable: a staged file is previewed through an object URL, which holds the file in memory
// until it is revoked. jsdom has no object URLs, so the test hands them out.
vi.mock("@regira/modules/utilities/file-utility", () => ({ browse: vi.fn(), fileToBlob: vi.fn(), saveAs: vi.fn() }))
vi.mock("@regira/modules/utilities/promise-utility", () => ({ enqueue: vi.fn() }))
vi.mock("@regira/modules/vue/http", () => ({ useAxios: vi.fn() }))
vi.mock("../../_template/entity-attachments/data/Entity", () => {
    class Link {
        static create(v) {
            return Object.assign(new Link(), v)
        }
    }
    return { default: Link }
})
vi.mock("../../_template/entity-attachments/attachments/Entity", () => ({ default: class {} }))

const { useEntityAttachments } = await import("../../_template/entity-attachments/data/functions")

function mount(props) {
    let attachments
    createApp(
        defineComponent({
            setup() {
                attachments = useEntityAttachments({ props, emit: () => {} })
                return () => null
            },
        })
    ).mount(document.createElement("div"))
    return attachments
}

describe("generated useEntityAttachments", () => {
    beforeEach(() => {
        let n = 0
        URL.createObjectURL = vi.fn(() => `blob:staged-${++n}`)
        URL.revokeObjectURL = vi.fn()
    })
    afterEach(() => {
        delete URL.createObjectURL
        delete URL.revokeObjectURL
    })

    test("rows re-mapped after a save revoke the staged previews they no longer show", async () => {
        const props = reactive({ modelValue: [] })
        const attachments = mount(props)
        attachments.handleBrowse([new Blob(["a"]), new Blob(["b"])])
        const [first, second] = attachments.items.value

        // the saved record comes back: the first file is stored, the second is still staged (its upload is retried)
        props.modelValue = [{ id: 7, uri: "https://api.test/files/7" }, { ...second }]
        await nextTick()

        expect(URL.revokeObjectURL).toHaveBeenCalledExactlyOnceWith(first.uri)
    })
})
