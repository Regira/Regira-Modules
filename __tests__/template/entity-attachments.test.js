import { describe, test, expect, vi, beforeEach, afterEach } from "vitest"
import { createApp, defineComponent, nextTick, reactive } from "vue"
import { readdirSync, readFileSync } from "fs"
import { dirname, join, resolve } from "path"
import { fileURLToPath } from "url"

const templateRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../_template")

// The generated attachments composable: a staged file is previewed through an object URL, which holds the file in memory
// until it is revoked. jsdom has no object URLs, so the test hands them out.
vi.mock("@regira/modules/utilities/file-utility", () => ({ browse: vi.fn(), fileToBlob: vi.fn(), saveAs: vi.fn() }))
vi.mock("@regira/modules/utilities/promise-utility", () => ({ enqueue: vi.fn() }))
vi.mock("@regira/modules/vue/http", () => ({ useAxios: vi.fn() }))
vi.mock("../../_template/entity-attachments/data/Entity", () => {
    class Link {
        // the model reads and writes the file name on its attachment
        get fileName() {
            return this.attachment?.fileName
        }
        set fileName(v) {
            ;(this.attachment ??= {}).fileName = v
        }
        static create(v) {
            return Object.assign(new Link(), v)
        }
    }
    return { default: Link }
})
vi.mock("../../_template/entity-attachments/attachments/Entity", () => ({ default: class {} }))

const { useEntityAttachments } = await import("../../_template/entity-attachments/data/functions")

function mount(props, emit = () => {}) {
    let attachments
    createApp(
        defineComponent({
            setup() {
                attachments = useEntityAttachments({ props, emit })
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

    test("replacing a stored file stages it in place and takes its name", () => {
        const emit = vi.fn()
        const attachments = mount(
            reactive({ modelValue: [{ id: 7, uri: "https://api.test/files/7", attachment: { fileName: "a.jpg" } }, { id: 8 }] }),
            emit
        )
        const [row] = attachments.items.value
        const file = Object.assign(new Blob(["png"], { type: "image/png" }), { name: "b.png" })

        attachments.handleReplace(row, file)

        expect(attachments.items.value[0]).toBe(row)
        expect(row).toMatchObject({ id: 7, newFileName: "b.png", uri: "blob:staged-1", sortOrder: 0 })
        expect(row.attachment).toMatchObject({ _file: file, fileName: "b.png", contentType: "image/png", length: 3 })
        expect(emit).toHaveBeenCalledWith("update:modelValue", attachments.items.value)
    })

    test("a replaced file of a staged row revokes the preview it replaces", () => {
        const attachments = mount(reactive({ modelValue: [] }))
        attachments.handleBrowse([new Blob(["a"])])
        const [row] = attachments.items.value

        attachments.handleReplace(row, new Blob(["b"]))

        expect(URL.revokeObjectURL).toHaveBeenCalledExactlyOnceWith("blob:staged-1")
        expect(row.uri).toBe("blob:staged-2")
        expect(row.newFileName).toBeUndefined()
    })

    test("a replacement without a name keeps the stored row's name", () => {
        const attachments = mount(reactive({ modelValue: [{ id: 7, newFileName: "front.jpg", attachment: { fileName: "a.jpg" } }] }))
        const [row] = attachments.items.value

        attachments.handleReplace(row, new Blob(["b"]))

        expect(row.newFileName).toBe("front.jpg")
        expect(row.attachment.fileName).toBe("front.jpg")
    })

    test("a replacement without a name falls back to the stored file name", () => {
        const attachments = mount(reactive({ modelValue: [{ id: 7, attachment: { fileName: "a.jpg" } }] }))
        const [row] = attachments.items.value

        attachments.handleReplace(row, new Blob(["b"]))

        expect(row.newFileName).toBe("a.jpg")
        expect(row.attachment.fileName).toBe("a.jpg")
    })

    test("a replacement without a name keeps an unsaved row's name", () => {
        const attachments = mount(reactive({ modelValue: [] }))
        attachments.handleBrowse([Object.assign(new Blob(["a"]), { name: "a.pdf" })])
        const [row] = attachments.items.value

        attachments.handleReplace(row, new Blob(["b"]))

        expect(row.attachment.fileName).toBe("a.pdf")
        expect(row.newFileName).toBeUndefined()
    })

    test("a readonly list ignores a replace", () => {
        const attachments = mount(reactive({ modelValue: [{ id: 7 }], readonly: true }))
        const [row] = attachments.items.value

        attachments.handleReplace(row, new Blob(["b"]))

        expect(row.attachment).toBeUndefined()
    })
})

describe("generated updateWithAttachments", () => {
    test("PUTs a replaced file to the link and POSTs an added one", async () => {
        const { enqueue } = await import("@regira/modules/utilities/promise-utility")
        const { useAxios } = await import("@regira/modules/vue/http")
        const { updateWithAttachments } = await import("../../_template/entity-attachments/data/functions")
        enqueue.mockImplementation(async (tasks) => {
            for (const task of tasks) await task()
        })
        const upload = vi.fn(async (url) => ({
            data: { item: url.endsWith("/files") ? { id: 9, objectId: 3, attachmentId: 90 } : { id: 7, objectId: 3, attachmentId: 71 } },
        }))
        useAxios.mockReturnValue({ upload })
        const named = (name) => Object.assign(new Blob([name]), { name })
        const replaced = { id: 7, newFileName: "b.png", fileName: "b.png", attachment: { _file: named("b.png") } }
        const added = { id: -1, fileName: "c.pdf", attachment: { _file: named("c.pdf") } }
        const kept = { id: 8, attachment: {} }
        const item = { id: 3, attachments: [replaced, added, kept] }
        const update = vi.fn(async () => item)

        await updateWithAttachments("/products", item, update)

        expect(upload).toHaveBeenCalledTimes(2)
        expect(upload).toHaveBeenCalledWith("/products/3/files/7", [expect.any(Blob)], { method: "PUT" })
        expect(upload).toHaveBeenCalledWith("/products/3/files", [expect.any(Blob)])
        expect(replaced).toMatchObject({ id: 7, attachmentId: 71 })
        expect(added).toMatchObject({ id: 9, attachmentId: 90 })
        expect(replaced.attachment._file).toBeUndefined()
        expect(update).toHaveBeenCalledOnce()
    })

    test("a replaced file renamed before the save is uploaded under the edited name", async () => {
        const { enqueue } = await import("@regira/modules/utilities/promise-utility")
        const { fileToBlob } = await import("@regira/modules/utilities/file-utility")
        const { useAxios } = await import("@regira/modules/vue/http")
        const { updateWithAttachments } = await import("../../_template/entity-attachments/data/functions")
        enqueue.mockImplementation(async (tasks) => {
            for (const task of tasks) await task()
        })
        const renamed = Object.assign(new Blob(["png"]), { name: "front.png" })
        fileToBlob.mockResolvedValue(renamed)
        const upload = vi.fn(async () => ({ data: { item: { id: 7, objectId: 3, attachmentId: 71 } } }))
        useAxios.mockReturnValue({ upload })
        const picked = Object.assign(new Blob(["png"]), { name: "scan.png" })
        // replaced with scan.png, then renamed in the name box (a stored row edits newFileName)
        const row = { id: 7, newFileName: "front.png", fileName: "scan.png", attachment: { _file: picked } }

        await updateWithAttachments("/products", { id: 3, attachments: [row] }, vi.fn())

        expect(fileToBlob).toHaveBeenCalledExactlyOnceWith(picked, "front.png")
        expect(upload).toHaveBeenCalledExactlyOnceWith("/products/3/files/7", [renamed], { method: "PUT" })
        expect(row.newFileName).toBe("front.png")
    })
})

describe("generated attachments slice translations", () => {
    test("every key the slice translates is seeded by the shell", () => {
        const slice = join(templateRoot, "entity-attachments")
        const files = readdirSync(slice, { recursive: true }).filter((f) => f.endsWith(".vue"))
        const keys = new Set(files.flatMap((f) => [...readFileSync(join(slice, f), "utf8").matchAll(/\$t\(\s*["']([^"']+)["']/g)].map((m) => m[1])))
        const translations = JSON.parse(readFileSync(join(templateRoot, "app-shell", "public", "data", "translations.json"), "utf8"))

        expect(keys).toContain("replaceFile")
        expect([...keys].filter((key) => !(key in translations))).toEqual([])
    })
})
