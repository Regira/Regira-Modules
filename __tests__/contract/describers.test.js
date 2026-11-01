import { test, expect } from "vitest"
import { getEntityDescribers } from "../../src/core/entities/describers/functions"
import { useEntityDescribers } from "../../src/vue/entities/describers/functions"
import { runOn } from "./drivers"

// The registry of entity types an app describes once: each type's config, its pooled store and its components.

runOn(["core", "vue"], "describers", (driver) => {
    test("a type registered in a namespace is found there, with its store and components", () => {
        const describers = driver.describers(Symbol("app"))
        const store = () => ({})

        describers.call("addType", { key: "product" }, store, { Overview: "ProductOverview" })

        expect(describers.read("types")).toEqual(["product"])
        expect(describers.call("getDesc", "product")).toEqual({ config: { key: "product" }, store, components: { Overview: "ProductOverview" } })
        expect(describers.call("getDesc", "order")).toBeUndefined()
    })

    test("namespaces are kept apart, and one namespace is one registry", () => {
        const ns = Symbol("admin")
        driver.describers(ns).call("addType", { key: "user" }, () => ({}), {})

        expect(driver.describers(ns).read("types")).toEqual(["user"])
        expect(driver.describers(Symbol("other")).read("types")).toEqual([])
    })
})

test("the core and the Vue layer share the default namespace", () => {
    getEntityDescribers().addType({ key: "shared-by-both-layers" }, () => ({}), {})

    expect(useEntityDescribers().types).toContain("shared-by-both-layers")
})
