import { describe, test, expect } from "vitest"
import { EntityServiceBase, ArchivedFilter } from "../../../src/core/entities/abstractions"

class Model {
    constructor(id = 1) {
        this.id = id
    }
    get $id() {
        return this.id
    }
    get $title() {
        return "x"
    }
}

class TestService extends EntityServiceBase {
    toEntity(item) {
        return Object.assign(new Model(), item)
    }
}

function makeService(config = {}) {
    const urls = []
    const axios = {
        get: async (url) => (urls.push(url), { status: 200, data: { item: {}, items: [], count: 0 } }),
    }
    const service = new TestService(axios, { key: "test", api: "/api/models", ...config })
    return { service, urls }
}

describe("ArchivedFilter", () => {
    test("values are the wire form the server binds from ?archived=", () => {
        expect(ArchivedFilter.excluded).toBe("excluded")
        expect(ArchivedFilter.only).toBe("only")
        expect(ArchivedFilter.included).toBe("included")
    })
})

describe("details(id, so)", () => {
    test("sends no query string when no search object is passed", async () => {
        const { service, urls } = makeService()
        await service.details(7)
        expect(urls).toEqual(["/api/models/7"])
    })

    // GET /{id} 404s on an archived row — this is the only way to open one in a form and restore it.
    test("appends archived=included so an archived row resolves", async () => {
        const { service, urls } = makeService()
        await service.details(7, { archived: ArchivedFilter.included })
        expect(urls).toEqual(["/api/models/7?archived=included"])
    })
})

describe("list/search query params", () => {
    test("omits archived when the search object leaves it unset (server default applies)", async () => {
        const { service, urls } = makeService()
        await service.list()
        expect(urls[0]).not.toContain("archived")
    })

    test("passes archived through from the search object", async () => {
        const { service, urls } = makeService()
        await service.search({ archived: ArchivedFilter.only })
        expect(urls[0]).toContain("archived=only")
    })

    test("the entity property isArchived is not a search-object field", async () => {
        const { service, urls } = makeService()
        await service.list()
        expect(urls[0]).not.toContain("isArchived")
    })
})

describe("search(so) over baseQueryParams", () => {
    // a SearchObject class declaring `includes?: …` without a value has an own property holding undefined
    class SearchObject {
        q = "pen"
        includes = undefined
        sortBy = undefined
    }

    test("a field the search object leaves undefined keeps the base default", async () => {
        const { service, urls } = makeService({ baseQueryParams: { includes: ["Lines"], sortBy: ["TitleDesc"] } })

        await service.search(new SearchObject())

        expect(urls[0]).toContain("includes=Lines")
        expect(urls[0]).toContain("sortBy=TitleDesc")
        expect(urls[0]).toContain("q=pen")
    })

    test("a value the search object holds still wins", async () => {
        const { service, urls } = makeService({ baseQueryParams: { includes: ["Lines"] } })

        await service.search({ includes: ["Owner"] })

        expect(urls[0]).toContain("includes=Owner")
        expect(urls[0]).not.toContain("includes=Lines")
    })
})
