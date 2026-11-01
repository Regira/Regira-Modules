import { describe, test, expect } from "vitest"
import { liftDates } from "../../../src/core/entities/utilities"
import { EntityServiceBase } from "../../../src/core/entities/abstractions"

class Model {
    id = 0
    dueOn = undefined
    get $id() {
        return this.id || "new"
    }
    get $title() {
        return "x"
    }
}

class ModelService extends EntityServiceBase {
    toEntity(item) {
        return item instanceof Model ? item : liftDates(Object.assign(new Model(), item || {}), "dueOn", "paidOn")
    }
}

describe("liftDates", () => {
    test("converts the named ISO strings to Dates, in place, and returns the item", () => {
        const item = { dueOn: "2026-10-21T09:30:00Z", paidOn: "2026-10-22T00:00:00+02:00" }

        const result = liftDates(item, "dueOn", "paidOn")

        expect(result).toBe(item)
        expect(item.dueOn).toBeInstanceOf(Date)
        expect(item.dueOn.toISOString()).toBe("2026-10-21T09:30:00.000Z")
        expect(item.paidOn.toISOString()).toBe("2026-10-21T22:00:00.000Z")
    })

    test("is idempotent: a Date stays the same instance on a second call", () => {
        const item = { dueOn: "2026-10-21T09:30:00Z" }
        liftDates(item, "dueOn")
        const first = item.dueOn

        liftDates(item, "dueOn")

        expect(item.dueOn).toBe(first)
    })

    test("leaves null and undefined alone", () => {
        const item = { dueOn: null, paidOn: undefined }

        liftDates(item, "dueOn", "paidOn")

        expect(item.dueOn).toBeNull()
        expect(item.paidOn).toBeUndefined()
        expect("paidOn" in item).toBe(true)
    })

    test("an empty or unparseable string becomes undefined", () => {
        const item = { dueOn: "", paidOn: "not a date" }

        liftDates(item, "dueOn", "paidOn")

        expect(item.dueOn).toBeUndefined()
        expect(item.paidOn).toBeUndefined()
    })

    test("converts only the fields it is given", () => {
        const item = { dueOn: "2026-10-21T09:30:00Z", day: "2026-10-21" }

        liftDates(item, "dueOn")

        expect(item.dueOn).toBeInstanceOf(Date)
        expect(item.day).toBe("2026-10-21")
    })

    test("in a toEntity: the DTO is hydrated, and an instance passes through untouched", () => {
        const service = new ModelService({}, { key: "model", api: "/models" })

        const entity = service.toEntity({ id: 1, dueOn: "2026-10-21T09:30:00Z" })
        const dueOn = entity.dueOn

        expect(entity).toBeInstanceOf(Model)
        expect(dueOn).toBeInstanceOf(Date)
        expect(service.toEntity(entity)).toBe(entity)
        expect(entity.dueOn).toBe(dueOn)
    })
})
