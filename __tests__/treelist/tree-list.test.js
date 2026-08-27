import { describe, test, expect } from "vitest"
import { TreeList } from "../../src/treelist"

/** Rows shaped like the flat lists an API returns: a key plus a foreign key to the parent. */
const row = (id, parentId = null) => ({ id, parentId })
const byParentId = (value, candidates) => candidates.filter((c) => c.id === value.parentId)

/** Values can carry several parents, so the selector reads a list of foreign keys. */
const byParentIds = (value, candidates) => candidates.filter((c) => (value.parentIds ?? []).includes(c.id))

const names = (nodes) => nodes.map((n) => n.value.id)

describe("TreeList.init", () => {
    test("builds from rows shuffled across more than one level", () => {
        const r = row("R")
        const a = row("A", "R")
        const b = row("B", "A")

        // B before A before R: every parent is synthesised while visiting its child
        const tree = new TreeList().init([b, a, r], byParentId)

        expect(tree.length).toBe(3)
        expect(names(tree.roots)).toEqual(["R"])
        expect(names(tree.roots[0].children)).toEqual(["A"])
        expect(names(tree.roots[0].children[0].children)).toEqual(["B"])
    })

    test("builds from a child listed before its root-level parent", () => {
        const r = row("R")
        const a = row("A", "R")

        const tree = new TreeList().init([a, r], byParentId)

        expect(tree.length).toBe(2)
        expect(names(tree.roots)).toEqual(["R"])
        expect(names(tree.roots[0].children)).toEqual(["A"])
    })

    test("keeps insertion order when the rows are already ordered top-down", () => {
        const r = row("R")
        const a = row("A", "R")
        const b = row("B", "A")

        const tree = new TreeList().init([r, a, b], byParentId)

        expect(names(tree)).toEqual(["R", "A", "B"])
        expect(names(tree.roots)).toEqual(["R"])
    })

    test("gives a value with several parents one node per parent", () => {
        const p1 = { id: "P1", parentIds: [] }
        const p2 = { id: "P2", parentIds: [] }
        const c = { id: "C", parentIds: ["P1", "P2"] }

        const tree = new TreeList().init([c, p1, p2], byParentIds)

        expect(tree.length).toBe(4)
        expect(names(tree.roots)).toEqual(["P1", "P2"])
        expect(tree.getNodes(c).length).toBe(2)
    })

    test("terminates on cyclic input without duplicating nodes", () => {
        const a = row("A", "B")
        const b = row("B", "A")

        const tree = new TreeList().init([a, b], byParentId)

        // The edge that would close the cycle is skipped, leaving its child as a root
        expect(tree.length).toBe(2)
        expect(tree.roots.length).toBe(1)
        expect(new Set(names(tree))).toEqual(new Set(["A", "B"]))
    })

    test("terminates on a cycle hanging off a valid root", () => {
        const r = row("R")
        const a = row("A", "B")
        const b = row("B", "A")

        const tree = new TreeList().init([r, a, b], byParentId)

        expect(tree.length).toBe(3)
        expect(new Set(names(tree))).toEqual(new Set(["R", "A", "B"]))
    })
})

describe("TreeList navigation", () => {
    test("getOffspring returns every descendant once", () => {
        const r = row("R")
        const a = row("A", "R")
        const b = row("B", "A")
        const tree = new TreeList().init([r, a, b], byParentId)

        // R yields [A, B] and A yields [B] — B belongs to both subtrees but is one node
        expect(names(tree.getOffspring())).toEqual(["A", "B"])
        expect(names(tree.getOffspring(tree.roots[0]))).toEqual(["A", "B"])
    })

    test("getValues returns every value once", () => {
        const p1 = { id: "P1", parentIds: [] }
        const p2 = { id: "P2", parentIds: [] }
        const c = { id: "C", parentIds: ["P1", "P2"] }
        const tree = new TreeList().init([c, p1, p2], byParentIds)

        // C occupies a node under each parent
        expect(tree.length).toBe(4)
        expect(tree.getValues()).toEqual([p1, c, p2])
    })
})
