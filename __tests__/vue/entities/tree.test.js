import { describe, test, expect } from "vitest"
import { useTree } from "../../../src/vue/entities/tree/tree"

class Category {
    constructor(id, parentId = null) {
        this.id = id
        this.parentId = parentId
    }
    get $id() {
        return this.id
    }
}

const findParents = (value, candidates) => candidates.filter((c) => c.id === value.parentId)
const ids = (nodes) => nodes.map((n) => n.value.id)

describe("useTree", () => {
    test("builds a multi-level tree whatever order the rows arrive in", () => {
        const root = new Category(1)
        const child = new Category(2, 1)
        const grandChild = new Category(3, 2)
        // Deepest row first: each parent is resolved while its child is being visited
        const data = [grandChild, child, root]

        const { tree, init } = useTree()
        init([], data, findParents)

        expect(tree.value.length).toBe(3)
        expect(ids(tree.value.roots)).toEqual([1])
        expect(ids(tree.value.roots[0].children)).toEqual([2])
        expect(ids(tree.value.roots[0].children[0].children)).toEqual([3])
    })

    test("relates the selected items to the rest of the tree", () => {
        const root = new Category(1)
        const child = new Category(2, 1)
        const grandChild = new Category(3, 2)
        const data = [grandChild, child, root]

        const { nodes, ancestors, offspring, family, init } = useTree()
        init([child], data, findParents)

        expect(ids(nodes.value)).toEqual([2])
        expect(ids(ancestors.value)).toEqual([1])
        expect(ids(offspring.value)).toEqual([3])
        expect(ids(family.value)).toEqual([1, 2, 3])
    })
})
