import { describe } from "vitest"
import { isRef } from "vue"
import { createFeedback } from "../../src/core/feedback/feedback"
import { createOverviewCore } from "../../src/core/entities/overview/overview-core"
import { createSearchView } from "../../src/core/entities/overview/search-view"
import { createListView } from "../../src/core/entities/overview/list-view"
import { PoolCache as CorePoolCache } from "../../src/core/entities/pooling/PoolCache"
import { createPoolHandler } from "../../src/core/entities/pooling/pool"
import { getEntityDescribers } from "../../src/core/entities/describers/functions"
import { createLangState } from "../../src/core/lang/lang"
import { createRouteOverview, isNewQuery } from "../../src/core/entities/overview/route-overview"
import { createDetails, isOtherItem } from "../../src/core/entities/details/details"
import { createForm } from "../../src/core/entities/form/form"
import { createListInput, createListItemInput, createOwnedCollection } from "../../src/core/entities/form/collections"
import { useFeedback } from "../../src/vue/ui/feedback"
import { useOverviewCore } from "../../src/vue/entities/overview/overview-core"
import { useSearchView } from "../../src/vue/entities/overview/search-view"
import { useListView } from "../../src/vue/entities/overview/list-view"
import { PoolCache as VuePoolCache } from "../../src/vue/entities/pooling/PoolCache"
import { usePooling } from "../../src/vue/entities/pooling/pool"
import { useEntityDescribers } from "../../src/vue/entities/describers/functions"
import { mountsFor } from "./mount"
import { useLang } from "../../src/vue/lang/useLang"

// A driver runs a scenario against one layer. Each gives a controller's state and actions the same shape: `read`
// a state path ("items", "feedback.status"), `write` one, `call` an action, and `settle` the promises it returned.

const BOX = Symbol("box")
// An array, or an object that is not a row, is frozen: a controller assigns those and never edits them in place (the
// core's rule 3). A row — any object with an `$id` or an `id`, such as an entity or a bare `{ id: 0 }` add-row — stays
// open, as what a view edits through v-model.
const isRow = (value) => "$id" in value || "id" in value
const freeze = (value) => (value !== null && typeof value === "object" && (Array.isArray(value) || !isRow(value)) ? Object.freeze(value) : value)

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
            const setter = parent[`set${key[0].toUpperCase()}${key.slice(1)}`]
            if (isHolder(parent[key])) parent[key].value = value
            else if (typeof parent[key] === "function" && typeof setter === "function") setter(value)
            else parent[key] = value
        },
        call(path, ...args) {
            const { parent, key } = walk(path)
            return parent[key](...args)
        },
    }
}

const settle = (...promises) => Promise.all(promises)

/**
 * The core driver's owner of a collection: it holds `rows`, and its prop catches up with what an editor handed it only
 * when it re-renders (`settle`), as a parent bound with v-model does. The editor's other events land in `events`.
 */
function owned(rows, make) {
    let collection = rows
    let prop = rows
    const updates = []
    const events = []
    const editor = make({
        box: frozenBox,
        modelValue: () => prop,
        update: (value) => (updates.push(value), (collection = value)),
        emit: (...event) => events.push(event),
    })
    const rerender = () => {
        if (prop === collection) return
        prop = collection
        editor.onModelValueChange()
    }
    return {
        editor,
        updates,
        events,
        collection: () => collection,
        settle: async () => rerender(),
        replace: async (rows) => ((collection = rows), rerender()),
    }
}

// The core driver's router: a URL the scenario steers, whose query values come back as strings (a repeated key as
// an array of them), as a router's do. A navigation to another query keeps the hash, as the Vue layer's does.
function routeOf(url) {
    const parsed = new URL(url, "http://localhost")
    const query = {}
    for (const [key, value] of parsed.searchParams) query[key] = key in query ? [query[key], value].flat() : value
    return { name: parsed.pathname, hash: parsed.hash, fullPath: parsed.pathname + parsed.search + parsed.hash, query }
}
function withQuery(route, query) {
    const search = new URLSearchParams()
    for (const [key, value] of Object.entries(query)) {
        for (const item of [value].flat()) if (item != null) search.append(key, String(item))
    }
    return routeOf(route.name + (search.size ? `?${search}` : "") + route.hash)
}

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
    lang: () => core.view(createLangState({ box: frozenBox })),
    /** a details page on `/things/:id`, mounted: its first load has started, as onMounted starts it */
    async details({ service, id = "7", feedback }) {
        let route = { name: "ThingForm", id }
        const details = createDetails({ box: frozenBox, service, routeId: () => route.id, feedback })
        details.load()
        // a navigation does not wait for the load it starts, as a router's watcher does not
        function navigate(next) {
            const previous = route
            route = next
            if (isOtherItem(route, previous)) details.load()
        }
        return {
            view: core.view(details),
            go: (id) => navigate({ ...route, id }),
            /** to the overview, another page, which has no id */
            leave: () => navigate({ name: "ThingOverview" }),
        }
    },
    /**
     * a form over `props` (`modelValue`, `readonly`, `isPopup`), mounted. Its events land in `events` as [name, arg];
     * `navigated` holds each item it went to after an insert, and `setProps` changes the props as the owner does.
     */
    async form({ service, props, events = [] }) {
        const navigated = []
        const form = createForm({
            box: frozenBox,
            service,
            modelValue: () => props.modelValue,
            readonly: () => !!props.readonly,
            isPopup: () => !!props.isPopup,
            emit: (...event) => events.push(event),
            navigateAfterInsert: (saved) => navigated.push(saved),
        })
        form.mount()
        return {
            view: core.view(form),
            events,
            navigated,
            async setProps(changes) {
                const previous = props.modelValue
                Object.assign(props, changes)
                if (props.modelValue !== previous) form.onModelValueChange(props.modelValue)
            },
        }
    },
    /** an owned-collection editor over a collection its owner holds, mounted */
    async ownedCollection({ rows, createRow }) {
        const owner = owned(rows, (input) => createOwnedCollection({ ...input, createRow }))
        await owner.editor.mount()
        return { ...owner, view: core.view(owner.editor) }
    },
    /** one row's editor; its events land in `events` as [name, arg] */
    async listItemInput({ item }) {
        const events = []
        const editor = createListItemInput({ item: () => item, emit: (...event) => events.push(event) })
        return { view: core.view(editor), events }
    },
    async listInput({ rows }) {
        const owner = owned(rows, createListInput)
        return { ...owner, view: core.view(owner.editor) }
    },
    /** a route overview on `url`, mounted: its first search has run */
    async routeOverview({ url, searchObject, pagingInfo = { page: 1, pageSize: 10 } }) {
        let route = routeOf(url)
        const searched = []
        const so = frozenBox(searchObject)
        const pi = frozenBox(pagingInfo)
        const overview = createRouteOverview({
            searchObject: so,
            pagingInfo: pi,
            handler: async () => void searched.push(so.value),
            query: () => route.query,
            navigate: (query) => go(withQuery(route, query)),
        })
        async function go(next) {
            const previous = route
            route = next
            if (isNewQuery(route, previous)) await overview.routeSearchHandler()
        }
        await overview.load()
        return {
            view: core.view(overview),
            searched,
            searchObject: () => so.value,
            /** a filter form hands the view a new search object */
            filter: (value) => void (so.value = value),
            pagingInfo: () => pi.value,
            query: () => route.query,
            fullPath: () => route.fullPath,
            go: (url) => go(routeOf(url)),
        }
    },
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
    routeOverview: (input) => vue.mount.routeOverviewOn(input),
    details: ({ service, id = "7" }) => vue.mount.details({ service, path: `/things/${id}` }),
    form: (input) => vue.mount.form(input),
    ownedCollection: (input) => vue.mount.ownedCollection(input),
    listInput: (input) => vue.mount.listInput(input),
    listItemInput: (input) => vue.mount.listItemInput(input),
    // useLang is the app's one language state: each scenario starts it over
    lang() {
        const lang = useLang()
        lang.langCode.value = ""
        lang.fallbackLangCode.value = ""
        lang.messages.value = {}
        return vue.view(lang)
    },
    settle,
}
// the lifecycle scenarios mount components, which only a framework driver can (mount.js)
vue.mount = mountsFor(vue.view)

const drivers = { core, vue }

/** runs `define(driver)` once per named driver, each in its own describe block */
export function runOn(names, title, define) {
    for (const name of names) describe(`${title} [${name}]`, () => define(drivers[name]))
}
