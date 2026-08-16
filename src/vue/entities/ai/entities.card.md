# regira_modules.vue.entities — index card (front-end)

> The must-know bullets before building a Vue 3 SPA on the Regira entities client. Drill into
> `entities.instructions` (the spine), `entities.setup` (project + app shell), `entities.namespaces` /
> `entities.signatures` (never guess an import or signature), and the examples/patterns sections for
> detail. If your app has an **aggregate root** — one entity carrying attachments, owned collections and
> siblings that reference it back — read `entities.advanced.example` early; it is one complete slice of
> exactly that shape, and assembling the equivalent from four sections costs more than reading it. **Read economically:** this card + a heading-scoped `get_package` (its `section` + `heading`
> params; find headings with `get_section_toc`) usually suffices — pull a whole section only when a
> heading isn't enough.
> Back-end counterpart: `get_package_card(id: "Regira.Entities")`.
>
> **⚠️ Three sections are not summarised here, and their headings are listed so you can fetch _one_ by
> name rather than gamble on the file size:**
>
> `"patterns"` (~65k chars) — Soft delete / archived rows · State toggle · Date hydration · Transient
> client-only fields · Paging · Overview list layout · Two presentations of one entity · Union search ·
> Custom endpoints on a service · Feedback for custom saves · Entity selector (relation picker) · Owned
> (child) collections · Attachments · Form validation & error handling · Tabbed forms · Restyling &
> overriding the built-ins · Hierarchical (tree) entities · Static / lookup data · Pooling & the shared
> cache · Auth reload hooks · Navigation from the config map · Custom query params · Type the client from
> OpenAPI · Debug panel
>
> `"blueprints"` (~26k chars) — Labels editor · Tenant switcher · Family tree view · Polymorphic entity · Contact data & address editors
>
> `ui.signatures` on **`regira_modules.vue.ui`** (~20k chars) — Plugins · Feedback · Paging · Loading ·
> Modal · Tabs · Icons · Screen · Autocomplete · Buttons & input components. This is where the kit's exact
> prop contracts live, and extrapolating one from a similar component is the most common way to ship a
> silently broken control: a prop that does not exist falls through as an HTML attribute, so it renders
> nothing, logs nothing, and type-checks green.

## Build tier & scaffold

- **Default = the full reference scaffold, whatever the app type.** `scaffold.mjs --shell` once
  (`--no-auth` variant exists), `scaffold.mjs <Entity>` per entity; you edit only the eight `(c)` files.
  Pick a lighter tier only on an explicit user ask.
- **The scaffolded views are default implementations — replace them with your own design freely, but keep
  the functionality.** Custom shell/slice components are expected, not a deviation; what may not be lost is
  the capability the replaced component provided (every entity manageable, paging + count + filter,
  confirmed delete, related records openable, pooled labels, feedback, the full account surface when auth
  is requested). The checklist:
  `get_package(id: "regira_modules.vue.entities", section: "entities.instructions")` → Functionality contract.
- **The provided components, composables and patterns _are_ the product — they are how you ship a scalable,
  production-ready app with little code.** Reach for a built-in and restyle/wrap it; hand-rolling one is a
  deviation to declare: feedback (`useFeedback` + `<Feedback>`), tabs (`TabContainer` + `Tab.create`),
  modals (`DefaultModal` / `FormModalButton`), paging (`Paging`), loading (`LoadingContainer`), relation
  pickers (`Autocomplete` / `InputSelector`), owned/join chips (`InputSelectorInline` + `_deleted`),
  file attachments (`entity-attachments` + `FileDropZone`), debug (`<Debug>`), breakpoints (`useScreen`).

## Page vs modal

- **The entity's own create/edit form is a PAGE, not a modal.** Scaffold `isComplex: true` (the default):
  the overview's row-edit and "new" actions navigate to the **Details page**. Reserve the modal form
  (`isComplex: false`, `FormModalButton`) for a **very basic** entity — a handful of scalar fields, no
  relations, no tabs. A modal per real entity does not scale (no deep-link, no tabs, cramped on mobile).
  **When it is a coin flip, use the page.** Concretely: more than ~6 editable fields, _any_ relation, or
  _any_ collection → page. Modal only for the flat lookup tables (a title, maybe a code and a colour).
  `isComplex` also gates the advanced-filter toggle on the overview, so a modal entity gets no `FilterAdv`.
- **A displayed _related_ entity defaults to its `FormModalButton`** — every chip, badge, or list cell that
  shows a related row opens that row's form in a modal (quick-edit), whatever that entity's own `isComplex`;
  a bare text label is the exception. This is distinct from the rule above: it edits a _neighbour_, not the
  page's own record.

## Styling

- **Restyle freely — and space what you add.** The default styling is deliberately plain and tight;
  improving it is expected. Group fields in `FormSection` and give every component deliberate spacing
  (`mb-2`/`mb-3`, margins) — a dropped-in component with none reads as unfinished. Preserve the wiring
  (composables, events, `_deleted` marking, modal teleport); overriding Bootstrap's `!important` utilities
  (a scaffold's tight `py-1`, etc.) needs `!important` back. Improve the look via CSS after the library css,
  by wrapping components, or by swapping the app-wide modal via `modalPlugin`.
- **Styling has one canonical guide — read it before writing any CSS:**
  `get_package(id: "regira_modules.vue.ui", section: "ui.customize")` (theme tokens → `rg-*`/`is-*` class hooks
  → slots → contract-typed replacement → `scaffold.mjs --ui` eject). ⚠️ **`rg-*` is the _library's_ class
  namespace** — style those hooks, never mint your own `rg-*` class, or your app collides with the next
  library release. App classes get an app prefix.

## Slice anatomy & typing

- **Model/view lockstep.** The scaffolded `(c)` views bind a placeholder `title` — when you change
  `data/Entity.ts` or `filter/SearchObject.ts`, update `Form.vue` / `FilterAdv.vue` / `List(Item).vue`
  in the same pass, or `vue-tsc` breaks on the stale bindings.
- **A slice is:** model (`EntityBase`, override `$id`/`$title`) + `IConfig` + service
  (`EntityServiceBase<T>`, implement only `toEntity`) + pooled Pinia store (`createStore`) + thin views
  driven by `useSearchView` / `useDetails` / `useForm` / `useFilter`.
- **Cross-slice model imports must alias `Entity`, with `import type`.** A slice barrel re-exports its model as
  the default `Entity`, not under the class name — importing `{ MyNamedEntity }` is the
  `TS2305 "has no exported member"` trap (the most common first error in a multi-entity app). Always
  `import type { Entity as MyNamedEntity } from "@/entities/my-named-entities"`. Use the **fully erased**
  `import type { … }` form rather than the inline `import { type … }`: under `verbatimModuleSyntax` (both
  scaffolded tsconfigs enable it) the inline modifier keeps the import _statement_, so two slices that
  reference each other's model form a runtime barrel cycle — and `data/store.ts` reads `Entity.name` at
  module-evaluation time, so whichever barrel is entered second gets a half-initialised binding:
  `ReferenceError: Cannot access 'Entity' before initialization`. ⚠️ The tell is that **`vue-tsc` and
  `npm run build` are both green** (Rollup hoists it away) and only the dev server fails. Bidirectional slice
  references are normal in a CRUD app, so prefer the erased form everywhere; it costs nothing.
  Inside a slice, import its **own** model as the default (`import type Entity from "./data/Entity"`) —
  `import { type Entity }` from the data module grabs the `const` value binding and fails `TS2749`.
- **⚠️ A cross-slice _value_ import cannot be erased, so it is the half that can still cycle.** `--rel`
  generates `import { FormModalButton as XButton, useEntityStore as useXStore } from "@/entities/xs"` into
  `overview/ListItem.vue` and `import { InputSelector as XInputSelector }` into `filter/FilterAdv.vue`. The
  barrel is fully static — no lazy or async indirection — so importing it eagerly evaluates that slice's
  `data/store.ts`, and a slice referencing back closes the same `Cannot access 'Entity' before
initialization` loop the erased type import avoids, with the same dev-server-only tell. One direction is
  always safe; when both directions need a **value**, deep-import the module instead of the barrel
  (`@/entities/xs/details/FormModalButton.vue`, `@/entities/xs/data/store`) on the second edge.
  `scaffold.mjs` skips a `--rel` naming the entity being scaffolded for the same reason — a self-relation
  (`Employee → manager`) is wired by hand: a plain FK field on the model plus a relative deep import of the
  slice's own `selecting/InputSelector.vue`.

## Relations & owned collections

- **Editable child/join collections are owned, not independent.** Back-end `e.Related()` ⇒ edit the rows
  inside the parent form — **`InputSelectorInline`** chips when a row only points at another entity (a
  join/link row), a table driven by **`useOwnedCollection`** when it carries its own fields (an order line, a
  per-year policy). Either way removals of _persisted_ rows are marked `_deleted`
  (visible, tinted, undoable until save), a `prepareItem` override drops them so `Related()` deletes by
  omission — never flush per-row `DELETE`s. A row _added this session_ is removed outright — nothing to
  undo. The multi-`Selector` **hard-removes** and cannot deliver this UX. New rows
  mint negative temp ids, so children can be added before the parent's first save. The chip slot shows the
  related row's `FormModalButton` + pooled label (see the card's related-entity rule), not bare text.
  ⚠️ **`useOwnedCollection` hands the view raw rows**: only the root item passes through `toEntity`, so lift
  the collection in the **owning** service's `toEntity` (one override, every read path). Its add-row reaches no
  `toEntity` at all — pass **`createRow`** and it is minted from your model instead of a bare `{ id: 0 }`:
  `useOwnedCollection<OrderLine>({ props, emit, createRow: () => new OrderLine() })`. Without it, class field
  defaults are absent and getters read `undefined` (a blank enum dropdown on the add row is this bug), and you
  are back to re-seeding on **every** reset because `handleSave` re-mints the row after each append.
  `items` is never `undefined` — it reads as `[]` before the parent's collection exists. Keep per-row
  computations in plain functions either way.
- **Relation picks go through the entity `InputSelector`** (server-side search + pooled cache — scales
  past one page). It already composes **create + autocomplete + browse**: a `FormModalButton` (create on
  the spot), an `Autocomplete` (type a known name) and a `SelectorModalButton` (browse modal with the full
  `FilterAdv` and paging) — never build a search box, picker grid or browse modal next to it. When adding
  to a collection, pass `:filter-defaults="{ exclude: currentIds }"` so already-added rows leave the
  picker. A checkbox group is only for serviceless enum sets.

## Signatures, auth & i18n

- **Day-one signatures — verify, never extrapolate.** One call answers any of these:
  `get_type(id: "regira_modules.vue.ui", typeName: "useFeedback")` — cheaper than finding and reading the `.d.ts`.
    - `useFeedback()` **returns the feedback object itself** — `const feedback = useFeedback()`, then bind
      `<Feedback :feedback="feedback" />`. Not `const { feedback } = …`: that is `useForm()`'s shape, and the
      asymmetry is the trap. Members: `pending(msg)` / `success(msg)` / `fail(msg, errors?)` / `reset()` — **the
      message is required**, `pending()` does not compile — plus an `isPending` computed. There is no `loading()`.
      ⚠️ `fail`'s second argument is a **field-error map** (`FeedbackError = string | Record<string, string>` —
      the 400 response shape), **not an `Error`**: `feedback.fail("Saving failed", ex.response?.data?.errors)`,
      and log the exception yourself. Passing the caught exception is the misremembering this warning exists for.
    - `service.search(so?)` / `list(so?)` — **paging and sorting ride the argument, flat**, not your
      `SearchObject` class: `search({ ...so, pageSize: 0, sortBy: ["TitleDesc"] })`. Assigning `so.pageSize = 25`
      to a scaffolded `SearchObject` instance does not type-check; the param is
      `ISearchObject & IPagingInfo & Partial<ISortByInfo>`, and `ISearchObject extends Record<string, any>`, so
      any other key you add reaches the query string too (arrays as repeated keys). `new PagingInfo(pageSize?,
page?)` is positional, and is for the overview composable's `pagingInfo` ref — **not** for `search()`.
    - `Tab.create("form", { title: translate("form"), icon })` — with `const { translate } = useLang()` from
      **`@regira/modules/vue/lang`** (there is no `useTranslate`/`useLangTranslate`; every import specifier is in
      `entities.namespaces`). The first argument is the **key** (it lands in
      the route hash, so keep it stable); it also seeds the title, which `values.title` then overrides. Tab
      titles render untranslated unless you pass one.
- **Anything that fetches on mount must also react to login.** A view mounted while the login modal is still
  open short-circuits on `!isAuthenticated` and nothing retries it — a blank panel with no error and no failed
  request. The scaffolded `Overview`/`Details` carry an `authStore.$onAction(… "login" …)` hook for this; a
  view you write needs its own (a `watch` on `isAuthenticated` with `immediate: true` also covers
  mount-after-login).
- **Login can switch the language.** The scaffolded `main.ts` applies the JWT culture claim
  (`setLangCode(auth.culture.split("-")[0])`), so an app translated in one language silently degrades to
  raw keys after login when the user's culture differs. Provide translations for every `langs` entry and
  wire `LangSelector` in the header.

## Paging, feedback & pooling

- **Counted paging comes from `/search`:** `useSearchView` + `useRouteOverview` → `{ items, count }` —
  on simple and complex entities alike; `list()` has no count. `pageSize: 0` returns all rows capped by
  the server's `MaxPageSize`. In `IConfig`, set **only** `searchUrl` (`api + "/search"`) — every other
  `*Url` defaults off `api`, and `saveUrl` must stay the resource base or updates 404 while inserts pass.
- **Forms show state through feedback.** `useForm` drives it, but only a rendered
  `<Feedback :feedback="feedback" />` shows it; any save you call yourself gets its own `useFeedback()`.
  A form with 2+ related collections splits into `TabContainer` tabs; overview rows use flexible
  `col text-truncate` + breakpoint-hidden columns, so the row fits without scrolling sideways.
- **Pooling is the point of the store.** Views use the store's pooled `service` (saves propagate to every
  view). A nested DTO from `?includes=` is a plain object — no `$id`/`$title` — so a relation **you render
  yourself** (a list cell, a chip, a custom label) goes through the owning slice's `fromPool(item.relation)`,
  which both rehydrates it and returns the one shared instance, so editing that entity anywhere relabels it
  here. The generated `InputSelector`, `Autocomplete`, `Selector` and `SelectorList` already pool
  `modelValue` internally, so **a relation on a form binds the nested object directly** —
  `<BrandSelector v-model="item.brand" v-model:idValue="item.brandId" />` — and needs no `fromPool` round
  trip, no local `ref` and no `watch`. `Object.assign(new Category(), dto)` also rehydrates but yields a
  **detached copy that goes stale** — use it only when a snapshot is what you want. Custom endpoints live on
  the raw `get<EntityService>(Entity.name)`, not the pooled store.
- **A displayed relation is a component, not text**: the related entity's `FormModalButton` beside its
  pooled `$title`. `scaffold.mjs <Entity> --rel <Related>` generates the column wired correctly.
- **`InputSelector` has two v-models** — `v-model` (the entity it displays) and `v-model:idValue` (the FK
  it saves). Bind only `idValue` and a populated form renders the control blank; it resolves the id on
  mount and emits `update:modelValue` into nothing. Dev builds warn.

## The URL & includes contract

- **The URL contract has four owners** — `config.json → api` (axios base), `IConfig.api` (relative
  resource), the Vite dev proxy, the server route prefix. Align them once or every call 404s; and
  `config.json → clientApp` must equal the API's JWT audience or every call 401s.
- **`baseQueryParams.includes` is for flag-gated _collections_ on a complex API entity** — complex meaning
  `For<…, TSortBy, TIncludes>` on the server, not the front-end `isComplex` page/modal flag. A **simple**
  entity ignores `?includes=` entirely, and a detail form's children come from the back-end's Details
  eager-load, never from `includes`. **Which side owns which:** a to-one relation shown on every list row
  belongs in the API's unconditional `e.Includes((q, _) => q.Include(…))` — set `baseQueryParams` only for a
  collection the API keeps behind a flag. `--rel` therefore scaffolds `baseQueryParams: {}`; adding
  `includes: ["All"]` to a slice whose relations are already eager-loaded server-side just pulls every
  collection onto every row. The search object overrides these per request, and `includes: []` suppresses them.
- **Never spread a model** — `{ ...item }` drops the `$id` prototype getter and `PUT`s to `/undefined`;
  mutate the instance. Overview refs are lazy: guard with `items ?? []`.

## Verify

- **Verify at runtime, not just `npm run build`.** Drive each slice once against the live API: save the
  same record **twice** (the classic m2m re-sync 500), toggle a flag, apply + reopen a filter, delete a
  referenced row. `vue-tsc` proves none of this.
- **`<Debug :modelValue="…" />` while developing** — self-gates on `$isDebug` (`?debug=1`), inert in
  production; curate the payload (resolved relations, paging state).

## Blueprints

- **Building a common domain feature? Check the blueprints** — `get_package(id: "regira_modules.vue.entities", section: "blueprints")`
  has the SPA counterparts of the back-end blueprints: labels editor, tenant switcher, family tree view,
  polymorphic (TPH) entity, contact data & address editors.
