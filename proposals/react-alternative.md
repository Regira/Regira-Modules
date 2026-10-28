# A React alternative to the Vue modules

As of 2026-10-25. Sources: the `Regira-Modules` repository, branch `wip` at `6a65849`: `src/`, `_template/`, `scripts/`, `__tests__/`, `.github/workflows/`, `package.json` and `package-lock.json`; and the local `dist/` build of the same day, whose imports were traced file by file from every entry point. React, React Router and npm behaviour is taken from their documented APIs and was not measured here. Nothing on this page has been built.

**Status: proposal, not scheduled. Two decisions are open (see *Decisions*). An Angular layer is out of scope; the design leaves room for one without changing the core.**

## Recommendation

Offer React by sharing the logic, not by porting the components. Move the logic in the Vue composables into one framework-free module, `src/core/`, published as `@regira/modules/core`. Keep `vue/*` as thin wrappers whose public API does not change, and add `src/react/`, published as `@regira/modules/react`, as a second set of thin wrappers.

The core depends on no framework, not even on Vue's reactivity package. Where it keeps state, it creates that state through a `box` function the layer passes in. The Vue layer passes Vue's own `ref`, so the composables return the same refs they return today. The React layer passes a small box that tells React to re-render. That one function is the whole bridge between the core and a framework.

The reason to share is what the composables hold. `useOverviewCore`, `useDetails`, `useForm` and the auth store carry "newest request wins" guards, the mapping of 400, 404 and 409 answers to feedback, and the order in which a stored token is restored. About 600 tests pin that behaviour. A React copy would need every one of those fixes made twice, and the two copies would drift.

The tests come first. Before a module's logic moves, its composable tests are rewritten as scenarios that run against more than one driver: the core on its own, the Vue composables, and later the React hooks. The move is proven against Vue before React exists, and a React mismatch shows up as the same scenario failing under React only.

| Phase | What | Size | Release |
|---|---|---|---|
| 0 | Safety nets, and the code that already has no Vue dependency moved into `src/core/` | Small | Minor |
| 1 | The logic moves into the core; Vue only, its API unchanged | Medium | Patch |
| 2 | React hooks and providers, no UI | Medium | Minor, marked experimental |

A React UI kit, a React scaffold and a full React guide set are not part of this proposal (see *Out of scope*).

## What exists today

| What | Where | Effect |
|---|---|---|
| Framework-free core modules | `src/utilities`, `extensions`, `treelist`, `events`, `io`: 2,946 lines | A React app can use them as they are |
| Framework-free code under `src/vue` | 2,658 of the 6,838 TypeScript lines import neither `vue`, `vue-router` nor `pinia`: `entities/abstractions`, `config`, `describers`, `navigation`, `entities/utilities`, `http`, `ioc/ServiceProvider.ts`, `formatters`, `auth/auth-service.ts`, `token-manager.ts`, `AuthData.ts`, `error-logging.ts`, `lang/translate.ts`, `formatText.ts`. Two of them, `overview/search-view.ts` and `list-view.ts`, import no Vue themselves but build on `useOverviewCore`'s refs | The code is there, under `vue/…` paths |
| Entry points that load without Vue | Traced through `dist/`: `utilities`, `treelist`, `events`, `io`, `vue/http`, `vue/http/axios`, `vue/ioc`, `vue/entities/abstractions`, `vue/formatters` | `vue/entities` and `vue/ui` pull in `vue` and `vue-router`; `vue/auth` pulls in all three; `vue/lang` and `vue/ui/feedback` pull in `vue` |
| Framework-free logic reachable only through Vue files | `toFeedbackError`, `fieldMessages` and `setErrorTranslator` live in `ui/feedback/feedback.ts`, which imports `vue`; the error mapping's default translator reads `useLang`'s refs. `AuthService`, `TokenManager` and `AuthData` are exported only from the `vue/auth` barrel. `translate` is exported only from `vue/lang` | A React app cannot reach the error mapping, the auth service or the translations without loading Vue |
| Vue-bound code | 4,180 TypeScript lines import `vue`, `vue-router` or `pinia`; 45 single-file components (1,883 lines) in `src/vue` | Phase 1 moves the logic out of the composables among them |
| Peer dependencies | `vue`, `vue-router`, `pinia`, `axios` and `date-fns` are required peers in `package.json` | npm 7 and later install required peers, so a React app gets all three Vue packages |
| Logic and state are interleaved | `claimWrite` in `overview/overview-core.ts`, `latestLoadId` in `details/details.ts`, the failure mapping in `form/form.ts`, `createStore` in `auth/store.ts` | The logic exists once, written against Vue refs |
| Lifecycle inside composables | `onMounted` in `useDetails`, `useRouteOverview`, `useForm`, `useOwnedCollection` and `useLeanOverview`; `watch(router.currentRoute)` in `useDetails` and `useRouteOverview`; `watch(() => props.modelValue)` in `useForm`, `useOwnedCollection` and `useListInput` | These calls cannot move into a framework-free core |
| In-place edits of a ref's contents | Three, all in `overview/overview-core.ts`: two `items.value.splice(…)` and one `items.value.push(…)`. Every other write in the logic assigns `.value` | A core that only assigns works with any box |
| Shared entity objects, edited in place | `PoolCache` keeps one `Ref` per entity, and every view edits that object (`v-model="item.title"`). `$id` and `$title` are prototype getters, and `EntityServiceBase.requireId` throws when a spread dropped them | React's usual `setItem({ ...item })` breaks the model |
| Named routes | `_template/entity-slice/setup.ts` names `${key}Overview`, `${key}Details`, `${key}Fiche` and `${key}Form`. `details.ts` reads `router.options.routes` and `router.options.history.state.back`. `FormIn.afterInsertRoute` returns vue-router's `RouteLocationRaw` | React Router has no named routes and no `history.state.back` |
| Route meta | `allowAnonymous`, `permissions` and `policy` in `auth/route-guard.ts` | Needs a home on React Router's route objects |
| App wiring | `app.config.globalProperties`: `$services`, `$configs`, `$icons`, `$t`, `$tm`, `$auth`, `$culture`, `$feedback`. Pinia stores in `app/store.ts`, `auth/store.ts` and every slice's `data/store.ts` | React gets a provider and hooks instead |
| Tests | 60 files, about 600 tests: 366 under `__tests__/vue`, 109 under `__tests__/template`. Composable tests settle service calls by hand (`deferredService` in `overview-fetching.test.js`) or mount with `createApp` and a memory router. *scaffold.mjs output type-checks* in `scaffold.test.js` runs `vue-tsc` over a scaffolded app that reads the package through its `exports`, as an install does | The scenarios can be reused, and the type-check already guards the types a Vue app uses |
| CI | The tests run only inside `publish-npm.yml`. `deploy-docs.yml` builds the docs site | Nothing runs on a push or a pull request |
| Unused Vue JSX | `src/vue/ui/feedback/controls.jsx` is imported nowhere; `tsconfig.json` sets `jsx: preserve` | It would break under the React JSX transform |

## Design

### The core's rules

1. **No framework imports.** The core imports only axios, date-fns, the existing utility modules and its own files.
2. **State lives in boxes.** A box is `{ value: T }`, and every controller that keeps state takes `box: <T>(initial: T) => Box<T>`. The Vue layer passes `ref`; the core's own tests pass a plain object.
3. **Assign, never edit in place.** The core writes `items.value = …`, never `items.value.push(…)`, so a box only has to notice assignments.
4. **No lifecycle, no router, no watchers.** A controller exposes a method for each outside event, such as `load()` or `onModelValueChange(value)`, and the layer calls it from `onMounted` and `watch`, or from `useEffect`. Where the core needs the route, it takes plain values, such as the route id or the current query, and callbacks, such as `navigateAfterInsert(saved)`; never a router. Vue's watchers stay in the Vue layer, so they keep firing when they do today.
5. **Factories, not reactive singletons.** The core exports `createPoolCache`, `createLangState`, `createAuthState` and so on; each layer creates its own app-wide instances, as the Vue layer's `defaultPoolCache` and `useLang` state are today. Only plain singletons, such as the default `ServiceProvider` and the registered error translator, live in the core.

The search view shows the shape:

```ts
// core: written once
export function createSearchView<T extends IEntity, SO extends ISearchObject>({ box, service, searchObject, defaultPageSize }: SearchViewIn<T, SO>) {
    const items = box<Array<T> | undefined>(undefined)
    const isLoading = box(false)
    // …the code of useOverviewCore and useSearchView today, with ref( written as box(
}

// vue: the same signature as today
export function useSearchView<T extends IEntity, SO extends ISearchObject = ISearchObject>(input: IListViewIn<T, SO>): ISearchViewOut<T, SO> {
    return createSearchView({ ...input, box: ref as BoxFactory }) as unknown as ISearchViewOut<T, SO>
}
```

The cast is safe because at runtime every box the Vue layer gets is a Vue ref. Where a Vue type is a reactive object rather than a set of refs, as `FeedbackOut` is, the Vue layer wraps the core's object in `reactive()`.

### The Vue layer

Each composable calls its core controller with `ref`, wires the lifecycle with `onMounted` and `watch`, and binds `emit`. It keeps its declared types. The values that depend on vue-router's shape, such as `isForm`, `hasFiche` and the overview back-link in `useDetails`, stay here. Pinia stays where it is.

### The React layer

- **A box that notifies.** Assigning a box bumps a version that the hook reads with `useSyncExternalStore`. Editing an entity's field in place, as a form input does, goes through an `update(item => …)` the hook returns, which re-assigns the box.
- **`RegiraProvider`** holds the language, auth and app-wide feedback. Services come from the existing IoC container.
- **Hooks mirror the composables** that move in Phase 1. Events become callback props: `onSave`, `onRemove`, and `onChange` for `update:modelValue`.
- **React Router glue.** `entityRoutes(config, components)` gives each route a `handle` with the name the Vue `createRoutes()` uses (`${key}Overview`, …) and its auth meta. `useNavigateByName()` resolves those names, and a guard reads the matched handles with `useMatches()` and checks them with the core's `routeAllows`. This needs React Router's data router.
- **Entity stores** are module-level objects resolved lazily from the IoC container, in place of Pinia's `defineStore`.

### Packaging

One package, as today, with two new entries: `./core` and `./react`. The `vue/*` paths re-export what moved, so a Vue app changes nothing. `vue`, `vue-router`, `pinia`, `react`, `react-dom` and `react-router` become optional peers in `peerDependenciesMeta`.

`./core` is one entry rather than one per area: one barrel, one documentation set and one line in `docs/sync-modules.mjs`. Its names are new, so they can be unique where the Vue side repeats one; pooling and auth both export a `createStore` today.

## Catching mismatches

Six layers:

| # | Layer | Catches | Steps |
|---|---|---|---|
| 1 | CI on every push and pull request | everything, at the earliest point | 1 |
| 2 | A snapshot of every `vue/*` entry's exports, next to the existing type-check of a scaffolded app | the refactor changing what a Vue app imports, or how its code type-checks | 2 |
| 3 | A boundary test on `dist/` | the core importing a framework, the React layer importing Vue, or a shared chunk doing either | 3 |
| 4 | Shared scenarios, run by a core, a Vue and a React driver | behaviour drifting between the three, including the order of events | 9, 15 |
| 5 | Lifecycle scenarios | StrictMode, unmounting, shared pooled entities, an entity losing its class | 11, 15 |
| 6 | One consumer app without Vue, installed from `npm pack` | broken `exports`, `typesVersions` or peers | 4, 16 |

A shared scenario is written once. This one is ported from `overview-fetching.test.js`:

```js
export default (driver) => describe(`useSearchView [${driver.name}]`, () => {
    test("a slower earlier search does not overwrite the newer result", async () => {
        const service = deferredService("search")
        const view = await driver.searchView({ service, searchObject: {} })
        const first = view.call("searchHandler"), second = view.call("searchHandler")
        service.resolveWith(1, { items: [{ id: "fresh" }], count: 1 })
        service.resolveWith(0, { items: [{ id: "stale" }], count: 99 })
        await driver.settle(first, second)
        expect(view.read("items")).toEqual([{ id: "fresh" }])
    })
})
```

- `read` unwraps a ref for Vue and reads the latest render for React; `call` wraps the action in `act()` for React. The Vue and React drivers mount a real component with a memory router.
- The core driver's box freezes every array assigned to it, so an in-place edit throws there (rule 3).
- Every driver records the events a controller sends, as Vue emits or React callbacks, in order. A scenario that checks events checks the whole sequence, such as `changeState: pending`, `save`, `update:modelValue`, `changeState: saved`.
- A scenario file lists the drivers it runs on. `react` joins the list when that module's hook exists.

The lifecycle scenarios are new. Vue alone never needed them, and they pin the behaviour before React arrives:

- **Mounting:** one fetch per mount, and the right final state under React StrictMode's double mount in development.
- **Unmounting mid-request:** no state write after unmount, and no warning.
- **A shared pooled entity:** two views on one entity; an edit in one updates the other.
- **The class survives:** after form edits, `item instanceof Entity` holds and `$id` and `$title` still answer.
- **Owned collections:** two appends in the same tick keep both rows.

## Dependencies

- **The core:** none beyond today's `axios` and `date-fns`.
- **`react` and `react-dom`**, version floor per decision 2, and **`react-router`** (decision 1): optional peers, and dev dependencies for the tests.
- **Dev only:** `@vitejs/plugin-react` and `@testing-library/react`. Versions are pinned when the step that needs them is built.

## Decisions

1. **The React router: React Router or TanStack Router?**
   - React Router: the most used. A route's `handle` carries the name and meta, and `useMatches` reads them back.
   - TanStack Router: typed routes, but further from the named-route model the slices use.

   Recommendation: React Router.
2. **The lowest React version: 18 or 19?** `useSyncExternalStore` exists from 18. Supporting both doubles the React runs of the shared scenarios. Recommendation: 19 only, unless a known consumer app is on 18.

## Steps

### Phase 0: safety nets and the core module

1. **CI on every push and pull request.** A `test.yml` workflow runs `npm ci`, `npm run types`, `npm run build` and `npx vitest run`.
2. **An export snapshot.** A test imports every `vue/*` entry from `dist/` and snapshots its export names. With *scaffold.mjs output type-checks*, a change to what a Vue app uses fails CI.
3. **A boundary test.** `__tests__/packaging/boundaries.test.js` traces the imports of every built entry: `core` may reach no framework package, `react` no Vue package, and `vue/*` no React package.
4. **One consumer fixture.** `npm pack`, then install the tarball into `__tests__/fixtures/consumer-no-vue`, a TypeScript app with no Vue installed that imports `@regira/modules/core`. It runs `tsc --noEmit` and a Vite build, under its own `test:consumers` script, because it is slow.
5. **`src/core/` with the code that already has no Vue dependency.**
   - Move `entities/abstractions`, `config`, `describers`, `navigation`, `entities/utilities`, `http`, `ioc/ServiceProvider.ts`, `formatters`, the auth service files (`auth-service.ts`, `token-manager.ts`, `AuthData.ts`, `error-logging.ts`, `auth-axios.ts`), `lang/translate.ts` and `formatText.ts`. `auth-axios.ts` imports Pinia's `Store` type; the core version uses a structural type instead.
   - Move `toFeedbackError`, `fieldMessages` and `setErrorTranslator` too. Their default translator reads `useLang`'s refs, so the core version takes its default from a registration that `vue/ui/feedback` makes when it loads: a Vue app keeps its translated errors, and a React app registers its own translator or shows the server's text.
   - The `vue/*` paths re-export everything that moved; the snapshot from step 2 stays unchanged.
6. **Optional peers.** Mark `vue`, `vue-router` and `pinia` optional in `peerDependenciesMeta`.
7. **Remove `src/vue/ui/feedback/controls.jsx`.** It is imported nowhere.
8. **Docs and release.** `src/core/README.md` and its `ai/` set; the root `README.md` index; `package.json` `exports` and `typesVersions`; a `core` entry in the *Core* group of `MODULES` in `docs/sync-modules.mjs` (AGENTS.md §5). CHANGELOG bullet; minor version.

Done when the fixture builds without Vue, the export snapshot is unchanged, and every existing test passes.

### Phase 1: the logic moves into the core

9. **Drivers before code.**
   - Create `__tests__/contract/` with a core driver and a Vue driver.
   - Sort every existing test into one of three groups, and commit the table as `__tests__/contract/README.md`:
     - pure logic, which runs against the core only;
     - composable behaviour, which becomes a shared scenario;
     - Vue-only, such as SSR of `DefaultModal`, global registration and rendered components, which stays as it is.
   - Port the feedback, overview and pooling scenarios first.
10. **Prove the pattern on the feedback, the overview and the pool.**
    - Move them into the core under the rules, and wire the Vue layer.
    - Then write a throwaway React hook over the same core, with the notifying box, and test it under StrictMode with two components sharing one pooled entity.
    - If the box falls short, stop and settle that here, before another module moves.
11. **The lifecycle scenarios** from *Catching mismatches*, on the Vue driver.
12. **The remaining modules**, in order:
    1. lang
    2. route-overview: the query mapping and `toRouteValue`
    3. details: the load and its guard
    4. form
    5. owned collections and list input
    6. auth: the state, `onAuthenticated`, and `routeAllows` over a list of route meta

    Each module gets its scenarios first and moves second. After each, the scenarios pass on both drivers, and the export snapshot and the scaffold type-check are unchanged.

Done when those composables are thin wrappers and every scenario passes. Patch release.

### Phase 2: React hooks

13. **Tooling.** `@vitejs/plugin-react` limited to `src/react/**`; a `tsconfig.react.json` with `jsx: react-jsx`; the Vite entry and `exports` for `./react`; `react`, `react-dom` and `react-router` as optional peers.
14. **The React layer**: the box, `RegiraProvider`, a hook for every module Phase 1 moved, and the React Router glue, as *Design* describes.
15. **The React driver.** Each moved module's scenarios add `react` to their drivers, the lifecycle scenarios included.
16. **The consumer fixture** also imports the hooks, with a hand-written overview and form.
17. **Docs and release.** `src/react/README.md` and its `ai/` set (instructions and signatures, marked experimental), with MCP id `regira_modules.react`; the root `README.md` index; a `react` entry in `MODULES`. CHANGELOG bullet; minor version.

Done when every shared scenario runs on all three drivers and the fixture builds.

## Out of scope

- **A React UI kit, ejectable React skins, a React scaffold and a full React guide set.** The scaffold and skins are generated from the Vue guides and components (`scripts/build-entity-template.mjs`, `scripts/build-ui-template.mjs`), and the Vue guides alone are 16,505 lines. Matching them is a project of its own, for a separate proposal if a React app needs it.
- **The modal form, the tree, the lean views, and the paging, autocomplete, tabs and screen logic.** They serve the Vue UI kit and stay in `src/vue`.
- **An Angular layer.** It would be a third set of wrappers: a box backed by an Angular signal, and Angular Router glue. The core's rules mean it needs no change to the core; nothing here builds it.

## Considered and left out

- **A separate React port.** Every fix in the composables would have to be made twice, and nothing would show the copies drifting apart.
- **`@vue/reactivity` as the core's engine.** It runs without Vue and would hand back Vue refs with no wrapper. But Vue pins its copy exactly (3.5.43 here, through `@vue/runtime-core`), so an app can end up with two copies and silently lose reactivity; under pnpm the core's import may not resolve at all; and React, and later Angular, would need a bridge to Vue's deep proxies. The box function gives Vue the same refs with no dependency.
- **A router interface in the core.** Plain route values and callbacks cover what the core needs. The logic shaped by a router stays in its layer.
- **Typed event maps and type-parity tests.** Both layers wrap the same core types, and the shared scenarios compare the recorded events.
- **api-extractor reports.** The export snapshot and the existing scaffold type-check cover what Vue apps use, without a new tool.
- **MobX or Valtio.** Either would put a second reactivity system into every Vue app.
- **Separate npm packages.** `publish-npm.yml` publishes one package, and its guards assume it.

## Risks

- **Assigning instead of editing in place.** The three edits in `overview-core.ts` become assignments, so after a save or delete in the overview, `items` holds a new array. A Vue component that kept the old array keeps a stale one. The overview tests and the core driver's frozen arrays are the guard.
- **Casts in the Vue layer.** Each composable casts the core's boxes to `Ref<T>`, which they are at runtime. A wrong cast would still type-check; the Vue scenarios and the scaffold type-check are the guard.
- **React rendering.** StrictMode mounts twice in development, so fetches run twice there; the newest-wins guards keep the final state right. A box re-renders the whole component that uses it, which suits a form or a page of rows; step 10 measures it.
- **The pool under React.** A component that copies an entity into `useState` drops out of the pool without an error. The React guide says so, and the class-survival scenario guards it.
- **Phase 1 touches the central composables.** The export snapshot, the scaffold type-check, the shared scenarios and the existing tests are the guard, and each module moves in its own change.
- **Two guide sets.** Under AGENTS.md §1, a change to a moved composable's guide may need a React counterpart. The React guide covers the hooks only, which keeps that text short.
