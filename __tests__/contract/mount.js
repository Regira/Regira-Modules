import { createApp, defineComponent, effectScope, h, nextTick, reactive, ref } from "vue"
import { createRouter, createMemoryHistory } from "vue-router"
import { createPinia } from "pinia"
import { useDetails } from "../../src/vue/entities/details"
import { useSearchView } from "../../src/vue/entities/overview/search-view"
import { useRouteOverview } from "../../src/vue/entities/overview/route-overview"
import { useForm } from "../../src/vue/entities/form/form"
import { useOwnedCollection } from "../../src/vue/entities/form/ownedCollections"
import { useListInput, useListItemInput } from "../../src/vue/entities/form/listInput"
import { createAuth, setGlobalAuth } from "../../src/vue/auth/auth"
import { useAuthStore } from "../../src/vue/auth/store"
import { addBearerHeader, autoLogoutOnFailedRequest } from "../../src/vue/auth/auth-axios"
import { onAuthenticated } from "../../src/vue/auth/onAuthenticated"
import { routeAllows } from "../../src/vue/auth/route-guard"
import { useLoginForm } from "../../src/vue/auth/useLoginForm"
import { useChangePasswordForm } from "../../src/vue/auth/useChangePasswordForm"
import { useForgotPasswordForm } from "../../src/vue/auth/useForgotPasswordForm"
import { useResetPasswordForm } from "../../src/vue/auth/useResetPasswordForm"

// The Vue driver's mounting half, for the lifecycle scenarios: each mounts a real component under a memory router,
// as an app does, and hands back what a scenario needs — the controller's view, the text on screen, how often the
// component rendered, and a way to unmount it.

const blank = { render: () => null }
const flush = () => new Promise((resolve) => setTimeout(resolve))
const routes = [
    { path: "/things", name: "ThingOverview", component: blank },
    { path: "/things/:id", name: "ThingForm", component: blank },
    { path: "/public", name: "Public", component: blank, meta: { allowAnonymous: true } },
]

async function mount(components, { path = "/things", plugins = [] } = {}) {
    const router = createRouter({ history: createMemoryHistory(), routes })
    await router.push(path)
    const host = document.createElement("div")
    const app = createApp({
        render: () =>
            h(
                "div",
                components.map((component) => h(component))
            ),
    })
    plugins.forEach((plugin) => app.use(plugin))
    app.use(router)
    app.mount(host)
    await router.isReady()
    return { host, router, text: () => host.textContent, unmount: () => app.unmount(), settle: () => nextTick() }
}

/** one component that runs `use()` in its setup, keeps what it returns, and renders `show(state)` */
function counted(use, show = () => "") {
    const probe = { state: undefined, renders: 0 }
    probe.component = defineComponent({
        setup() {
            probe.state = use()
            return () => (probe.renders++, h("span", String(show(probe.state))))
        },
    })
    return probe
}

/** a parent that holds `rows` and binds an editor (`use`) to them with v-model; the editor's `sort` lands in `events` */
async function withParent(use, rows) {
    const collection = ref(rows)
    const updates = []
    const events = []
    let editor
    const Editor = defineComponent({
        props: { modelValue: Array },
        emits: ["update:modelValue", "sort"],
        setup(props, { emit }) {
            editor = use({ props, emit })
            return () => h("span", (editor.items.value ?? []).map((x) => x.$title ?? x.id).join(","))
        },
    })
    const Parent = defineComponent({
        setup: () => () =>
            h(Editor, {
                modelValue: collection.value,
                "onUpdate:modelValue": (value) => (updates.push(value), (collection.value = value)),
                onSort: (e) => events.push(["sort", e]),
            }),
    })
    const mounted = await mount([Parent])
    await nextTick()
    return {
        ...mounted,
        editor,
        updates,
        events,
        collection: () => collection.value,
        replace: async (rows) => ((collection.value = rows), await nextTick()),
    }
}

/** a form's events, as [name, arg], and the `emit` that collects them; `onEvent` runs as each one arrives */
export function collected(onEvent) {
    const events = []
    return { events, emit: (name, arg) => (events.push([name, arg]), onEvent?.(name, arg)) }
}

/** `use()` in a component of an app with a pinia, over the module-wide auth setup `createAuth(auth)` makes */
async function withAuth(use, auth, { path, disabled = false } = {}) {
    const created = createAuth({ enabled: !disabled, tokenManager: { token: undefined }, ...auth })
    // what the plugin does for an app that installs it disabled; each scenario starts the module-wide `$auth` over
    setGlobalAuth(disabled ? { enabled: false } : undefined)
    const probe = counted(use)
    const mounted = await mount([probe.component], { path, plugins: [createPinia()] })
    return {
        ...mounted,
        auth: created,
        state: probe.state,
        unmount() {
            mounted.unmount()
            setGlobalAuth(undefined)
        },
    }
}

export function mountsFor(view) {
    const withView = (mounted) => ({ ...mounted, view: view(mounted.editor) })
    return {
        /**
         * the auth store over `axios`, in a mounted app. `go` moves the route, and `onAuthenticated` registers a handler
         * that stays until the app unmounts, as a component setup does.
         */
        async auth({ path, disabled, ...auth }) {
            const scope = effectScope()
            const mounted = await withAuth(useAuthStore, auth, { path, disabled })
            return {
                ...mounted,
                view: view(mounted.state),
                go: (path) => mounted.router.push(path),
                onAuthenticated: (handler, options) => void scope.run(() => onAuthenticated(handler, options)),
                /** the interceptors the plugin installs over the app's `axios` */
                intercept() {
                    addBearerHeader(auth.axios, mounted.auth.tokenManager)
                    autoLogoutOnFailedRequest(auth.axios, mounted.state)
                },
                unmount() {
                    scope.stop()
                    mounted.unmount()
                },
            }
        },

        /** the verdict on a route with one record per meta, root first, as vue-router resolves it */
        routeAllows(metas, store) {
            const path = (depth) => (depth ? "level" : "/level")
            const route = metas.reduceRight(
                (child, meta, depth) => ({ path: path(depth), component: blank, meta, children: child ? [child] : [] }),
                undefined
            )
            const router = createRouter({ history: createMemoryHistory(), routes: [route] })
            return routeAllows(router.resolve(metas.map(() => "/level").join("")), store)
        },

        /** each form over `axios`; `events` collects its emits as [name, arg] */
        async loginForm({ username, ...auth }) {
            const { events, emit } = collected()
            const mounted = await withAuth(() => useLoginForm({ username }, emit), auth)
            return { ...mounted, view: view(mounted.state), events }
        },
        async changePasswordForm({ onEvent, ...auth }) {
            const { events, emit } = collected(onEvent)
            const mounted = await withAuth(() => useChangePasswordForm(emit), auth)
            return { ...mounted, view: view(mounted.state), events }
        },
        async forgotPasswordForm({ username, options, onEvent, ...auth }) {
            const { events, emit } = collected(onEvent)
            const props = reactive({ username })
            const mounted = await withAuth(() => useForgotPasswordForm(props, emit, options), auth)
            return {
                ...mounted,
                view: view(mounted.state),
                events,
                setUsername: async (value) => ((props.username = value), await nextTick()),
            }
        },
        async resetPasswordForm({ token, ...auth }) {
            const { events, emit } = collected()
            const props = reactive({ token })
            const mounted = await withAuth(() => useResetPasswordForm(props, emit), auth)
            return { ...mounted, view: view(mounted.state), events, setToken: (value) => void (props.token = value) }
        },

        async details({ service, path = "/things/7" }) {
            const probe = counted(
                () => useDetails(service),
                (details) => details.item.value?.$title ?? ""
            )
            const mounted = await mount([probe.component], { path })
            return {
                ...mounted,
                view: view(probe.state),
                renders: () => probe.renders,
                go: (id) => void mounted.router.push(`/things/${id}`),
                leave: () => void mounted.router.push("/things"),
            }
        },

        async routeOverview({ service, path = "/things" }) {
            const probe = counted(
                () => {
                    const overview = useSearchView({ service, searchObject: {} })
                    useRouteOverview({ ...overview, handler: () => overview.searchHandler() })
                    return overview
                },
                (overview) => (overview.items.value ?? []).map((x) => x.$title).join(",")
            )
            const mounted = await mount([probe.component], { path })
            return { ...mounted, view: view(probe.state), renders: () => probe.renders }
        },

        /** one component per id, each showing its pooled entity's title; `edit(index, change)` edits one in place */
        async pooled({ pool, ids }) {
            const probes = ids.map((id) =>
                counted(
                    () => pool.fromPool({ id }),
                    (item) => item.$title
                )
            )
            const mounted = await mount(probes.map((probe) => probe.component))
            return {
                ...mounted,
                items: () => probes.map((probe) => probe.state),
                renders: () => probes.map((probe) => probe.renders),
                edit: (index, change) => change(probes[index].state),
            }
        },

        /**
         * a form over `props` (or over `item` alone), mounted; `edit(change)` edits the form's item in place, as an input
         * bound to it does. Its events land in `events` as [name, arg], `navigated` holds each item it went to after an
         * insert, and `setProps` changes the props as the owner's re-render does.
         */
        async form({ service, item, props = { modelValue: item }, events = [], path = "/things/7" }) {
            const navigated = []
            const reactiveProps = reactive(props)
            const probe = counted(
                () =>
                    useForm({
                        entityService: service,
                        props: reactiveProps,
                        emit: (name, arg) => events.push([name, arg]),
                        afterInsertRoute: (saved) => (navigated.push(saved), { name: "ThingOverview" }),
                    }),
                (form) => form.item.value?.$title ?? ""
            )
            const mounted = await mount([probe.component], { path })
            return {
                ...mounted,
                view: view(probe.state),
                events,
                navigated,
                edit: (change) => change(probe.state.item.value),
                setProps: async (changes) => (Object.assign(reactiveProps, changes), await nextTick()),
            }
        },

        /** useRouteOverview on `url`, mounted: its first search has run */
        async routeOverviewOn({ url, searchObject, pagingInfo = { page: 1, pageSize: 10 } }) {
            const router = createRouter({
                history: createMemoryHistory(),
                routes: [
                    { path: "/tickets", name: "tickets", component: blank },
                    { path: "/tickets/:id", name: "ticket", component: blank },
                ],
            })
            await router.push(url)
            const searched = []
            const so = ref(searchObject)
            const pi = ref(pagingInfo)
            let overview
            const app = createApp(
                defineComponent({
                    setup() {
                        overview = useRouteOverview({
                            searchObject: so,
                            pagingInfo: pi,
                            handler: async () => void searched.push(so.value),
                        })
                        return () => h("div")
                    },
                })
            )
            app.use(router)
            app.mount(document.createElement("div"))
            await flush()
            return {
                view: view(overview),
                searched,
                searchObject: () => so.value,
                filter: (value) => void (so.value = value),
                pagingInfo: () => pi.value,
                query: () => router.currentRoute.value.query,
                fullPath: () => router.currentRoute.value.fullPath,
                go: async (url) => (await router.push(url), await flush()),
                unmount: () => app.unmount(),
            }
        },

        /** a parent that binds an owned-collection editor with v-model, so the child's prop moves on the parent's re-render */
        ownedCollection: ({ rows, createRow }) => withParent((input) => useOwnedCollection({ ...input, createRow }), rows).then(withView),
        listInput: ({ rows }) => withParent(useListInput, rows).then(withView),
        /** one row's editor over `item`; its events land in `events` as [name, arg] */
        async listItemInput({ item }) {
            const events = []
            const probe = counted(() => useListItemInput({ props: { modelValue: item }, emit: (name, arg) => events.push([name, arg]) }))
            const mounted = await mount([probe.component])
            return { ...mounted, view: view(probe.state), events }
        },
    }
}
