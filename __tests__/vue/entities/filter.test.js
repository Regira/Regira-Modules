import { describe, test, expect } from "vitest"
import { ref } from "vue"
import { useFilter } from "../../../src/vue/entities/filter/filter"

class SearchObject {
    q = undefined
    brandId = undefined
}

describe("useFilter filterIsActive", () => {
    const active = (value) => useFilter({ searchObject: ref(value), emit: () => {}, Constructor: SearchObject }).filterIsActive.value

    test("a key with a value is a filter", () => {
        expect(active({ q: "x" })).toBe(true)
        expect(active({ brandId: [1] })).toBe(true)
        expect(active({ brandId: 0 })).toBe(true)
    })

    test("an empty array is no filter: the last chip of a multi-select was removed", () => {
        expect(active({ brandId: [] })).toBe(false)
    })

    test("a null key or a key the search object does not declare is no filter", () => {
        expect(active({ q: null, other: "x" })).toBe(false)
    })
})
