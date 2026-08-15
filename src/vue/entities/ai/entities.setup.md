# Regira — Project setup & app shell

How to stand up a new `@regira/modules` Vue 3 app (Vite + Pinia + vue-router) — install, project
structure, the **entity slice anatomy**, runtime config, the canonical `main.ts` / `App.vue`, the
required-vs-optional plugin matrix, running without auth, and the app shell (components, infrastructure,
styling) that surrounds your entity slices. This is the single app-scaffolding file — reference-grade,
copy-pasteable, and self-contained (every shell component is inlined below). Verify any API in
[entities.signatures.md](entities.signatures.md) and the per-module guides.

The worked app shown throughout is `ShoppingManager` (`clientApp: "shopping-manager"`) — a `Product` slice
plus a `Category` lookup — so it lines up with the basic example.

> **A skeleton, not a dependency.** Copy these files into your repo and evolve them — they are a starting
> point to own and adapt, not something to vendor or symlink.

> **Reading order:** [entities.card.md](entities.card.md) (the index card — orient here first) →
> [entities.instructions.md](entities.instructions.md) → **entities.setup.md** (this
> file) → [entities.namespaces.md](entities.namespaces.md) → [entities.signatures.md](entities.signatures.md)
> → [entities.examples.md](entities.examples.md) (simple `UnitType` + standard `Product` slices) /
> [entities.advanced.example.md](entities.advanced.example.md) (complex slice) →
> [entities.patterns.md](entities.patterns.md) (recipes, load on demand).
>
> **Minimum viable read:** the card, then the workflow sections of `entities.instructions`. Everything after
> that is fetched by heading when the task needs it — `get_section_toc`, then the one heading. Loading a whole
> reference section is the exception, not the on-ramp.

## Install

Install from the npm registry — the published package ships a prebuilt `dist/`, and the `exports`
map makes the **plain package specifier resolve with no alias or tsconfig path**:

```jsonc
// package.json — npm install @regira/modules resolves the latest published version and writes the caret range
"dependencies": { "@regira/modules": "^…" /* latest — never pin a specific version by hand */ }
```

> Installs from the npm registry with a prebuilt `dist/` — no `git` binary, no on-install build. (Only
> when pinning an unreleased commit use `"@regira/modules": "github:Regira/Regira-Modules"`, which needs `git`
> on `PATH` and runs the full `prepare` build on install.)

```ts
import { EntityBase, EntityServiceBase } from "@regira/modules/vue/entities"
```

Peer deps: `vue`, `vue-router`, `pinia`, `axios`, `date-fns`.

> **First API request 404s?** Almost always the dev URL contract, not your code — point `config.json → api` at
> the API origin (add CORS), or align the Vite proxy prefix with the server route prefix. See
> [The URL contract](#the-url-contract--four-owners-one-request).

### Known-good dependency set

Skip `npm create vue` — it prompts interactively and can't be driven headless. Hand-author `package.json`
from the **known-good dependency set** below (copy it as-is, one `npm install`; do not resolve majors one at
a time); `scaffold.mjs --shell` then writes the rest of the toolchain (`index.html`, `vite.config.ts`,
`tsconfig*`, `env.d.ts`) — documented under _Tooling_:

```jsonc
// package.json — known-good set (runtime peers + the build toolchain they require)
"dependencies": {
  "@regira/modules": "*", // always the latest published version — npm install pins the caret range
  "vue": "^3.5", "vue-router": "^5", "pinia": "^3",
  "axios": "^1", "date-fns": "^4",
  "bootstrap": "^5.3", "bootstrap-icons": "^1.13"
},
"devDependencies": {
  "@types/node": "^26", "@vitejs/plugin-vue": "^6",
  "sass-embedded": "^1.100",   // compiles the app shell's src/assets/*.scss (Bootstrap 5)
  "typescript": "^6", "vite": "^8", "vue-tsc": "^3"
}
```

> **The toolchain moves as a set — don't mix majors.** `@regira/modules` declares `vue-router@^5`; adding
> `vue-router@4` (a common older default) fails `npm install` with `ERESOLVE`, and each individual fix just
> pulls in the next major (`vue-router 5` → `vite 8` → `typescript 6` / `vue-tsc 3`). The block above is
> that cascade already resolved. Optional extras that pair with it: `vitest 4`, `prettier 3`.

### Import specifiers

> Library code imports from `@regira/modules/...` (`@regira/modules/vue/http`, …); `@/...` is your own
> app alias for `src/`. Full specifier list: [entities.namespaces.md](entities.namespaces.md).

> **Optional — only if you vendor `dist/` yourself.** Vendoring lets you alias the package, so imports
> read `@/regira/vue/entities` instead. Add it in **both** places (order matters — the more
> specific alias first):
>
> ```ts
> // vite.config.ts → resolve.alias
> { find: "@/regira", replacement: fileURLToPath(new URL("./node_modules/@regira/modules/dist", import.meta.url)) },
> { find: "@", replacement: fileURLToPath(new URL("./src", import.meta.url)) },
> ```
>
> ```jsonc
> // tsconfig.app.json → compilerOptions.paths
> "@/regira/*": ["./node_modules/@regira/modules/dist/*"],
> "@/*": ["./src/*"]
> ```

### Tooling — `vite.config.ts`, `tsconfig`, `index.html`, `env.d.ts`

> `scaffold.mjs --shell` writes all of these ([entities.shell.template.md](entities.shell.template.md) →
> Toolchain). The snippets below document what it emits — and what to align when adapting an existing Vite
> project.

```ts
// vite.config.ts
import { fileURLToPath, URL } from "node:url"
import { defineConfig } from "vite"
import vue from "@vitejs/plugin-vue"

export default defineConfig({
    plugins: [vue()],
    resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
    define: { __APP_VERSION__: JSON.stringify(process.env.npm_package_version) },
    server: { port: Number(process.env.PORT) || 5173 }, // honor a harness/preview-assigned PORT (Vite ignores it by default)
})
```

#### tsconfig

```jsonc
// tsconfig.app.json
// Use `paths` WITHOUT `baseUrl` — `vue-tsc -b` (npm run build) errors on baseUrl (TS5101).
"compilerOptions": { "paths": { "@/*": ["./src/*"] } },
// `env.d.ts` MUST be in `include`, or CSS side-effect imports and `import.meta.env` fail to type-check.
"include": ["env.d.ts", "src/**/*.ts", "src/**/*.tsx", "src/**/*.vue"]
```

> **tsconfig & build note.** On TypeScript 6+ use `paths` **without `baseUrl`** — `vue-tsc -b` (what
> `npm run build` runs) errors on `baseUrl` (TS5101) even though `vue-tsc --noEmit` tolerates it, so
> always verify with `npm run build`, not only a `--noEmit` typecheck. `vue-tsc -b` also _emits_ `.js` next
> to your sources unless `compilerOptions.noEmit: true` is set in **both** project tsconfigs (the scaffold's
> already are; set it if you hand-author them, and add `*.tsbuildinfo` to `.gitignore`). If your tsconfig enables
> `erasableSyntaxOnly` (the current Vite `vue-ts` template default), define enum-like values as `const`
> objects + a value type instead of `enum`. `@vue/tsconfig` (0.9) ships `tsconfig.json` / `.dom.json` /
> `.lib.json` but **no `tsconfig.node.json`** — point `tsconfig.node.json` at the base
> `@vue/tsconfig/tsconfig.json` (a stale reference to the missing file errors with TS6053). Install `@types/node`
> as a devDependency so `vue-tsc -b` type-checks `vite.config.ts` (it imports `node:url`).

> ⚠️ **`verbatimModuleSyntax` (prescribed by both scaffolded tsconfigs) forbids `export default <a type>`.**
> A module that ends `interface Foo { … }` + `export default Foo` fails with
> `TS1284: An export default must reference a value`. Write `export type { Foo as default }` and import it
> as `import type Foo from "./foo"`. Classes are values, so the entity models are unaffected — this bites
> type-only modules (search-object shapes, DTOs, prop contracts).

#### `index.html` & the `#modals` host

```html
<!-- index.html — styles come from the npm bootstrap/bootstrap-icons imports in main.ts (see Styling) -->
<body>
    <div id="app"></div>
    <div id="modals" class="fixed-top"></div>
    <!-- modal teleport host (DefaultModal) -->
    <div id="loginModal" class="fixed-top"></div>
    <!-- LoginModal teleport target (auth-on) -->
    <script type="module" src="/src/main.ts"></script>
</body>
```

> **The `#modals` host is required — a missing one silently breaks every popup.** `DefaultModal` (hence
> `FormModalButton`, `ConfirmButton`, and every edit/create dialog) teleports into `#modals`; with no such
> `<div>` the teleport target is absent and the modal never mounts — no error, the trigger just looks dead.
> Two traps: `scaffold.mjs --shell` **won't overwrite** an existing (`npm create vue`) `index.html` without
> `--force`, and hand-authored files routinely omit the host. After scaffolding, confirm `#modals` (and
> `#loginModal` when auth is on) exist, then verify a modal actually opens.

> **You do not install a plugin to get modals.** `injectModal()` falls back to `DefaultModal`, so every
> generated dialog works with the `#modals` host alone. `modalPlugin` exists only to swap that component
> app-wide — including the library's own `injectModal()` call sites — for a custom skin; see
> `regira_modules.vue.ui` → `ui.customize`. A missing modal is a missing host, never a missing plugin.

`env.d.ts` keeps the Vite client types (and must be in the tsconfig `include`, above); declare the `__APP_VERSION__` define where `app-config.ts` reads it:

```ts
// env.d.ts
/// <reference types="vite/client" />
declare const __APP_VERSION__: string
```

App-specific globals (e.g. `$isAdmin`) go in `src/shims.d.ts` — see
[Root component — App.vue → Typing app globals](#typing-app-globals--srcshimsdts).

## Lean tier (generic views)

> **Opt-in path, not the default.** The default is the full scaffold ([Project structure](#project-structure)
> below); take the lean tier only on an explicit request — see
> [How much to build](entities.instructions.md#how-much-to-build).

The full per-entity slice (below) is the default for every app type — storefronts and demos included.
When the user asks for a lighter build, the **lean tier** pairs the per-entity data layer (model +
`config` + service + `SearchObject`, from [entities.template.md](entities.template.md)) with two generic
components the library ships — `EntityOverview` and `EntityForm` — bound to your columns and fields
through slots.

Create each service once over the shared axios:

```ts
// src/services.ts
import { initAxios } from "@regira/modules/vue/http"
import ProductService from "@/entities/products/data/EntityService"
import productConfig from "@/entities/products/config/config"

const axios = initAxios({ api: "/api" }) // one shared instance for the whole app
export const products = new ProductService(axios, productConfig)
```

```vue
<!-- src/views/Products.vue -->
<script setup lang="ts">
import { EntityOverview } from "@regira/modules/vue/entities"
import { products } from "@/services"
</script>

<template>
    <EntityOverview :service="products">
        <template #head>
            <th>Name</th>
            <th>Description</th>
        </template>
        <template #row="{ item, remove }">
            <td>{{ item.$title }}</td>
            <td>{{ item.description }}</td>
            <td><button class="btn btn-sm btn-outline-danger" @click="remove(item)">Delete</button></td>
        </template>
    </EntityOverview>
</template>
```

`EntityOverview` pages server-side through `service.search`; set `:page-size` (default 10) and restyle the
pager through the `#paging` slot.

`EntityForm` takes the same `:service` plus an `:id` (`"new"` inserts), exposes the loaded entity through
its default slot, and emits `saved` / `cancel`. Both rely only on the service contract, so a lean app shares
the full tier's data layer and can adopt the scaffold later without rework — a fallback for genuinely lean
apps, not a license to defer the default on a normal one.

For everything around the generic views — feedback banners, modals, confirm buttons, tabs, formatting —
keep importing the kit à la carte: see
[UI building blocks without the scaffold](#ui-building-blocks-without-the-scaffold) below.

### Headless quick-start (data layer only)

Also opt-in only. For a bespoke UI that just needs typed access to the API — no plugins, no shell:

```ts
import { initAxios } from "@regira/modules/vue/http"
import { EntityBase, EntityServiceBase, type IConfig } from "@regira/modules/vue/entities"

class Product extends EntityBase {
    id = 0
    name = ""
    get $id() {
        return this.id || "new"
    }
    get $title() {
        return this.name
    }
}
class ProductService extends EntityServiceBase<Product> {
    override toEntity(item: object): Product {
        return item instanceof Product ? item : Object.assign(new Product(), item || {})
    }
}

// api/searchUrl are relative to the axios baseURL; /search is the counted endpoint every controller exposes
const config: IConfig = { key: "product", routePrefix: "products", api: "/products", searchUrl: "/products/search", defaultPageSize: 20 }
const products = new ProductService(initAxios({ api: "/api" }), config)

const { items, count } = await products.search({ q: "blue", pageSize: 10 })
```

`baseQueryParams` ships **empty**. Add `{ includes: ["Lines"] }` — naming the flag, not `"All"` — only when
the API gates a nested **collection** behind `?includes=`, and only on a **complex API entity**
(`For<…, TSortBy, TIncludes>`, not the front-end `isComplex` page/modal flag; `Details` eager-loads every
registered include anyway, `List`/`Search` omit the gated ones by default). Two things it is _not_ for: a
**simple** entity binds no `?includes=` at all, and a **to-one relation shown on every list row** belongs in
the API's unconditional `e.Includes(...)` — asking for it per request just pulls every gated collection along.
The search object overrides these per call, and `includes: []` suppresses them for one request.

### UI building blocks without the scaffold

Headless means you own the **views** — not that you re-build the **primitives**. The UI kit imports à la
carte into any Vue 3 app (no plugins, no slice scaffold —
[ui.instructions](../../ui/ai/ui.instructions.md)); pair it with the service above instead of
hand-rolling a pager, spinner, feedback banner, or currency string:

```vue
<!-- src/views/Products.vue — a bespoke view that still reuses the kit -->
<script setup lang="ts">
import { ref, onMounted } from "vue"
import { Paging, ResultSummary, LoadingContainer, Feedback, useFeedback } from "@regira/modules/vue/ui"
import { PagingInfo } from "@regira/modules/vue/entities"
import { formatCurrency } from "@regira/modules/vue/formatters"
import { products, Product } from "@/services" // the headless data layer above

const items = ref<Product[]>([])
const count = ref(0)
const isLoading = ref(false)
const q = ref("")
const pagingInfo = ref(new PagingInfo(20)) // pageSize 20, page 1
const feedback = useFeedback()

async function search() {
    isLoading.value = true
    try {
        const result = await products.search({ q: q.value, ...pagingInfo.value })
        items.value = result.items
        count.value = result.count
    } catch {
        feedback.fail("Could not load products")
    } finally {
        isLoading.value = false
    }
}
onMounted(search)
</script>

<template>
    <input v-model="q" class="form-control" placeholder="Search…" @keyup.enter="search" />
    <Feedback :feedback="feedback" />
    <LoadingContainer :is-loading="isLoading">
        <div v-for="item in items" :key="item.id" class="card p-2 my-1">{{ item.$title }} — {{ formatCurrency(item.price) }}</div>
        <ResultSummary :visible-count="items.length" :total-count="count" />
        <Paging v-model="pagingInfo" :count="count" @change="search" />
    </LoadingContainer>
</template>
```

Same rule for the rest of the kit: pick-one modals (`DefaultModal` from `vue/ui/modal` +
`@regira/modules/style.css`), server-searchable pickers (`Autocomplete`), tabs (`TabContainer` +
`Tab.create`), confirm buttons (`ConfirmButton`), dates/numbers (`vue/formatters`), and hierarchies
(`TreeList` from `@regira/modules/treelist`) all work standalone. Hand-rolling one of these on a lean or
headless build is a deviation to declare, not a shortcut.

## Project structure

The full app template (mirrors the sample apps) — the **shell that surrounds your entity slices**. Each
`entities/<name>/` slice uses the same folder set (a lookup keeps the same folders, just thinner, with no
list UI); its file-by-file anatomy is [Entity slice anatomy](#entity-slice-anatomy) below.

The concrete, filled-in tree — `scaffold.mjs --shell` writes the **load-bearing baseline**; items marked
`(+)` are optional chrome you add on demand from the module guides (see
[App shell](#app-shell--components-infrastructure--styling)):

```
index.html                       # #app / #modals / #loginModal mounts (Bootstrap CSS imported in main.ts)
vite.config.ts                   # @ → ./src alias
tsconfig.app.json                # paths: { "@/*": ["./src/*"] }  (no baseUrl — see Install § Tooling)
env.d.ts                         # /// <reference types="vite/client" />
public/
  config.json                    # runtime config (env-keyed api, title, navigation, flags) — see Runtime config
  data/translations.json         # i18n messages (key-first) — see Runtime config
src/
  shims.d.ts                     # $configs + app-specific globals ($isAdmin) — see Root component
  app-config.ts                  # loads + types public/config.json (createConfig / useConfig) — see Runtime config
  main.ts                        # bootstrap — see Bootstrap
  App.vue                        # root shell — see Root component
  assets/{theme.scss,images/}      # theme.scss = the app theme (tokens + overrides) — see Bootstrap (styling)
  router/
    index.ts                     # re-export routerFactory
    router.ts                    # routerFactory(entityRoutes)
    routes.ts                    # static routes (home, account/auth, password reset, error pages)
  views/                         # HomeView / NotFound / Forbidden / Unauthorized · AccountView + ResetPasswordView (auth builds)
  components/                    # shared UI shell — see App shell
    entity-navigation/           #   Dashboard / NavBar / NavSearch (built from $configs) + useNavigation()
      index.ts  functions.ts
    input/        index.ts       #   (+) app-specific inputs (common FormButtonsRow/DescriptionInput ship in vue/ui)
    layout/                      #   TheHeader / TheFooter / Main · AppModal / LangSelector / Offline (+)
    users/                       #   ForgotPasswordForm (auth-on) · (+) the rest of the account UI
  infrastructure/                # small app-wide plugins/helpers — see App shell (keep it basic)
    permissions.ts               #   permission constants
    user-plugin.ts               #   $isAdmin + persists chosen language
  entities/
    index.ts                     # aggregates every entity plugin + collects routes — see Add entities
    products/                    # full slice — anatomy below, code in entities.examples.md
    categories/                  # lookup slice — same folders, thinner files
    <name>/                      # one slice per entity — same folder set for all (anatomy below)
```

## Entity slice anatomy

Each entity is a self-contained vertical slice — the **same folder set for every entity** (a lookup keeps
every folder, just with thinner files). Create `src/entities/<name>/`:

```
src/entities/<name>/             # one entity slice — copy this folder set for every entity
    config/
        config.ts (c)            # IConfig object (api URLs, key, paging)
    data/
        Entity.ts (c)            # model class — extends EntityBase (fields + $id/$title)
        EntityService.ts         # extends EntityServiceBase<Entity> { toEntity } + custom endpoints
        store.ts                 # Pinia store — createStore(get(Entity.name)!, Entity.name)
    details/
        Details.vue              # useDetails — loads item by :id, hosts Fiche/Form
        Form.vue (c)             # useForm — create / edit form
        FormModalButton.vue      # opens the Form in a modal
    filter/
        Filter.vue               # useFilter — filter shell (inline + advanced modal)
        FilterAdv.vue (c)        # advanced search form
        FilterInline.vue         # inline keyword search bar
        SearchObject.ts (c)      # extends SearchObjectBase — filter / query model
    overview/
        List.vue (c)             # results table (header + rows)
        ListItem.vue (c)         # one result row
        Overview.vue             # useSearchView + useRouteOverview (useListView only for a count-less lookup)
    selecting/
        Autocomplete.vue         # type-ahead search input
        InputSelector.vue        # single-item picker
        Selector.vue             # multi-item picker (chips) — relation picker for this entity
        SelectorDropdown.vue     # simple <select> from cache
        SelectorList.vue (c)     # selectable results list
        SelectorModalButton.vue  # opens the search / select modal
        SelectorSearch.vue       # search UI inside the selector modal
    index.ts                     # barrel: re-exports (config, Entity, service, Selector, plugin)
    setup.ts                     # createRoutes() + addServices() + addIcons() + default install plugin
```

> `(c)` marks the files you customize per entity; the rest is near-identical boilerplate you copy as-is
> (a blank fill-in scaffold with a placeholder per file is [entities.template.md](entities.template.md);
> full slice code in [entities.examples.md](entities.examples.md)). Fill the `(c)` files in this order —
> **`Entity.ts` → `config.ts` → `SearchObject.ts` → `FilterAdv.vue` → `List.vue` → `ListItem.vue` →
> `Form.vue` → `SelectorList.vue`** (the
> [Entity Implementation Workflow](entities.instructions.md#entity-implementation-workflow) details each). Everything
> **around** the slice — the `src/entities/` aggregator ([Add entities](#add-entities)), `components/` and
> `infrastructure/` ([App shell](#app-shell--components-infrastructure--styling)), the [Router](#router),
> and [Runtime config](#runtime-config--publicconfigjson) — is the project template.

### Slice conventions

> **Cross-slice imports use the barrel's generic names.** It re-exports the model as `Entity` and the relation
> picker as `InputSelector` (never the entity's class name); from a sibling slice import
> `import type { Entity as Employee } from "@/entities/employees"` for the model and
> `import { InputSelector as EmployeeInputSelector } from "@/entities/employees"` for the component —
> importing by the class name is the `TS2305 "has no exported member"` trap. Keep the model import in the
> **erased** `import type { … }` form: the inline `import { type … }` survives to runtime under
> `verbatimModuleSyntax`, and two slices that reference each other then form a barrel cycle that only the dev
> server reports (`Cannot access 'Entity' before initialization`; `vue-tsc` and `npm run build` stay green).
>
> ⚠️ A **value** import (`InputSelector`, `FormModalButton`, `useEntityStore`) has no erased form, so it is
> the edge that can still cycle. The barrel is entirely static, and pulling it evaluates that slice's
> `data/store.ts`, which reads `Entity.name` immediately. One direction is fine — `--rel` relies on it. When
> two slices each need a **value** from the other, break the second edge with a deep import of the module
> itself (`@/entities/employees/details/FormModalButton.vue`, `@/entities/employees/data/store`).

> **Title-agnostic, archive-agnostic by default.** The display boilerplate (overview rows, selectors)
> renders `item.$title` — the accessor every `Entity` implements — so point `$title` at your label field in
> `data/Entity.ts` (it defaults to `title`) and the slice works whether or not the entity has a `title`. The
> `(c)` `Form.vue` / `FilterAdv.vue` ship a `title`/`name` example field and filter input — replace them with
> your entity's real fields. Archivable UI (the Delete↔Restore toggle in `FormButtonsRow`) auto-detects
> `isArchived`, so it simply stays hidden for non-`IArchivable` entities — nothing to gate.

## Runtime config — `public/config.json`

```json
{ "api": "https://localhost:5001", "culture": "en-US", "clientApp": "my-app", "loginUrl": "https://accounts.example.com/login" }
```

`clientApp` is the JWT audience and rides the login request automatically (`login()` appends `?clientApp=`);
`loginUrl` only overrides the endpoint path. Never write a `{clientApp}` placeholder into it — nothing
substitutes it at runtime.

If you use the language plugin (`$t`), also add `public/data/translations.json`. Its shape is
**key-first** — `Record<key, Record<langCode, string> | string>` — _not_ language-first (a wrong guess
makes every `$t()` render the raw key):

```json
{
    "signIn": { "en": "Sign in", "nl": "Aanmelden" },
    "save": { "en": "Save", "nl": "Bewaren" },
    "appName": "ShoppingManager"
}
```

See [lang.signatures.md](../../lang/ai/lang.signatures.md) (`ITranslationMessages`).

Framework chrome emits its own keys (`keywords`, `new`, `noResults`, `deleteItem`, `filtersAreApplied`,
`overview`, `popOut`, `signIn`/`signOut`); `scaffold.mjs --shell` seeds them in `translations.json` — add your
domain labels alongside, or blank UI text renders the raw key.

### Typed config loader — `src/app-config.ts`

For anything beyond a toy app, load `config.json` through a small `app-config.ts` so values can be
**environment-keyed** (per Vite `MODE`) and read anywhere via `useConfig()`:

```jsonc
// public/config.json — `api` may be a flat string or an object keyed by Vite MODE
{
    "clientApp": "shopping-manager",
    "api": { "development": "https://localhost:7001", "production": "/api" },
    "includeCredentials": false,
    "title": { "en": "ShoppingManager" },
}
```

```ts
// src/app-config.ts
const { BASE_URL, MODE } = import.meta.env
const appConfig: Record<string, any> = { baseUrl: BASE_URL.replace(/\/$/, ""), env: MODE }

// pick the env-specific value when a key is keyed by MODE, else the value as-is
const pick = (cfg: any, key: string) => cfg[key]?.[appConfig.env] ?? cfg[key]

export function createConfig(raw: Record<string, any>) {
    for (const key of Object.keys(raw)) appConfig[key] = pick(raw, key)
    return appConfig
}
export function useConfig() {
    return appConfig
}
export default appConfig
```

`main.ts` then does `fetch(\`${appConfig.baseUrl}/config.json\`)`→`createConfig(raw)`→`initAxios({ api, includeCredentials })`before installing plugins. The minimal flat`config.json`above
still works;`app-config.ts` just adds env-selection and a typed accessor.

### Calling the API in dev — HTTPS redirect

The `BasicApi` server template calls `app.UseHttpsRedirection()`, so a request to the HTTP port
307-redirects to the HTTPS port and the browser blocks the SPA on the untrusted dev certificate. Pick one:

- **Trust the dev cert** and keep `api` on the HTTPS port: `dotnet dev-certs https --trust`.
- **Proxy through Vite** — route `/api` to the API and set `config.json` `api` to `/api`:
    ```ts
    // vite.config.ts → server.proxy
    server: { proxy: { "/api": { target: "https://localhost:7001", changeOrigin: true, secure: false } } }
    ```
- **Skip the redirect in Development** on the API: `if (!app.Environment.IsDevelopment()) app.UseHttpsRedirection();`.

### Simplest dev setup — direct origin + CORS

While iterating, skip the Vite proxy: point `config.json → api` at the API origin
(e.g. `https://localhost:7001/api`) and enable CORS on the API (`AllowAnyOrigin` in Development). Only two of
the four owners below then apply — axios base and each entity's relative `IConfig.api` — with no proxy prefix
or route-prefix to align. Switch to the proxy contract when you want the SPA and API on one origin (cookie auth).

### The URL contract — four owners, one request

Four settings each own a segment of the final request URL; misalign one and every call 404s. Align them
up front:

| Segment             | Owned by                                                                               | Example                           |
| ------------------- | -------------------------------------------------------------------------------------- | --------------------------------- |
| axios base          | `config.json → api` → `initAxios({ api })`                                             | `/api`                            |
| resource path       | each entity's `IConfig.api` — **relative to the axios base**                           | `/products`                       |
| dev proxy           | `vite.config.ts → server.proxy` (only when `api` is a relative path)                   | `/api` → `https://localhost:7001` |
| server route prefix | back-end host config or a route-prefix convention (controllers stay resource-relative) | `api`                             |

Resolution: `products.search()` → axios base `/api` + `IConfig.api` `/products` + `/search` =
**`/api/products/search`** → Vite proxy → `https://localhost:7001/api/products/search` → server prefix
`api` + `[Route("products")]`. The two classic mismatches:

- `IConfig.api` repeats the base (`/api/products` → requests go to `/api/api/products`) — keep it relative.
- The proxy forwards `/api/*` but the API serves controllers at root — add the prefix **once** on the
  back-end: `builder.Services.AddControllers(o => o.Conventions.Add(new RoutePrefixConvention("api")));`
  (controllers stay resource-relative; full convention in `Regira.Entities` → `entities.setup` → _API route
  prefix_). Or skip the proxy and point `config.json → api` straight at the API origin (then configure CORS).

Multi-word resources are **kebab-case plural** on both sides: `InterventionType` → `[Route("intervention-types")]`
and `api: "/intervention-types"`. `scaffold.mjs` derives that spelling from the class name; pass `--api <path>`
when the server exposes the resource under a different name than the slice folder.

### Navigation map

Beyond `api`/`title`/`clientApp`, the shell-specific part is the **`navigation`** map that
`useNavigation()` ([App shell](#app-shell--components-infrastructure--styling)) turns into the dashboard
and navbar. Each `icon` is a **registered friendly key** or a **raw `bi bi-*` class** — a bare unknown name
(`rocket`) logs a warning and renders nothing:

```jsonc
{
    "clientApp": "shopping-manager",
    "loginUrl": "https://accounts.example.com/auth/",
    "api": { "development": "https://localhost:7001", "production": "/api" },
    "includeCredentials": false,
    "title": { "en": "ShoppingManager", "nl": "ShoppingManager" },
    "navigation": {
        "groups": [
            { "id": "Catalog", "title": "catalog", "icon": "catalog" },
            { "id": "Inventory", "title": "inventory", "icon": "inventory" },
        ],
        "dashboard": [
            ["Catalog", ["Product", "Category"]],
            ["Inventory", ["Supplier"]],
        ],
        "navbar": ["Product", ["Catalog", ["Category"]]],
        "search": "Product",
    },
}
```

- `groups` — menu sections (each `id` is referenced by `dashboard`/`navbar`).
- `dashboard` — `Array<[groupId, entityKeys]>` for the home grid (`importDashboard`).
- `navbar` — `Array<entityKey | [groupId, entityKeys]>` for the top bar; a tuple becomes a submenu
  (`importNavbar`).
- `search` — the entity `key` whose Autocomplete powers the global search bar (read by
  `useNavigation().searchItemConfig`); omit it if there is no global search.

**Entity keys here are each slice's `config.key`** — the literal string in its `config.ts` (conventionally the
class name; **not** `Entity.name`, which is minified in a build), not the route or kebab plural. A key that
matches no registered slice (`"products"` instead of `"Product"`) is skipped with a console warning. The shapes are confirmed in
[entities.patterns.md — Navigation from the config map](entities.patterns.md#navigation-from-the-config-map).

## Router

Split the static (app-owned) routes from the entity routes the slices push at startup. The minimal form is
a single `routerFactory`; the full template splits it across `src/router/`.

**Minimal:**

```ts
import { createRouter, createWebHistory, type RouteRecordRaw } from "vue-router"

const staticRoutes: Array<RouteRecordRaw> = [
    { path: "/", name: "home", component: () => import("@/views/Home.vue"), meta: { allowAnonymous: true } },
    { path: "/forbidden", name: "forbidden", component: () => import("@/views/Forbidden.vue"), meta: { allowAnonymous: true } },
]

export function routerFactory(entityRoutes: Array<RouteRecordRaw>) {
    return createRouter({ history: createWebHistory(import.meta.env.BASE_URL), routes: [...staticRoutes, ...entityRoutes] })
}
```

**Full template — `src/router/`** (static routes split out, account/auth + error pages):

```ts
// src/router/index.ts
export { default, default as routerFactory } from "./router"
```

```ts
// src/router/router.ts
import { createRouter, createWebHistory, type RouteRecordRaw } from "vue-router"
import staticRoutes from "./routes"

export default function routerFactory(entityRoutes: Array<RouteRecordRaw>) {
    return createRouter({
        history: createWebHistory(import.meta.env.BASE_URL),
        routes: [...staticRoutes, ...entityRoutes],
        linkActiveClass: "active",
    })
}
```

```ts
// src/router/routes.ts — home, account, password reset, and the error pages (login is the App.vue modal, not a route)
import type { RouteRecordRaw } from "vue-router"
import HomeView from "@/views/HomeView.vue"
import AccountView from "@/views/AccountView.vue"
import ResetPasswordView from "@/views/ResetPasswordView.vue"
import NotFound from "@/views/NotFound.vue"
import Forbidden from "@/views/Forbidden.vue"
import Unauthorized from "@/views/Unauthorized.vue"

const routes: Array<RouteRecordRaw> = [
    { path: "/", name: "home", component: HomeView },
    { path: "/account", name: "account", component: AccountView },
    // the recovery mail links here — allowAnonymous, or the visitor who forgot their password can't reach it
    { path: "/reset-password", name: "resetPassword", component: ResetPasswordView, meta: { allowAnonymous: true } },
    { path: "/401", name: "unauthorized", component: Unauthorized, props: (to) => ({ url: to.query.url }), meta: { allowAnonymous: true } },
    { path: "/403", name: "forbidden", component: Forbidden, props: (to) => ({ url: to.query.url }) },
    { path: "/404", name: "notFound", component: NotFound, props: (to) => ({ url: to.query.url }), meta: { allowAnonymous: true } },
    {
        path: "/:pathMatch(.*)*",
        name: "catchAll",
        redirect: (from) => ({ name: "notFound", query: { url: from.fullPath } }),
        meta: { allowAnonymous: true },
    },
]

export default routes
```

> `meta: { allowAnonymous: true }` opts a route out of the auth guard. Anything **without** it is treated
> as protected (the auth store reports it "required"), which is what gates the `LoginModal` in
> [Root component](#root-component--appvue).

## Bootstrap — main.ts

Fetch config first, create the shared axios, then install plugins in this order. This is the **canonical**
`main.ts` — the full plugin-install order; do not duplicate it elsewhere.

```ts
import { createApp } from "vue"
import { createPinia } from "pinia"
import type { RouteRecordRaw } from "vue-router"
import { initAxios } from "@regira/modules/vue/http"
import { plugin as servicesPlugin, type IServiceProvider } from "@regira/modules/vue/ioc"
import { plugin as appPlugin, AppStatus, whenAppReady } from "@regira/modules/vue/app"
import { plugin as langPlugin, useLang } from "@regira/modules/vue/lang"
import { iconPlugin, screenPlugin, loadingPlugin, feedbackPlugin } from "@regira/modules/vue/ui"
import { focus, grow, clickOutside } from "@regira/modules/vue/directives"
import "bootstrap/dist/css/bootstrap.min.css"
import "bootstrap-icons/font/bootstrap-icons.css"
import "@regira/modules/style.css" // library component styles (modal backdrop, autocomplete dropdown) + --rg-* theme tokens
import "@/assets/theme.scss" // the app theme — after bootstrap + regira styles so its overrides win
import { plugin as authPlugin, LocalStorageTokenManager } from "@regira/modules/vue/auth"
import { preloaderPlugin, defaultPoolCache, PoolCache } from "@regira/modules/vue/entities"
import { plugin as debugPlugin } from "@regira/modules/vue/debug"
import dateExtensions from "@regira/modules/extensions/date-extensions"
import entityPlugins from "@/entities"
import { routerFactory } from "@/router"
import App from "@/App.vue"
import loadingImg from "@/assets/loading.gif"

dateExtensions.use() // serialize dates to JSON without timezone shift

fetch("/config.json")
    .then((r) => r.json())
    .then(async (config) => {
        const axios = initAxios({ api: config.api, includeCredentials: config.includeCredentials })
        const translations = await fetch("/data/translations.json").then((r) => r.json())

        const app = createApp(App)
        app.use(createPinia())
        app.use(appPlugin, { culture: config.culture })

        // IoC: register the shared axios + the entity pool cache
        app.use(servicesPlugin, {
            configure: (sp: IServiceProvider) => sp.add("axios", () => axios).add(PoolCache.name, () => defaultPoolCache),
        })

        // UI plugins
        app.use(iconPlugin, { source: "bs" })
        app.use(screenPlugin)
        app.use(loadingPlugin, { img: loadingImg })
        app.use(feedbackPlugin, { autoHideDelay: 2500 })
        app.use(langPlugin, { defaultLang: "en", messages: translations })
        const { setLangCode } = useLang()

        // directives
        app.use(focus)
        app.use(grow)
        app.use(clickOutside)

        // entities collect their routes, then build the router
        const entityRoutes: Array<RouteRecordRaw> = []
        app.use(entityPlugins, { routes: entityRoutes })
        app.use(routerFactory([...entityRoutes]))
        app.use(preloaderPlugin)
        app.use(debugPlugin, { isDebug: config.isDebug }) // provides $isDebug, read by <Debug>; needs the router; shows only when ?debug=1 / isDebug

        // auth last (needs the router on the app)
        app.use(authPlugin, {
            axios,
            tokenManager: new LocalStorageTokenManager(),
            clientApp: config.clientApp,
            loginUrl: config.loginUrl,
            onAuthenticationChange: (auth) => {
                app.config.globalProperties.$setAppStatus(auth.isAuthenticated ? AppStatus.Ready : AppStatus.Init)
                if (auth.isAuthenticated && auth.culture) setLangCode(auth.culture.split("-")[0])
            },
        })

        app.config.globalProperties.$setAppStatus(AppStatus.Mounting)
        app.mount("#app")
        await whenAppReady()
    })
```

### Plugin install order & required IoC registration

> **Install order matters:** the `$services` / `$configs` / `$icons` globals must exist before any entity
> plugin installs, so install Pinia, `appPlugin`, `servicesPlugin` (axios + `PoolCache`; it also creates the
> `$configs` map) and `iconPlugin` **first**; then the entity plugins **before** `routerFactory` (so their
> routes are collected); and the **router before `authPlugin`** (the auth plugin reads `$router` for its
> route guard).

> **Required IoC registration (the #1 wiring pitfall).** The `configure` block above is mandatory: every
> entity service resolves `axios` from the container, and `EntityServiceBase` throws a descriptive error at
> construction when it is missing. Register `PoolCache` alongside it for the shared entity cache. `configure`
> must **return** the `IServiceProvider` (the chained `.add(...).add(...)` returns it; a multi-statement body
> needs an explicit `return sp` or it fails type-check with TS2769).

### Full-shell additions

The full app shell adds two things on top of that canonical file, right after the UI plugins (and the
last one after `authPlugin`). Components (`FormSection`, `DescriptionInput`, `Icon`, …) are **not**
registered globally by default — every view imports what it uses from `@regira/modules/vue/ui`. (To opt
into app-wide registration for the plugin components, call
`configureGlobals({ registerComponentsGlobally: true })` from `@regira/modules/vue/ioc` before the
`app.use(...)` calls.)

```ts
// 1. seed icons from a JSON map (group icons referenced by config.json → navigation.groups[].icon)
const appIcons = await fetch(`${appConfig.baseUrl}/data/app-icons.json`).then((r) => r.json())
app.use(iconPlugin, { icons: appIcons, source: "bs", clearFirst: false })

// 2. app-wide glue (after authPlugin, since it reads the auth store)
import { plugin as userPlugin } from "@/infrastructure/user-plugin"
app.use(userPlugin)
```

## Root component — App.vue

`$feedback`, `$appStatus`, `$auth`, and `$t` are globals from the plugins above. This is the **canonical**
(minimal) root shell:

```vue
<script setup lang="ts">
import { computed, ref, watch } from "vue"
import { RouterView } from "vue-router"
import { Feedback, LoadingContainer } from "@regira/modules/vue/ui"
import { LoginModal, LoginForm, ForgotPasswordModal, useAuthStore } from "@regira/modules/vue/auth"
import ForgotPasswordForm from "@/components/users/ForgotPasswordForm.vue"
import { AppStatus } from "@regira/modules/vue/app"

const authStore = useAuthStore()
const showLogin = computed(() => authStore.isRequired && !authStore.isAuthenticated)

// LoginForm's "Forgot password?" button only EMITS — unhandled, it is a dead button
const forgotUsername = ref<string>()
const showForgot = ref(false)
function handleForgotPassword(username?: string) {
    forgotUsername.value = username
    showForgot.value = true
}
// the v-if below only HIDES the recovery step; clear it too, or returning to a protected route reopens it
watch(showLogin, (gateOpen) => {
    if (!gateOpen) showForgot.value = false
})
</script>

<template>
    <Feedback :feedback="$feedback" :enable-error-popup="true" />
    <LoadingContainer :is-loading="$appStatus !== AppStatus.Ready && (!$auth.enabled || $auth.isAuthenticated)">
        <RouterView />
    </LoadingContainer>

    <!-- v-if, not :is-visible — unmounting removes mask + dialog atomically; a bound-but-mounted
         modal can strand its leave-transition and leave an invisible click-swallowing mask -->
    <LoginModal v-if="showLogin && !showForgot" :title="$t('signIn')">
        <LoginForm @forgot-password="handleForgotPassword" />
    </LoginModal>
    <!-- `showLogin &&` keeps the recovery modal from stranding over an app authenticated by another path -->
    <ForgotPasswordModal v-if="showLogin && showForgot" :username="forgotUsername" @close="showForgot = false" v-slot="{ username }">
        <ForgotPasswordForm :username="username" @login="showForgot = false" />
    </ForgotPasswordModal>
</template>
```

### Variant — full-chrome App.vue

The full template wraps the same gates in Header / Main / Footer chrome and teleports the login modal to
`#loginModal`. Use this **instead of** the minimal version above (it is a variant, not a second canonical):

```vue
<script setup lang="ts">
import { computed, ref, watch } from "vue"
import { Feedback, LoadingContainer } from "@regira/modules/vue/ui"
import { LoginModal, LoginForm, ForgotPasswordModal, useAuthStore } from "@regira/modules/vue/auth"
import ForgotPasswordForm from "@/components/users/ForgotPasswordForm.vue"
import { AppStatus } from "@regira/modules/vue/app"
import TheHeader from "@/components/layout/TheHeader.vue"
import TheFooter from "@/components/layout/TheFooter.vue"
import Main from "@/components/layout/Main.vue"

const authStore = useAuthStore()
const showLogin = computed(() => authStore.isRequired && !authStore.isAuthenticated)

const forgotUsername = ref<string>()
const showForgot = ref(false)
function handleForgotPassword(username?: string) {
    forgotUsername.value = username
    showForgot.value = true
}
watch(showLogin, (gateOpen) => {
    if (!gateOpen) showForgot.value = false
})
</script>

<template>
    <div class="page">
        <header class="container-fluid bg-light"><TheHeader /></header>

        <section class="container-fluid position-relative overflow-hidden">
            <Feedback :feedback="$feedback" :enable-error-popup="true" />
        </section>

        <main class="container-fluid">
            <LoadingContainer :is-loading="$appStatus !== AppStatus.Ready && (!$auth.enabled || $auth.isAuthenticated)">
                <Main />
            </LoadingContainer>
        </main>

        <footer class="container-fluid bg-light"><TheFooter /></footer>

        <Teleport to="#loginModal">
            <LoginModal v-if="showLogin && !showForgot" :title="$t('signIn')">
                <LoginForm @forgot-password="handleForgotPassword" />
            </LoginModal>
            <ForgotPasswordModal v-if="showLogin && showForgot" :username="forgotUsername" @close="showForgot = false" v-slot="{ username }">
                <ForgotPasswordForm :username="username" @login="showForgot = false" />
            </ForgotPasswordModal>
        </Teleport>
    </div>
</template>
```

`Main.vue` is just the router outlet — keeping it a named layout slot leaves room for a sidebar later:

```vue
<!-- src/components/layout/Main.vue -->
<script setup lang="ts">
import { RouterView } from "vue-router"
</script>
<template><RouterView /></template>
```

### Typing app globals — `src/shims.d.ts`

The library declares its own globals on `@vue/runtime-core` (`$services`, `$configs`, `$icons`,
`$appStatus`/`$setAppStatus`, `$feedback`, `$t`/`$tm`, `$auth`, …), so those are typed in templates and
`this` automatically. Only **app-specific** globals need a one-file ambient declaration (TypeScript picks
up `src/**/*.d.ts` automatically) — the full template declares the `user-plugin` global:

```ts
// src/shims.d.ts
declare module "@vue/runtime-core" {
    interface ComponentCustomProperties {
        $isAdmin: boolean // provided by infrastructure/user-plugin.ts — see App shell
    }
}
export {}
```

## Plugins — required vs optional

The entities layer needs only a few globals; install the rest as you actually use them. Install order
still matters where dependencies exist (see [Bootstrap — main.ts](#bootstrap--maints)).

| Plugin                                       | Provides                                      | Status for the entities layer                                                                                                               |
| -------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `createPinia()`                              | Pinia stores                                  | **Required** (app store, entity stores, auth store)                                                                                         |
| `appPlugin` (`vue/app`)                      | `$appStatus` / `$setAppStatus`, `$culture`    | **Required** — the startup lifecycle and loading gate                                                                                       |
| `servicesPlugin` (`vue/ioc`)                 | `$services` IoC + `get()`; creates `$configs` | **Required** — register the shared `axios` and `PoolCache` here; services resolve from here                                                 |
| entity plugins (`@/entities`)                | routes + service registrations + `$configs`   | **Required** — your slices                                                                                                                  |
| `routerFactory` (vue-router)                 | routing                                       | **Required** for multi-view slices                                                                                                          |
| `iconPlugin` (`vue/ui`)                      | `$icons`                                      | Required if your views/nav render icons (the demos do)                                                                                      |
| `feedbackPlugin` (`vue/ui`)                  | `$feedback`                                   | Required if you use the `Feedback` component (the demo `App.vue` does)                                                                      |
| `loadingPlugin` (`vue/ui`)                   | the image `Loading`/`LoadingContainer` render | Required if you use `LoadingContainer` (the demo `App.vue` does). **Must pass `{ img }`** when installed: `app.use(loadingPlugin, { img })` |
| `langPlugin` (`vue/lang`)                    | `$t` i18n                                     | Optional — only if you render translated labels                                                                                             |
| directives (`focus`, `grow`, `clickOutside`) | template directives                           | Optional — only where used                                                                                                                  |
| `preloaderPlugin` (`vue/entities`)           | route preloading                              | Optional                                                                                                                                    |
| `authPlugin` (`vue/auth`)                    | bearer auth + `$auth`                         | **Optional** — see [Running without authentication](#running-without-authentication)                                                        |

> **`debugPlugin` (`vue/debug`) — install it.** The scaffolded `Overview.vue`, `Filter.vue` and
> `SelectorSearch.vue` import `<Debug>`, which renders only when `$isDebug` is true — and `$isDebug` is
> what `debugPlugin` provides. The canonical `main.ts` installs it **after the router** (its `$isDebug`
> getter reads `$router`). It is inert in production: `<Debug>` renders nothing unless `?debug=1` or the
> `isDebug` option is set.

> **Icon fonts aren't bundled.** `iconPlugin({ source: "bs" })` only emits Bootstrap-Icons class names
> (`bi bi-*`); the `bootstrap-icons` CSS must be imported in `main.ts`
> (`import "bootstrap-icons/font/bootstrap-icons.css"` — the scaffolded `main.ts` does) or every icon
> renders blank. (`source: "fa"` → Font Awesome the same way.)

> **No global component registration.** Library components and the scaffolded views import everything they
> use (`Icon`, `IconButton`, `DefaultModal`, form inputs, …) locally from `@regira/modules/vue/ui`. `iconPlugin`
> only selects the glyph source (`bs`/`fa`) and seeds friendly icon keys; `Icon` falls back to Bootstrap
> glyphs when it is not installed.

## Running without authentication

Auth is **optional**. The template in [Bootstrap](#bootstrap--maints) / [Root component](#root-component--appvue)
is the auth-on path; to run the SPA without a login (internal tools, demos, or while the back-end has auth
disabled), make these four changes:

> **Generate this variant — don't hand-subtract it.** `scaffold.mjs --shell --no-auth`, plus `--no-auth`
> on each entity slice, emits exactly the four changes below. They are written out for review and for
> retrofitting an app that already exists.

> **The one that bites: without auth, nothing reaches `Ready` on its own.** `AppStatus` starts at `Init`
> and `onAuthenticationChange` was what advanced it, so an app that skips change 2 mounts cleanly and then
> sits on the loading spinner forever — no error, no console message, just a blank shell. When a fresh
> no-auth app renders nothing, check that before anything else.

1. **`main.ts` — don't install `authPlugin`.** Remove its import, its `app.use(authPlugin, …)` block,
   and the `LocalStorageTokenManager` import. Nothing else depends on it.
2. **Advance the app to `Ready` yourself.** In the auth-on template, `onAuthenticationChange` is what
   called `$setAppStatus(AppStatus.Ready)`. With auth gone, **nothing reaches `Ready` on its own**
   (`AppStatus` starts at `Init`), so the app would hang on the loading spinner. Set it after mount:

    ```ts
    app.config.globalProperties.$setAppStatus(AppStatus.Mounting)
    app.mount("#app")
    app.config.globalProperties.$setAppStatus(AppStatus.Ready) // no auth → advance manually
    await whenAppReady()
    ```

3. **`App.vue` — drop the auth UI.** Remove `LoginModal`, `LoginForm`, `ForgotPasswordModal`, the
   `ForgotPasswordForm` import and its `showForgot`/`forgotUsername` state, `useAuthStore`, and the `$auth`
   reference; gate the loading container on app status alone. Drop `ResetPasswordView` and its
   `/reset-password` route from `router/routes.ts` too — password recovery goes with the auth plugin:

    ```vue
    <script setup lang="ts">
    import { RouterView } from "vue-router"
    import { Feedback, LoadingContainer } from "@regira/modules/vue/ui"
    import { AppStatus } from "@regira/modules/vue/app"
    </script>

    <template>
        <Feedback :feedback="$feedback" :enable-error-popup="true" />
        <LoadingContainer :is-loading="$appStatus !== AppStatus.Ready">
            <RouterView />
        </LoadingContainer>
    </template>
    ```

4. **Entity slices — scaffold with `--no-auth`.** The boilerplate `overview/Overview.vue` and
   `details/Details.vue` carry `authStore.$onAction` reload-on-login hooks.
   `node node_modules/@regira/modules/_template/scaffold.mjs <Entity> --no-auth` strips them (imports
   included, plus `load` from `Details.vue`'s `useDetails` destructure — used only by that hook); for an
   already-scaffolded slice, delete the marked lines in those two files and drop `load` from that
   destructure. If the app enables auth later, re-add the hooks (and `load`) per
   [entities.patterns.md → Auth reload hooks](entities.patterns.md#auth-reload-hooks-login-driven-refresh).

> **Keep the auth scaffolding dormant instead?** Install it with `app.use(authPlugin, { …, enabled: false })`.
> Then `$auth` is `{ enabled: false }` and the bearer interceptor is off — but the auth **store** still
> reports protected routes as "required", so either omit `LoginModal` (as above) or mark routes with
> `meta: { allowAnonymous: true }`. In this mode advance to `Ready` from `onAuthenticationChange` (it
> fires once at startup). For a pure no-auth app, removing the plugin (above) is simpler.

> Skip `infrastructure/user-plugin.ts` and the `components/users/` folder entirely for a no-auth app.

> **Keep the dashboard + navbar shell — it is auth-independent.** `entity-navigation/` and `layout/` build
> from the collected `$configs` + `config.json → navigation`, not from the auth store; only `users/` and
> `user-plugin` are auth-coupled. So adopt the full shell even in a no-auth app. Hand-rolling a navbar
> instead of `useNavigation()` forfeits the config-driven dashboard/navbar — the main payoff of the full
> scaffold — and is a deviation to declare, not a default.

## App shell — components, infrastructure & styling

Beyond entity slices, a real app needs a thin shell — a config-driven **dashboard + navbar**
(`entity-navigation/`), the **layout chrome** (`layout/`), shared **form inputs** (the common
`FormButtonsRow` / `DescriptionInput` ship in `vue/ui`), and the **auth UI** (`users/`, when auth is
enabled). **Scaffold the load-bearing baseline** — the toolchain (`index.html`, `vite.config.ts`,
`tsconfig*`, `env.d.ts`), bootstrap, runtime config, router, dashboard/navbar, `layout/` (`TheHeader` /
`TheFooter` / `Main`), error views, and infrastructure — in one command, then customize:

```bash
node node_modules/@regira/modules/_template/scaffold.mjs --shell            # auth-on
node node_modules/@regira/modules/_template/scaffold.mjs --shell --no-auth  # no-auth
```

Full source for every generated file is in [entities.shell.template.md](entities.shell.template.md); the
sections below explain what it produces. The shell reads from the collected `$configs` and the runtime
config, so data/logic stays in the entity slices and composables.

> **These components are default implementations, not a prescribed design.** They land as app-owned
> source: replace `Dashboard` / `NavBar` / `NavSearch` / `TheHeader` / `TheFooter` / `Main` / the views
> outright with components of your own whenever the app calls for it — keep the _functionality_
> (navigation built from `useNavigation()` over the config map, the search entry, feedback + loading, the
> account surface, the error routes), not the markup. Take the generated ones as-is when no stronger
> design is called for. Checklist:
> [entities.shell.template.md](entities.shell.template.md) → _Default implementations, not requirements_.

The baseline is intentionally lean; add the rest of the chrome on demand from the module guides — the
**`AppModal`** wrapper ([ui.examples.md](../../ui/ai/ui.examples.md) → Modal), a **`LangSelector`**
([lang.examples.md](../../lang/ai/lang.examples.md) → language selector), an **`Offline`** banner
([online.examples.md](../../online/ai/online.examples.md) → Offline banner component), and the rest of the
**`users/`** account UI — an admin user list, a `LogoutForm` ([auth.examples.md](../../auth/ai/auth.examples.md)).
The password surface is already wired by `--shell` on auth builds: sign in, forgot
(`users/ForgotPasswordForm.vue` plus the `App.vue` modal), reset (`views/ResetPasswordView.vue`),
change (`AccountView`) and sign out (the header).

### Add entities

Create `src/entities/<name>/` slices — each with the full folder set (`config/ data/ details/ filter/
overview/ selecting/` + `index.ts` + `setup.ts`, see [Entity slice anatomy](#entity-slice-anatomy)) — and
an `src/entities/index.ts` aggregator that installs them and collects routes (each `setup.ts` writes its
config into the `$configs` map that `servicesPlugin` created, and pushes its routes into the shared array):

```ts
import type { App } from "vue"
import type { RouteRecordRaw } from "vue-router"
import { plugin as productPlugin } from "./products"
import { plugin as categoryPlugin } from "./categories"

// order matters where one entity's selecting/Selector.vue is used inside another's form
export const plugins = [categoryPlugin, productPlugin]

export default {
    install(app: App<Element>, { routes }: { routes: Array<RouteRecordRaw> }) {
        plugins.forEach((plugin) => app.use(plugin as any, { routes }))
    },
}
```

Full slice code is in [entities.examples.md](entities.examples.md); the relation picker (`selecting/`) is
in [entities.patterns.md — Entity selector / relation picker](entities.patterns.md#entity-selector-relation-picker--selecting).

### `src/components/`

| Folder               | Holds                                                                                   | Notes                                                                                                                                                                                                                                                                                        |
| -------------------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `entity-navigation/` | `Dashboard`, `NavBar`, `NavSearch` + `useNavigation()`                                  | built from the collected `$configs` via `importDashboard` / `importNavbar` / `buildNavigationTree` (see [entities.patterns.md — Navigation from the config map](entities.patterns.md#navigation-from-the-config-map)); `public/config.json → navigation` lists which groups/entities to show |
| `input/`             | app-specific form inputs                                                                | the common `FormButtonsRow` (Save / Cancel / Delete / Restore row) and `DescriptionInput` ship in `vue/ui` — import them per-form                                                                                                                                                            |
| `layout/`            | `TheHeader`, `TheFooter`, `Main`, `AppModal` (modal wrapper), `LangSelector`, `Offline` | the chrome around `<RouterView>`; `--shell` scaffolds `TheHeader` / `TheFooter` / `Main` — add `AppModal` ([ui](../../ui/ai/ui.examples.md)), `LangSelector` ([lang](../../lang/ai/lang.examples.md)), `Offline` ([online](../../online/ai/online.examples.md)) on demand                    |
| `users/`             | account + auth UI                                                                       | `--shell` scaffolds `ForgotPasswordForm.vue` (auth builds); add the admin user list / `LogoutForm` on demand ([auth](../../auth/ai/auth.examples.md)); omit the folder on the [no-auth path](#running-without-authentication)                                                                |

Give each folder an `index.ts` barrel; keep the components thin and presentational — data/logic stays in
the entity slices and composables.

The load-bearing pieces are **`useNavigation()`** and the three thin components it feeds. `useNavigation()`
reads `config.json → navigation` and the collected `$configs`, then builds the dashboard/navbar trees with
the library importers:

```ts
// src/components/entity-navigation/functions.ts
import { computed, getCurrentInstance } from "vue"
import { type IConfig, importDashboard, importNavbar, buildNavigationTree } from "@regira/modules/vue/entities"
import { useConfig } from "@/app-config"

export function useNavigation() {
    const app = getCurrentInstance()!
    const {
        navigation: { groups, dashboard, navbar, search },
    } = useConfig()

    const configs = Object.values(app.appContext.config.globalProperties.$configs) as Array<IConfig>
    const hasAccess = (_config: IConfig) => true // gate by permissions here if needed

    const dashboardTree = computed(() => buildNavigationTree(importDashboard({ groups, entities: dashboard, configs, hasAccess })))
    const navbarTree = computed(() => buildNavigationTree(importNavbar({ groups, entities: navbar, configs, hasAccess })))
    const searchItemConfig = computed(() => configs.find((c) => c.key === search))

    return { dashboardTree, navbarTree, searchItemConfig }
}
```

```ts
// src/components/entity-navigation/index.ts
export * from "./functions"
export { default as Dashboard } from "./Dashboard.vue"
export { default as NavBar } from "./NavBar.vue"
export { default as NavSearch } from "./NavSearch.vue"
```

`buildNavigationTree` returns a `TreeList<INavCore>`; render it via its `.roots` — each node has `children`,
and each `node.value` is an `INavItem` (`routeName` / `initialQuery` / `icon` / `title`), with
`isNavItem(node.value)` telling a leaf entity link from a group submenu. `Dashboard.vue` / `NavBar.vue` /
`NavSearch.vue` are thin `v-for`s over that tree — scaffold them with the shell (above);
[entities.shell.template.md](entities.shell.template.md) has the full source.

### `src/infrastructure/` (keep it basic)

App-wide glue only — the role/permission names and a small plugin that exposes `$isAdmin` from the auth
store and persists the chosen language. Skip both for a no-auth app.

```ts
// src/infrastructure/permissions.ts — erasableSyntaxOnly-safe const maps (not enums)
export const Roles = { ADMIN: "Admin" } as const
export type Role = (typeof Roles)[keyof typeof Roles]

export const Permissions = { CAN_READ: "can_read", CAN_WRITE: "can_write", ADMIN: "admin" } as const
export type Permission = (typeof Permissions)[keyof typeof Permissions]
```

```ts
// src/infrastructure/user-plugin.ts
import { type App, watch } from "vue"
import { useAuthStore } from "@regira/modules/vue/auth"
import { useLang } from "@regira/modules/vue/lang"
import { Roles } from "@/infrastructure/permissions"

export const plugin = {
    install(app: App) {
        const authStore = useAuthStore()
        Object.defineProperty(app.config.globalProperties, "$isAdmin", {
            // Identity + AddRoles mints roles, not a "permissions" claim — match the API's role name exactly.
            get: () => authStore.hasRole(Roles.ADMIN),
            enumerable: true,
            configurable: true,
        })

        // persist the language choice across reloads
        const { langCode, setLangCode } = useLang()
        const last = localStorage.getItem("lang")
        if (!authStore.isAuthenticated && last && last !== langCode.value) setLangCode(last.substring(0, 2))
        watch(langCode, (code) => localStorage.setItem("lang", code))
    },
}

export default plugin
```

> Skip `user-plugin.ts` and the `users/` folder entirely for a **no-auth** app
> ([Running without authentication](#running-without-authentication)).

### `src/views/`

Page-level components the static routes point at. The home page hosts the dashboard built from
`useNavigation()`; the error pages are presentational.

```vue
<!-- src/views/HomeView.vue -->
<script setup lang="ts">
import appConfig from "@/app-config"
import { Dashboard } from "@/components/entity-navigation"
const { title } = appConfig
</script>
<template>
    <section>
        <h1 class="text-center">{{ $tm(title) }}</h1>
        <Dashboard />
    </section>
</template>
```

```vue
<!-- src/views/NotFound.vue -->
<script setup lang="ts">
defineProps<{ url?: string }>()
</script>
<template>
    <section>
        <h1>404 — page not found</h1>
        <p>
            Page <router-link :to="url ?? '/'">{{ url }}</router-link> was not found.
        </p>
    </section>
</template>
```

`Forbidden.vue` / `Unauthorized.vue` follow the same shape (a heading + the offending `url`). Auth builds
add two more: `AccountView` (the signed-in user's account page, hosting `ChangePasswordForm`) and
`ResetPasswordView` (the recovery mail's landing page on `/reset-password`, hosting `ResetPasswordForm` —
`allowAnonymous`, since the visitor cannot sign in yet). Full source for both is in
[entities.shell.template.md](entities.shell.template.md).

### Styling — Bootstrap 5

The `@regira/modules/vue/ui` components use **Bootstrap 5** class names and emit `bi bi-*` icon classes.
Both packages are in the known-good dependency set ([Install](#install)), and the scaffolded `main.ts`
imports their stylesheets — keep them above your own SCSS:

```ts
// main.ts — before your own SCSS
import "bootstrap/dist/css/bootstrap.min.css"
import "bootstrap-icons/font/bootstrap-icons.css"
```

You don't need Bootstrap's JavaScript (the UI components bring their own behaviour). **Theming belongs
in the app's `src/assets/theme.scss`** (scaffolded by the shell), imported after Bootstrap and
`@regira/modules/style.css` — never in forked library css.

**Restyling is encouraged** — the library defaults are deliberately plain; the ui module's
customize guide (`ui.customize`) is the canonical 5-layer ladder (tokens → css hooks → slots →
contract-typed replacement → eject). Common app-level hooks: the `--rg-*` tokens (`--rg-accent-bg`,
`--rg-deleted-bg`, …), `.is-deleted` (pending-delete rows, incl. `InputSelectorInline` chips),
`.is-selected`, a sticky `.form-toolbar` (`position: sticky; top: 0`; the app-owned wrapper — styling
`FormButtonsRow`'s own `.form-buttons` root instead applies the rule twice), `.form-section` framing,
zebra `.striped` rows.
Preserve behaviour, not looks — see [entities.patterns.md → Restyling & overriding the
built-ins](entities.patterns.md#restyling--overriding-the-built-ins).

## See also

- [entities.instructions.md](entities.instructions.md) — the spine (module stack, concepts, workflow,
  troubleshooting)
- [entities.namespaces.md](entities.namespaces.md) — import-specifier reference ·
  [entities.signatures.md](entities.signatures.md) — exact TypeScript signatures
- [entities.examples.md](entities.examples.md) — simple (`UnitType`) + standard (`Product`) slices ·
  [entities.advanced.example.md](entities.advanced.example.md) — one complete complex slice (`Vehicle`)
- [entities.shell.template.md](entities.shell.template.md) — the app-shell scaffold (`scaffold.mjs --shell`): every bootstrap/shell file
- [entities.patterns.md](entities.patterns.md#navigation-from-the-config-map) — per-feature recipes
  (navigation importers, selectors, trees, …)
- Module guides: [http](../../http/ai/http.instructions.md) · [ioc](../../ioc/ai/ioc.instructions.md) ·
  [auth](../../auth/ai/auth.instructions.md) · [ui](../../ui/ai/ui.instructions.md) ·
  [app](../../app/ai/app.instructions.md) · [lang](../../lang/ai/lang.instructions.md)
