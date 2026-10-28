import { test, expect } from "vitest"
import { frozenBox } from "./drivers"

// the core driver's guard for rule 3: a controller that edited its state in place would pass on a plain box
test("the core driver's box rejects an in-place edit of an array, and takes a new one", () => {
    const box = frozenBox([1, 2])

    expect(() => box.value.push(3)).toThrow(TypeError)
    expect(() => box.value.splice(0, 1)).toThrow(TypeError)

    box.value = [...box.value, 3]
    expect(box.value).toEqual([1, 2, 3])
    expect(Object.isFrozen(box.value)).toBe(true)
})

test("an object it holds is frozen too, unless it is an entity, which views edit in place", () => {
    const paging = frozenBox({ page: 1, pageSize: 25 })
    const entity = frozenBox(
        Object.assign(
            Object.create({
                get $id() {
                    return this.id
                },
            }),
            { id: 7, title: "Laptop" }
        )
    )

    expect(() => (paging.value.page = 2)).toThrow(TypeError)
    entity.value.title = "Laptop Pro"
    expect(entity.value.title).toBe("Laptop Pro")
})
