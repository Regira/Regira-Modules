import { describe } from "vitest"
import { isRef } from "vue"
import { createFeedback } from "../../src/core/feedback/feedback"
import { createOverviewCore } from "../../src/core/entities/overview/overview-core"
import { createSearchView } from "../../src/core/entities/overview/search-view"
import { createListView } from "../../src/core/entities/overview/list-view"
import { PoolCache as CorePoolCache } from "../../src/core/entities/pooling/PoolCache"
import { createPoolHandler } from "../../src/core/entities/pooling/pool"
import { getEntityDescribers } from "../../src/core/entities/describers/functions"
import { useFeedback } from "../../src/vue/ui/feedback"
import { useOverviewCore } from "../../src/vue/entities/overview/overview-core"
import { useSearchView } from "../../src/vue/entities/overview/search-view"
import { useListView } from "../../src/vue/entities/overview/list-view"
import { PoolCache as VuePoolCache } from "../../src/vue/entities/pooling/PoolCache"
import { usePooling } from "../../src/vue/entities/pooling/pool"
import { useEntityDescribers } from "../../src/vue/entities/describers/functions"

// A driver runs a scenario against one layer. Each gives a controller's state and actions the same shape: `read`
// a state path ("items", "feedback.status"), `write` one, `call` an action, and `settle` the promises it returned.

const BOX = Symbol("box")
// An array, or an object that is not an entity, is frozen: a controller assigns those and never edits them in place
// (the core's rule 3). An entity stays open, as the one value a view edits in place, through a form's v-model.
const freeze = (value) => (value !== null && typeof value === "object" && (Array.isArray(value) || !("$id" in value)) ? Object.freeze(value) : value)

/** the core driver's box: what is assigned to it is frozen (see `freeze`), so an in-place edit throws */
export function frozenBox(initial) {
    let current = freeze(initial)
    return {
        [BOX]: true,
        get value() {
            return current
        },
        set value(next) {
            current = freeze(next)
        },
    }
}

function viewOf(raw, { unwrap, isHolder }) {
    function walk(path) {
        const keys = path.split(".")
        let parent = raw
        for (const key of keys.slice(0, -1)) parent = unwrap(parent[key])
        return { parent, key: keys[keys.length - 1] }
    }
    return {
        raw,
        read(path) {
            const { parent, key } = walk(path)
            return unwrap(parent[key], true)
        },
        write(path, value) {
            const { parent, key } = walk(path)
            if (isHolder(parent[key])) parent[key].value = value
            else parent[key] = value
        },
        call(path, ...args) {
            const { parent, key } = walk(path)
            return parent[key](...args)
        },
    }
}

const settle = (...promises) => Promise.all(promises)

export const core = {
    name: "core",
    box: frozenBox,
    // a derived value is a function over the boxes (the core's rule 6): reading it calls it
    view: (raw) =>
        viewOf(raw, { unwrap: (v, last) => (v?.[BOX] ? v.value : last && typeof v === "function" ? v() : v), isHolder: (v) => !!v?.[BOX] }),
    feedback: (input = {}) => core.view(createFeedback({ ...input, box: frozenBox })),
    overviewCore: (input) => core.view(createOverviewCore({ ...input, box: frozenBox })),
    searchView: (input) => core.view(createSearchView({ ...input, box: frozenBox })),
    listView: (input) => core.view(createListView({ ...input, box: frozenBox })),
    poolCache: (options = {}) => new CorePoolCache({ interval: 0, ...options, box: frozenBox }),
    pool: ({ service, type, cache = core.poolCache(), persistent }) => core.view(createPoolHandler({ service, type, cache, persistent })),
    describers: (ns) => core.view(getEntityDescribers(ns)),
    settle,
}

export const vue = {
    name: "vue",
    view: (raw) => viewOf(raw, { unwrap: (v) => (isRef(v) ? v.value : v), isHolder: isRef }),
    feedback: (input = {}) => vue.view(useFeedback(input)),
    overviewCore: (input) => vue.view(useOverviewCore(input)),
    searchView: (input) => vue.view(useSearchView(input)),
    listView: (input) => vue.view(useListView(input)),
    poolCache: (options = {}) => new VuePoolCache({ interval: 0, ...options }),
    pool: ({ service, type, cache = vue.poolCache(), persistent }) => vue.view(usePooling(service, type, cache, persistent)),
    describers: (ns) => vue.view(useEntityDescribers(ns)),
    settle,
}

const drivers = { core, vue }

/** runs `define(driver)` once per named driver, each in its own describe block */
export function runOn(names, title, define) {
    for (const name of names) describe(`${title} [${name}]`, () => define(drivers[name]))
}
