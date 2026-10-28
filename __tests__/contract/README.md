# Shared scenarios

The logic of the Vue composables lives in `src/core` as framework-free controllers (`createFeedback`,
`createSearchView`, `createPoolHandler`, …), and the composables are thin wrappers over them. A scenario here is
written once and runs on every layer that wraps a controller, so the layers cannot drift apart.

## Layout

| File                         | What                                                                                     |
| ---------------------------- | ---------------------------------------------------------------------------------------- |
| `drivers.js`                 | the drivers, and `runOn(drivers, title, define)`                                         |
| `services.js`                | fake entity services: `deferredService`, `pagedService`, `heldService`                   |
| `feedback.test.js`           | `createFeedback` / `useFeedback`                                                         |
| `overview.test.js`           | `createOverviewCore`, `createSearchView`, `createListView` / their `use…` composables    |
| `search-view-append.test.js` | the search view's append mode                                                            |
| `pool.test.js`               | `createPoolHandler` and `PoolCache` / `usePooling`                                       |
| `describers.test.js`         | the registry of entity types, and the default namespace both layers share                |
| `drivers.test.js`            | the core driver's own guard                                                              |
| `react-spike.test.js`        | a throwaway React layer over the same controllers, under StrictMode; Phase 2 replaces it |

## Drivers

A scenario gets a driver and builds a controller through it: `driver.searchView(input)`, `driver.feedback(input)`,
`driver.pool({ service, type })`, … and reaches the controller's own state only through the view it gets back:

- `view.read("items")`, `view.read("feedback.status")`: a state value, unwrapped. A derived value, such as
  `hasMore`, reads the same on every driver: the core's is a function, Vue's a `computed`.
- `view.write("searchObject", value)`: assigns a state value, as a filter does.
- `view.call("searchHandler", true)`: an action; it returns what the action returns.
- `driver.settle(...promises)`: waits for the actions' promises.

An action that returns a box, as the pool's `get` and `fromCache` do, hands the scenario that box. The scenario
reads its `value`, which a box and a ref both have.

| Driver | Builds                                         | Boxes                                                                                                          |
| ------ | ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `core` | the controller, from `src/core`                | `frozenBox`: an array, or an object that is not an entity, is frozen when assigned, so an in-place edit throws |
| `vue`  | the composable, from `src/vue`, as an app does | the composable's refs: `vueBox`, a deep ref that keeps the rows behind an array raw                            |

`runOn(["core", "vue"], title, (driver) => { … })` lists the drivers a scenario runs on. A scenario about an input
only one layer takes, such as the core's `feedback` sink, lists that one. `react` joins the list when that module's
hook exists (Phase 2).

A driver reads values; it cannot see whether a Vue view would update. That is Vue's own and stays under
`__tests__/vue`: `box.test.js` holds `vueBox` to what `ref()` does, and `entities/overview-reactivity.test.js` checks
that the overview's state, its `hasMore` and its feedback react.

## Where every existing test belongs

Sorted in Phase 1, step 9. **logic** needs no Vue and runs against the core only; **scenario** is composable
behaviour and moves here, module by module, as the module's logic moves into the core (step 12); **vue-only** is
about Vue itself (rendering, SSR, plugins, `globalProperties`, `_template` components, scaffold output) and stays;
**packaging** reads the package as it ships and stays.

| File                                            | Tests | Group     | Module            | Status                                                                                                  |
| ----------------------------------------------- | ----- | --------- | ----------------- | ------------------------------------------------------------------------------------------------------- |
| `core/error-translator.test.js`                 | 3     | logic     |                   | stays                                                                                                   |
| `events/event-handler.test.js`                  | 4     | logic     |                   | stays                                                                                                   |
| `packaging/boundaries.test.js`                  | 7     | packaging |                   | stays: reads `src/core` and the built `dist/`                                                           |
| `packaging/exports.test.js`                     | 2     | packaging |                   | stays: snapshots every entry of the built `dist/` (one test per entry)                                  |
| `template/can-write.test.js`                    | 3     | vue-only  |                   | stays                                                                                                   |
| `template/details-reload.test.js`               | 2     | vue-only  |                   | stays                                                                                                   |
| `template/entity-attachments.test.js`           | 10    | vue-only  |                   | stays                                                                                                   |
| `template/input-selector.test.js`               | 15    | vue-only  |                   | stays                                                                                                   |
| `template/scaffold.test.js`                     | 88    | vue-only  |                   | stays                                                                                                   |
| `template/selector-dropdown.test.js`            | 1     | vue-only  |                   | stays                                                                                                   |
| `treelist/tree-list.test.js`                    | 11    | logic     |                   | stays                                                                                                   |
| `utilities/*.test.js` (6 files)                 | 114   | logic     |                   | stays                                                                                                   |
| `vue/auth/client-app.test.js`                   | 12    | mixed     | auth              | step 12: 2 scenario (`setClientApp`); 8 logic and 2 vue-only stay                                       |
| `vue/auth/error-logging.test.js`                | 24    | mixed     | auth              | step 12: 1 scenario (`useChangePasswordForm`'s log); 23 logic stay                                      |
| `vue/auth/form-labels.test.js`                  | 6     | vue-only  |                   | stays                                                                                                   |
| `vue/auth/global-is-required.test.js`           | 1     | vue-only  |                   | stays                                                                                                   |
| `vue/auth/login-form.test.js`                   | 5     | scenario  | auth              | step 12                                                                                                 |
| `vue/auth/modal-close.test.js`                  | 4     | vue-only  |                   | stays                                                                                                   |
| `vue/auth/on-authenticated.test.js`             | 20    | mixed     | auth              | step 12: 10 scenario (`onAuthenticated`, auth disabled); 10 vue-only (plugin install, pinia hooks) stay |
| `vue/auth/rehydration-ordering.test.js`         | 3     | vue-only  |                   | stays                                                                                                   |
| `vue/auth/revalidation-timer.test.js`           | 5     | vue-only  |                   | stays                                                                                                   |
| `vue/auth/roles.test.js`                        | 11    | mixed     | auth              | step 12: 1 scenario (store `hasRole`); 10 logic stay                                                    |
| `vue/auth/route-allows.test.js`                 | 4     | vue-only  |                   | stays                                                                                                   |
| `vue/auth/route-guard-first-navigation.test.js` | 3     | vue-only  |                   | stays                                                                                                   |
| `vue/auth/route-guard-identity-change.test.js`  | 3     | vue-only  |                   | stays                                                                                                   |
| `vue/auth/token-exposure.test.js`               | 6     | mixed     |                   | 4 logic and 2 vue-only stay                                                                             |
| `vue/auth/validate-token.test.js`               | 3     | logic     |                   | stays                                                                                                   |
| `vue/box.test.js`                               | 12    | vue-only  |                   | stays                                                                                                   |
| `vue/entities/archived-query.test.js`           | 8     | logic     |                   | stays                                                                                                   |
| `vue/entities/details-feedback.test.js`         | 7     | scenario  | details           | step 12                                                                                                 |
| `vue/entities/form-failures.test.js`            | 42    | mixed     | form              | step 12: 19 scenario (`useForm`); 23 `toFeedbackError` logic stay                                       |
| `vue/entities/form-insert-route.test.js`        | 3     | scenario  | form              | step 12; the core driver passes the route callbacks                                                     |
| `vue/entities/form-readonly.test.js`            | 2     | scenario  | form              | step 12                                                                                                 |
| `vue/entities/input-selector-inline.test.js`    | 8     | vue-only  |                   | stays                                                                                                   |
| `vue/entities/lift-dates.test.js`               | 6     | logic     |                   | stays                                                                                                   |
| `vue/entities/navigation.test.js`               | 3     | logic     |                   | stays                                                                                                   |
| `vue/entities/overview-fetching.test.js`        | 22    | scenario  | overview          | ported to `overview.test.js`                                                                            |
| `vue/entities/overview-reactivity.test.js`      | 8     | vue-only  | overview          | stays: what the drivers cannot see                                                                      |
| `vue/entities/owned-collection.test.js`         | 10    | scenario  | owned collections | step 12; its same-tick appends become a lifecycle scenario (step 11)                                    |
| `vue/entities/patch.test.js`                    | 3     | mixed     | pool              | the pool write ported to `pool.test.js`; 2 logic stay                                                   |
| `vue/entities/route-overview.test.js`           | 6     | scenario  | route-overview    | step 12; the core driver passes the route values                                                        |
| `vue/entities/save-dispatch.test.js`            | 9     | logic     |                   | stays                                                                                                   |
| `vue/entities/search-view-append.test.js`       | 12    | scenario  | overview          | ported to `search-view-append.test.js`                                                                  |
| `vue/entities/tree.test.js`                     | 2     | vue-only  |                   | stays: the tree is out of scope and stays in `src/vue`                                                  |
| `vue/formatters.test.js`                        | 16    | logic     |                   | stays                                                                                                   |
| `vue/global-registration.test.js`               | 2     | vue-only  |                   | stays                                                                                                   |
| `vue/http/axios-blob-error.test.js`             | 2     | logic     |                   | stays                                                                                                   |
| `vue/http/query-date.test.js`                   | 7     | logic     |                   | stays                                                                                                   |
| `vue/lang/format-text.test.js`                  | 4     | logic     |                   | stays; lang has no scenario yet, so step 12 writes its first                                            |
| `vue/ui/app-feedback.test.js`                   | 3     | vue-only  |                   | stays                                                                                                   |
| `vue/ui/autocomplete.test.js`                   | 27    | vue-only  |                   | stays                                                                                                   |
| `vue/ui/confirm-button.test.js`                 | 6     | vue-only  |                   | stays                                                                                                   |
| `vue/ui/date-input.test.js`                     | 4     | vue-only  |                   | stays                                                                                                   |
| `vue/ui/default-modal-ssr.test.js`              | 1     | vue-only  |                   | stays                                                                                                   |
| `vue/ui/default-modal.test.js`                  | 6     | vue-only  |                   | stays                                                                                                   |
| `vue/ui/error-summary.test.js`                  | 8     | vue-only  |                   | stays (one `fieldLabel` case is logic)                                                                  |
| `vue/ui/feedback.test.js`                       | 13    | mixed     | feedback          | 7 scenario ported to `feedback.test.js`; 3 `fieldMessages` logic and 3 reactivity tests stay            |
| `vue/ui/form-buttons-row.test.js`               | 4     | vue-only  |                   | stays                                                                                                   |
| `vue/ui/icon-keys-doc.test.js`                  | 1     | vue-only  |                   | stays                                                                                                   |
| `vue/ui/loading.test.js`                        | 4     | vue-only  |                   | stays                                                                                                   |
| `vue/ui/nullable-checkbox.test.js`              | 8     | vue-only  |                   | stays                                                                                                   |
| `vue/ui/paging.test.js`                         | 9     | vue-only  |                   | stays: paging serves the Vue UI kit                                                                     |
| `vue/ui/tab-container.test.js`                  | 12    | vue-only  |                   | stays                                                                                                   |

Counts are `test(` declarations; a `test.each` or a loop runs more. Paths are under `__tests__/`.
