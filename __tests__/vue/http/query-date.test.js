import { describe, test, expect } from "vitest"
import { createQueryString } from "../../../src/vue/http/query"
import { toQueryString } from "../../../src/utilities/http-utility"

// A request BODY passes through JSON.stringify, so `dateExtensions.use()`'s Date.prototype.toJSON applies.
// A query string never does — so before this, the default coercion put Date.prototype.toString() on the wire
// ("Wed Jul 29 2026 07:00:00 GMT+0200 (Central European Summer Time)") and ASP.NET Core's DateTime binder
// answered 400 before any application code ran. The scaffolded SearchObject ships Date-typed filters
// (minCreated/maxCreated), so the template itself taught the shape that failed.
const local = new Date(2026, 6, 29, 7, 0, 0)
// Local wall clock + its offset, matching what the body serializer emits for the same instant.
const expected = /^2026-07-29T07:00:00\.000[+-]\d{2}:\d{2}$/

describe("createQueryString — Date values", () => {
    test("serializes a Date as ISO-8601 with the local offset", () => {
        expect(createQueryString({ from: local }).get("from")).toMatch(expected)
    })

    test("serializes Dates inside an array, one repeated key each", () => {
        const params = createQueryString({ on: [local, local] })

        expect(params.getAll("on")).toHaveLength(2)
        for (const value of params.getAll("on")) expect(value).toMatch(expected)
    })

    test("leaves non-Date values alone", () => {
        const params = createQueryString({ q: "blue", pageSize: 10, includes: ["A", "B"] })

        expect(params.toString()).toBe("q=blue&pageSize=10&includes=A&includes=B")
    })

    test("omits the key for an invalid Date rather than sending an empty value", () => {
        // "?from=" binds to default on the server — a wrong result set that looks like a successful filter.
        const params = createQueryString({ from: new Date("not a date"), q: "blue" })

        expect(params.has("from")).toBe(false)
        expect(params.get("q")).toBe("blue")
    })
})

describe("toQueryString — Date values", () => {
    test("serializes a Date instead of walking it as a nested object", () => {
        // The object branch used to claim it first and iterate its (empty) own properties, so the pair
        // vanished from the query string entirely — a silently dropped filter rather than a 400.
        expect(toQueryString({ from: local })).toMatch(/^from=2026-07-29T07%3A00%3A00\.000(%2B|-)\d{2}%3A\d{2}$/)
    })

    test("handles Dates nested in an object and in an array", () => {
        const nested = toQueryString({ range: { from: local }, on: [local] })

        expect(nested).toContain("range%5Bfrom%5D=2026-07-29T07")
        expect(nested).toContain("on=2026-07-29T07")
    })

    test("omits the key for an invalid Date", () => {
        expect(toQueryString({ from: new Date("nope"), q: "blue" })).toBe("q=blue")
    })
})
