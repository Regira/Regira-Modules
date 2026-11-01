import { describe, test, expect, afterEach } from "vitest"
import { runOn } from "./drivers"

// The editors of a collection an entity owns. The collection is the owner's: an editor hands it a new one, and the
// owner's prop only catches up when the owner re-renders (`settle`), so two appends in one tick must not drop a row.

// The owned-row model an editor is bound to. Only the PARENT passes through the service's toEntity, so the
// add-row never does — which is why field defaults have to come from somewhere.
class OrderLine {
    id = 0
    kind = "Purchase"
    quantity = 1
    get $id() {
        return this.id || "new"
    }
    get $title() {
        return this.kind
    }
}
const line = (id) => Object.assign(new OrderLine(), { id })
const ids = (rows) => rows.map((row) => row.id)

let mounted
afterEach(() => {
    mounted?.unmount?.()
    mounted = undefined
})

runOn(["core", "vue"], "owned collection", (driver) => {
    const editor = async (input) => (mounted = await driver.ownedCollection(input))

    describe("items", () => {
        test("reads as [] while the owner's collection is still unset, and leaves it unset", async () => {
            // The crash this prevents: a computed that maps items evaluates during setup, before onMounted mints the
            // add-row — "Cannot read properties of undefined (reading 'map')".
            const page = await editor({ rows: undefined })

            expect(page.view.read("items")).toEqual([])
            // A collection that was never loaded stays undefined: `[]` would save as "delete every row".
            expect(page.collection()).toBeUndefined()
            expect(page.updates).toEqual([])
        })

        test("hands the owner nothing on mount or when the owner swaps the collection", async () => {
            const page = await editor({ rows: undefined })

            await page.replace([line(3)])
            await page.replace(undefined)

            expect(page.updates).toEqual([])
            expect(page.collection()).toBeUndefined()
        })

        test("writes through to the owner", async () => {
            const page = await editor({ rows: [] })

            page.view.write("items", [line(7)])
            await page.settle()

            expect(ids(page.collection())).toEqual([7])
        })
    })

    describe("add-row", () => {
        test("without createRow the row is a bare { id: 0 } and class defaults are absent", async () => {
            const page = await editor({ rows: [] })

            expect(page.view.read("newItem").id).toBe(0)
            expect(page.view.read("newItem").kind).toBeUndefined()
        })

        test("createRow mints the row from the model, so defaults and getters are present", async () => {
            const page = await editor({ rows: [], createRow: () => new OrderLine() })

            expect(page.view.read("newItem").kind).toBe("Purchase")
            expect(page.view.read("newItem").quantity).toBe(1)
            expect(page.view.read("newItem").$title).toBe("Purchase")
            expect(page.view.read("newItem").id).toBe(0) // still marks the row unsaved
        })

        test("handleSave appends with a negative temp id and re-mints the add-row from createRow", async () => {
            const page = await editor({ rows: [], createRow: () => new OrderLine() })

            page.view.call("handleSave", { saved: page.view.read("newItem"), isNew: true })
            await page.settle()

            expect(ids(page.collection())).toEqual([-1]) // negative temp ids keep pre-save rows unique
            // the re-minted row carries the defaults too: every reset seeds it
            expect(page.view.read("newItem").kind).toBe("Purchase")
            expect(page.view.read("newItem")).not.toBe(page.collection()[0])
        })
    })

    describe("appends in one tick", () => {
        test("two handleSave calls before the owner re-renders keep both rows with distinct temp ids", async () => {
            const page = await editor({ rows: [line(4)], createRow: () => new OrderLine() })

            page.view.call("handleSave", { saved: new OrderLine(), isNew: true })
            page.view.call("handleSave", { saved: new OrderLine(), isNew: true })
            await page.settle()

            expect(ids(page.collection())).toEqual([4, -1, -2])
        })
    })
})

// What both editors do with the owner's collection.
for (const kind of ["ownedCollection", "listInput"]) {
    runOn(["core", "vue"], `${kind}: the owner's collection`, (driver) => {
        const editor = async (input) => (mounted = await driver[kind](input))

        test("an update of a stored row adds nothing", async () => {
            const page = await editor({ rows: [line(4)] })

            page.view.call("handleSave", { saved: line(4), isNew: false })
            await page.settle()

            expect(page.updates).toEqual([])
        })

        test("an append after the owner replaced the collection builds on the new one", async () => {
            const page = await editor({ rows: [] })

            page.view.call("handleSave", { saved: line(0), isNew: true })
            await page.settle()
            await page.replace([line(9)]) // a reload
            page.view.call("handleSave", { saved: line(0), isNew: true })
            await page.settle()

            expect(ids(page.collection())).toEqual([9, -1])
        })

        // the draggable list writes the new order through `items`, and hands the event on as `sort`
        test("a sort writes the new order through, and an append in the same tick keeps it", async () => {
            const page = await editor({ rows: [line(4), line(5)] })

            page.view.write("items", [...page.view.read("items")].reverse())
            page.view.call("handleSort", { oldIndex: 0, newIndex: 1 })
            page.view.call("handleSave", { saved: line(0), isNew: true })
            await page.settle()

            expect(ids(page.collection())).toEqual([5, 4, -1])
            expect(page.events).toEqual([["sort", { oldIndex: 0, newIndex: 1 }]])
        })
    })
}

runOn(["core", "vue"], "list input", (driver) => {
    const editor = async (input) => (mounted = await driver.listInput(input))

    test("appends to an unset collection, and two appends in one tick keep both rows", async () => {
        const page = await editor({ rows: undefined })

        expect(page.view.read("items")).toEqual([])
        expect(page.updates).toEqual([])

        page.view.call("handleSave", { saved: { id: 0 }, isNew: true })
        page.view.call("handleSave", { saved: { id: 0 }, isNew: true })
        await page.settle()

        expect(ids(page.collection())).toEqual([-1, -2])
    })

    test("a new row next to stored rows gets a negative temp id, and the add-row starts over", async () => {
        const page = await editor({ rows: [{ id: 3 }, { id: 4 }] })
        const added = page.view.read("newItem")

        page.view.call("handleSave", { saved: { id: 0 }, isNew: true })
        await page.settle()

        expect(ids(page.collection())).toEqual([3, 4, -1]) // not 2, which may name a stored row
        expect(page.view.read("newItem")).toEqual({ id: 0 })
        expect(page.view.read("newItem")).not.toBe(added)
    })
})

runOn(["core", "vue"], "list item input", (driver) => {
    test("a save sends the row, new while it has no id", async () => {
        const stored = await driver.listItemInput({ item: { id: 3, _deleted: false } })
        const added = await driver.listItemInput({ item: { id: 0, _deleted: false } })
        mounted = stored

        stored.view.call("handleSave")
        added.view.call("handleSave")
        added.unmount?.()

        expect(stored.events).toEqual([["save", { saved: { id: 3, _deleted: false }, isNew: false }]])
        expect(added.events[0][1].isNew).toBe(true)
    })

    test("a delete marks the row, and a second one takes the mark back: an owned row is never spliced out", async () => {
        const row = { id: 3, _deleted: false }
        mounted = await driver.listItemInput({ item: row })

        mounted.view.call("handleRemove", row)
        expect(row._deleted).toBe(true)
        mounted.view.call("handleRemove", row)

        expect(row._deleted).toBe(false)
        expect(mounted.events.map(([name]) => name)).toEqual(["remove", "remove"])
    })
})
