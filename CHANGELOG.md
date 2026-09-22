# Changelog

Release summary for the `@regira/modules` npm package — newest first. Every user-visible change adds one
bullet under **Unreleased** in the same change, and leaves `version` in `package.json` higher than
the last published release. On publish, the Unreleased block becomes a `## x.y.z — YYYY-MM-DD`
heading.

## 6.3.3 — 2026-09-22

- `vue/ui`: **`NullableCheckBox` now follows `modelValue` after mount.** The prop seeded the internal
  value once and was never re-read, so the box reflected its own clicks and the value it mounted with, and
  nothing else — a filter's Clear, a programmatic reset or a form re-filled from the server updated the bound
  model while `checked`, `indeterminate` and the dimmed `opacity` all stayed on the previous state. A deep
  link rendered correctly, because the value was already right at setup, which is what made it easy to miss.
  Standalone use without `v-model` still keeps its own state: the control syncs on a prop _change_, so a
  prop that never moves never overrides a click.
- `vue/ui`: **`FormButtonsRow` renders no buttons on a `readonly` form.** It hid Save but kept Cancel and showed
  Delete and Restore disabled, so every read-only form — every scaffolded one included — carried a toolbar that
  could do nothing: Cancel only discards unsaved edits (`useForm`), which a read-only form cannot have. The way
  back is the page's overview link or the modal's close button, both of which were already there. A custom form
  whose `@cancel` navigates away needs its own link on a read-only form now. The ejectable copy
  (`scaffold.mjs --ui FormButtonsRow`) follows.
- Scaffold: **the generated `InputSelector` follows `idValue` whenever it changes**, not only on mount. A
  parent that assigned, reassigned or cleared the FK after the control mounted — a deep-link prefill in its own
  `onMounted`, a programmatic reset — left the control blank or showing a stale row, with no warning. A response
  for an FK that has since moved on is dropped, and a control bound with `v-model` alone is never cleared. Existing slices: copy `_template/entity-slice/selecting/InputSelector.vue`
  over the slice's own — it is boilerplate with no entity tokens, not one of the `(c)` files.
- Scaffold: a `--rel` overview cell renders the related entity's `FormModalButton` only when the relation is
  set. Bound to nothing the button is a "create new" button, so an optional FK put one on every row without it.
- Guides: `ui.signatures` → _Icons_ lists every registered `bs` key (a test keeps it equal to the icon map);
  owned rows edited through `useOwnedCollection` extend `EntityBase` while chip rows may stay interfaces;
  `DateOnly`/`TimeOnly` fields stay strings bound to native date/time inputs; a count is
  `formatNumber(n, culture, 0)`; a larger app keeps entity-free helpers in `src/utilities/`, leaving
  `src/infrastructure/` to app-wide glue.

## 6.3.2 — 2026-09-19

- `vue/auth`: **a 403 from `auth/validate` now clears the stored token**, as 401 already did. The endpoint
  answers 403 for a token whose signature is valid but whose user no longer exists — deleted, deactivated, or
  the database reseeded under it — and keeping that token made the failure permanent: every reload replayed
  it, the app rendered unauthenticated with no sign-in gate, and only clearing site data by hand recovered.
  Scoped to the validate call: a 403 from an ordinary resource still means "signed in, not allowed here" and
  does not sign the user out.
- `vue/ui`: the modal teleport hosts are lifted out of Bootstrap's fixed band in the shipped stylesheet —
  `#modals` to `--rg-modal-z`, `#loginModal` one above. `.fixed-top` on those hosts is `position: fixed` **and**
  `z-index: 1030`, which makes each host its own stacking context and clamps every teleported modal to 1030
  however high the mask's own z-index is. An app with fixed chrome above that — a sticky footer, a bottom tab
  bar, a FAB, a toast host — painted over modals that had opened correctly.
- Guides: `fromPool` is documented as read-through — for an id already cached it returns the cached instance
  and discards its input, so landing a custom endpoint's payload with it keeps the stale row behind a 200 and
  an unchanged UI; `set` / `setMany` are the writes. `ui.customize` lists which built-ins hide their own text
  below which breakpoint (`FormButtonsRow` labels under `md`, `TabNavigation` titles under `lg` when the tab
  has an icon, `FormLabel` with `auto-hide`) — a functional decision for a phone-first app, not a cosmetic
  one. The overview column budget states its arithmetic: `col-N` is a fraction of the whole row, not of what
  `col-auto` left, so a fourth proportional column starves the flexible title; past three, give every column
  an explicit width class. `toFeedbackError` is named with its `vue/ui` specifier where the entities card
  teaches it.
- `extensions`: the guides send you to the utilities module's own guides for the signatures behind the
  wrapped helpers — `utilities.instructions` from the opening description, and `utilities.signatures` →
  *arrayUtility* from the list of methods injected onto `Array.prototype`. Both had pointed at a bare
  source path that resolved to no file.
- `vue/ui`, `vue/auth`: six exports the barrels carry reach `*.signatures.md`. `vue/ui` gains the two
  injection keys (`LOADING_COMPONENT_KEY`, `MODAL_COMPONENT_KEY`), each noted as the lower-level form of
  `injectLoading()` / `injectModal()` — those fall back to the built-in component where a bare `inject`
  of the key yields `undefined` if the plugin was never installed — plus `LoadingInput` (loadingPlugin's
  option type), `IconsConfig` (what iconPlugin provides under `"icons.config"`, which a replacement `Icon`
  injects to resolve glyph names the same way), and `ErrorSummary`'s props and slots, declared in the SFC
  and so not importable as types. `vue/auth` names `LoginModalSlots` and `ForgotPasswordModalSlots`, for
  typing a wrapper that forwards the slot.
- `events`: the guides describe the mixin on its own terms — inject it into a service or manager that
  broadcasts state changes, with a session manager's `login`/`refresh`/`logoff` as the illustration.
  They had pointed at `src/identity` as the worked consumer, which is legacy and marked don't-use, and
  the *See also* entry for the entities client pointed at the dormant `src/entities` rather than
  `vue/entities`.
- Docs site: the root `README.md` links [the published site](https://regira.github.io/Regira-Modules/),
  and `AGENTS.md` documents it — §7 for how `sync-modules.mjs` copies each module's `README.md` +
  `docs/*.md` into the generated, `.gitignore`d `docs/reference/`, §2 and §3 for the layout and the
  `docs:dev`/`docs:build` commands that run from `docs/` against its own dependencies, §1 for the fact
  that a module doc edit publishes itself on the next push to `main`, and §5 for the hand-maintained
  `MODULES` array a new module has to be added to — the sync skips an unknown module with a warning, so
  omitting it drops the module from the site on a green build.

## 6.3.1 — 2026-09-17

- `vue/ui` + `vue/entities`: **new `toFeedbackError(ex)`** — field errors from an `EntityInputException` reach
  the form. The API answers that 400 with a flat field map (`{ "CategoryId": ["…"] }`), while every failure
  path read only the ProblemDetails `errors` of model binding, so a prepper's rule breach showed as a bare
  "Saving failed". `toFeedbackError` reads both shapes, starts each key lower-case to match the model's field
  names, and falls back to the server's `detail` / `message` text (or a plain-text 400 body) when there is no
  field map; `useForm` and the overview composables use it. `fail()` takes the text of an
  `Error` passed in place of a map, and keeps a map whose field is named `message`. A 409's ProblemDetails
  `detail` is now shown.
- `vue/ui`: **type change** — `FeedbackError`'s map values are `string | string[]`, which is what the server
  sends. Code that reads a field as a plain string (`const m: string = feedback.error?.[k]`) no longer
  compiles; take the first message (`[feedback.error[k]].flat()[0]`). The keys `toFeedbackError` returns start
  lower-case for model-binding errors too, so a lookup by the C# name (`feedback.error?.Price`) finds nothing — use
  the model's field name (`price`).
- `vue/entities`: `useForm` reads `readonly` and `isPopup` when a handler runs instead of once at setup, so a
  permission-gated form whose access resolves after mount (`:readonly="!canWrite(…)"` before the stored token
  is restored) no longer stays locked.
- `vue/entities`: `useRouteOverview` keeps the view's search object on the first search when the URL carries no
  search parameters, so defaults passed to `useSearchView` apply, and a hash-only navigation (a tab selection)
  no longer re-runs the search. A `Date` filter is written to the route as ISO-8601 with its offset;
  vue-router's `String()` coercion sent `Date.prototype.toString()`, which the API rejects with a 400.
- `vue/ui`: `TabContainer` (the ejectable copy under `_template/ui` carries the same changes):
  - With `useRouteNav` it no longer navigates on mount and writes the hash only on a select. The mount-time
    route write cancelled a navigation still pending, which left a form that switches to tabs after an insert
    on `/new`.
  - With `useRouteNav` a URL without a hash shows the `active` tab. It showed the default tab, so a tabbed form
    passing `:active="initialTab"` with `:use-route-nav="!isPopup"` ignored `initialTab` outside a popup.
  - A hash or `active` naming a disabled, hidden or unknown tab is skipped (a hash falls back to `active`, then
    to the default tab) instead of showing an empty area or a disabled tab's content, and a click on a disabled
    tab is ignored. A tab the hash names shows once it turns enabled, such as a gated tab after the first save.
  - `select` fires on mount and whenever the tab on screen changes, Back/Forward included, in both modes. It
    fired on a click only, plus on mount with `useRouteNav` and no `active`.
  - A click is compared with the tab on screen, so after Back the previously selected tab can be selected again.
- Scaffold: `SelectorDropdown` loads its own rows (on mount and when a token arrives), sharing one request
  between the dropdowns of a slice that load at the same moment, and logs any failure other than a 401. It read
  the pool cache, which is not reactive to new ids, so it stayed empty after a hard reload unless something
  else had listed the entity first.
- `vue/entities`: `FormModalIn` / `FormModalOut` are exported, with `FormIn` / `FormOut` listed in the
  namespaces.
- Docs:
  - `entities.signatures` gives `useForm`'s side effects (the post-insert `router.replace` and when it is
    skipped), expands `FormIn`, and types `FeedbackOut` with `FeedbackError`. It states that
    `useRouteOverview` owns the search object (restored values are strings) and that pooled reads return copies
    to pass through `fromPool`.
  - *Permission-gated UI* covers upload rights without edit rights, which the attachments flush turns into a
    403 on the owner's `PUT`.
  - The dev-proxy example forwards the SPA's origin (`xfwd`, plus `UseForwardedHeaders` after the HTTPS
    redirect), so the absolute attachment URIs the API builds stay same-origin.

## 6.3.0 — 2026-09-16

- `treelist`: `TreeList.move` recomputes `level` for the moved node and all its descendants. It kept the
  depth set at construction, so indentation driven by `node.level` was wrong after a drag-move until the
  tree was rebuilt. Moving a node under itself or one of its descendants now throws, instead of leaving a
  detached cycle that hung `getRoots` and overflowed the stack in `getAncestors` / `getOffspring`.
- `vue/ui` + `vue/entities`: **behaviour change — `readonly` now gates Restore** (hence the minor version). `FormButtonsRow` disabled Save and Delete on
  `readonly` and left the Restore button live, and `useForm`'s `handleRestore` was the one write handler that
  never called `checkReadonly()` — so a read-only form on an archived row offered an enabled button that
  un-archived it. Both layers now answer to the prop, matching `handleSubmit` / `handleRemove`, and the
  ejectable copy under `_template/ui` carries the same fix — an app that ejected `FormButtonsRow` before this
  release keeps its own copy and must apply it there. An app that rendered a form `readonly` *in order to*
  offer Restore alone must now render its own button.
- Docs: **Permission-gated UI** — a new pattern (and `how_to` recipe) in `vue/entities`, the gap that made an
  otherwise correct application offer "New", edit and delete to every signed-in user and let the API answer
  403 for the click. It carries the `useAccess()` mirror of the server's write tiers, the three affordances to
  gate per slice, row-level locks, and the reason a `readonly` form should render why it is locked rather than
  a lone Cancel button. The *Functionality contract* gains the matching capability row, so a custom design is
  held to it like the others.
- Docs: `vue/auth` states that `$auth` is a **discriminated union** (`IGlobalAuth | { enabled: false }`).
  The templates all narrow it with `$auth.enabled &&`, but nothing said so, and a hand-written
  `v-if="$auth.isAuthenticated"` is a TS2339 build failure.
- Docs: `vue/ui` — `FormLabel` renders **below** its input, which makes `align-items: flex-end` the wrong
  choice for a row mixing labelled fields with buttons (it lines the button up with the caption, ~20px low)
  and misaligns a `.form-check` whose label is a badge rather than plain text. `FormButtonsRow`'s signature
  states what `readonly` suppresses: Save hidden, Delete and Restore disabled, **Cancel always rendered**. The icon-key
  gotcha points at the declarations the package actually ships
  (`dist/vue/ui/icons/bootstrap-icons.d.ts`, 124 keys) instead of a source path absent from the published
  package.
- Docs: attachments — `useAxios()` is how a service reaches `upload` / `getFile`. Typing the constructor
  parameter as `AxiosWithFilesInstance` does not narrow `this.axios`, which `EntityServiceBase` declares as a
  plain `AxiosInstance`; the guide and the scaffolder's hints said otherwise.
- Docs: the advanced (Vehicle) example's `EntityService.addAttachment` compiles against the shipped
  `entity-attachments` slice. It imported a `save` helper the slice never exported; it now posts the file with
  `useAxios().upload` and maps the returned `data.item`, and the attachments guide and recipes show that call.
- `_template`: `readonly` reaches the whole overview row. The generated `ListItem.vue` honours the prop it
  already declares (and `List.vue` already passes) — it drops its delete button and opens its
  `FormModalButton` read-only, so a modal-form entity is gated like a page one — and `List.vue` drops the
  header's matching delete spacer, whose `.btn` box would otherwise leave the trailing columns misaligned.

## 6.2.1 — 2026-09-05

- `vue/formatters`: `formatDate` no longer lets a bad culture abort the render. `toLocaleDateString` raises
  `RangeError` for a tag it cannot parse, and that fires *during render*, aborting the component subtree and
  blanking a region of the page — while `vue-tsc` and `npm run build` stay green, because `formatDate(date,
  culture)` and `formatDateTime(date, mask)` are both `(Date, string)`. The tag is now reported on the console
  (naming the mask-taking sibling, the usual cause) and the browser's default locale is used instead. Which of
  the two arguments was meant is deliberately **not** inferred: `"dd-MM"`, `"MM-dd"` and `"yy"` are well-formed
  BCP-47 tags while `"en_US"` — the underscore form .NET `CultureInfo`, Java `Locale` and POSIX `LANG` use —
  is not, so a validity test misreads a real mask *and* a real culture.
- `vue/entities`: `importNavbar` drops a navigation group once `hasAccess` has filtered every child out. The
  group was emitted regardless, so a role that may see none of a group's entities got a dropdown that opened
  onto nothing; `importDashboard` already filtered this way.
- `vue/entities`, `vue/auth`: declaration comments correct four contracts an agent otherwise infers wrongly.
  `useSearchView`/`useListView` fetch **nothing** on mount — the scaffolded overview's first search comes from
  `useRouteOverview`, and a hand-written view owns its own (`onAuthenticated(() => searchHandler(true))`, and
  nothing on mount beside it, which `onAuthenticated`'s `immediate` option had wrongly named `useSearchView`
  for). `searchObject` goes in as a plain instance and comes back as a `Ref` — a ref passed in is only a
  compile error when the type arguments are written out. `fromPool` is read-through: for an id already cached
  it returns the cached ref and discards its argument, so `set()`/`setMany()` are what land a custom
  endpoint's response. `onAuthenticated` inside a composable is scoped to the first component that calls it,
  so app-lifetime state registers once from `main.ts`.

## 6.2.0 — 2026-09-04

- `vue/ui`: `Autocomplete`'s result panel flips **above** the control when the results do not fit below it
  and there is more room above — a field at the foot of a modal used to drop its options off screen. The
  panel also clamps its height to the room on the side it opens to, so a list that fits neither way scrolls
  inside the viewport instead of running past its edge; `--rg-dropdown-max-height` stays the ceiling.
  `useAutocomplete` returns a `resultEl` ref for this and `Autocomplete` binds and exposes it — a
  replacement skin must put `ref="resultEl"` on its panel next to `:style="resultStyle"`, or the panel is
  never measured and keeps opening downwards.
- `vue/auth`: new **`onAuthenticated(handler, { immediate?, store? })`** — runs a handler whenever an
  authenticated token arrives: sign-in, a refresh (a tenant switch included), and a token restored from
  storage on a hard reload. It replaces hand-rolled `authStore.$onAction(… "login" …)` hooks, which silently
  never fired on a reload — the plugin restores a stored token through the **`validateToken`** action, and
  views mount before it resolves, so a fetch guarded on `isAuthenticated` was skipped and never retried (a
  blank panel, no error, no failed request). Watching the token also re-runs on a refresh that swaps
  identity, which `isAuthenticated` alone cannot see, while staying quiet when the plugin re-validates the
  same token. `$onAction` is unchanged and existing code keeps working. With the plugin installed disabled
  (`enabled: false`) no token ever arrives, so it honours `immediate` once rather than waiting forever —
  a slice keeps its hooks in that mode; an explicit `{ store }` still names the store to watch. Plugin
  install order does not matter either way: the store is resolved per read, so a hook registered before
  `app.use(authPlugin, …)` — from inside a pinia store, say — follows a custom `authStore`, and sees an
  `enabled: false` install, as soon as the plugin lands. Installing **no** auth plugin at all is the one
  state it cannot detect, being indistinguishable from "not installed yet", so a no-auth app leaves the
  hooks out (`scaffold.mjs --no-auth`) rather than relying on them.
- `vue/auth`: `IAuthData` exposes the raw **`token`** it was decoded from — the identity signal
  `onAuthenticated` watches. It is defined **non-enumerable**, so it is absent from `{ ...authData }` and
  `JSON.stringify(authData)` while `authData.token` still reads normally. The plugin hands `authData`
  straight to `onAuthenticationChange` — whose documented use is welcoming the user and preloading, i.e.
  exactly where an app calls its telemetry SDK — so a plain field would put a live bearer credential into
  whatever that path serializes.
- `vue/auth`: `useGlobalAuth()` (`$auth`, script-side) is reactive — reading it inside a computed or watcher
  tracks the plugin install itself, so a reader that ran before `app.use(authPlugin, …)` re-evaluates when it
  lands instead of being stuck with the `undefined` it first saw.
- `_template/entity-slice`: the scaffolded `Overview.vue`/`Details.vue` reload hooks move to
  `onAuthenticated(…, { immediate: false })`; `immediate: false` because `useRouteOverview`/`useDetails`
  already own the mount fetch. `scaffold.mjs --no-auth` strips the hook together with its
  `@regira/modules/vue/auth` import and the comment block describing it.
- `treelist`: `TreeList.init` builds correctly from values shuffled across more than one level. A parent
  synthesised while visiting one of its children handed back `undefined` as soon as it had a parent of its
  own, so the child was attached as a spurious root and the parent was created a second time when `init`
  reached it in `values` — three rows could yield four nodes and two roots. `init` now resolves a value to
  its existing node wherever it already sits in the tree, and tracks the values it is resolving, so cyclic
  input terminates instead of recursing without bound: the edge that closes the cycle is skipped and its
  child stays a root, mirroring what the .NET `TreeList` does with `ThrowOnError = false`.
- `treelist`: **behaviour change, classed as a fix:** `getOffspring` and `getValues` return distinct
  results, like `getRoots` and `getAncestors` always have. Whole-tree `tree.getOffspring()` used to repeat a
  node once per ancestor above it (an `R → A → B` chain reported three descendants: `A`, `B`, `B`), and
  `getValues()` repeated a value once per parent it hangs under. The old output was not a contract anyone
  could have relied on deliberately — the repetition count was an artefact of tree depth, the method's own
  doc comment already said "all (distinct) values", and the two sibling methods had always deduplicated —
  which is why this ships as a minor rather than a major. A caller that did want a node per path should walk
  `node.children` itself.
- `vue/entities`: `useTree`'s `init` drops the dedupe pass that pruned the duplicate nodes the `treelist`
  fix removes at the source. It only ever handled one level of nesting, and against a correctly built tree
  it removes legitimate nodes. **Visible in a multi-parent dataset without any code change on your side:** a
  value that genuinely hangs under two parents now renders as two nodes, where the pass used to delete one
  of them — the correct shape for a tree the data says is a diamond, and the reason this is a fix rather
  than a break, but check any view that renders `nodes` or `offspring` from such a dataset.

## 6.1.3 — 2026-08-26

- `_template/scaffold.mjs`: `--overwrite-slice` no longer deletes owned sub-slices it does not regenerate.
  The clean replace wiped the whole slice folder first, so re-running the flag without repeating the original
  `--owns` destroyed the hand-authored child files and exited 0. The replace is now scoped to the template's
  own entries, and everything that survives is named in the output — owned sub-slices to re-pass `--owns`
  for, anything else to review by hand.
- `vue/entities` guides + `_template/entity-slice`: the scaffolded `data/Entity.ts` names `created`/
  `lastModified` as the only auto-hydrated dates — every other `Date`, nested rows included, arrives as a
  string and needs a guarded lift in `EntityService.toEntity`. The rule was stated only where the field is
  not being added, so one reached a template as a string and threw at runtime with `vue-tsc` green.
- `vue/entities` guides: the `filter/FilterAdv.vue` example binds `minCreated`/`maxCreated` with `DateInput`
  instead of a raw `<input type="date">`, which takes `yyyy-MM-dd` only and so never prefilled from a `Date`.
- `vue/auth`: **no credential this module handles reaches the console any more.** An axios error carries the
  request that produced it, and every `catch` used to log that error whole — the bearer header everywhere,
  and the posted password or reset token on the auth calls; `validateToken` logged the raw JWT by name on a
  path that runs on every app load. Everything now goes through one internal masking helper: the error field
  by field, plus a copy of the request with the `Authorization` header and axios' `auth` field redacted and
  the body, `params` and query string dropped for credential-bearing endpoints. The signed-in user is logged
  by named field (`isAuthenticated`, `userId`, `name`, `role`), not as a spread of `authData` — which shipped
  the whole decoded claim bag, since `_decodedToken` is private to TypeScript only. Nothing is mutated, so a
  rejected error still holds the real header for a retry, and a request that failed before it was built (no
  `config`) no longer throws out of the interceptor.
- `vue/auth`: new **`registerCredentialUrls(...urls)`** export and matching **`credentialUrls`** plugin
  option, so an app can name its OWN credential-bearing endpoints. The interceptor logs every failed request
  the SPA makes, but only this module's endpoints are credential-bearing by construction — a consumer's
  `users/*/password` or invite-accept had its body printed in full, with no way to add it to the list. A
  `string` matches a whole path or its trailing segments, `*` standing for one segment; a `RegExp` is tested
  against the lower-cased path. Unregistered endpoints still log their body, which is a real diagnostic.
- `vue/entities`: `useSearchView`'s `searchHandler`, `useListView`'s `listHandler` and the core's `applySave`
  and `applyRemove` share one "newest wins" gate — only the newest of them writes `items`, `itemsCount`,
  `feedback` and `isLoading`. They genuinely overlap (a mount fetch racing the slice's login/refresh reload
  hook, a filter change, a row saved mid-fetch) and the one that settled last used to win: a stale 401
  painting `feedback.fail` (which does not auto-hide) over rows already on screen, or a save clearing the
  spinner the fetch still owned. Only the shared state is gated — `applySave`/`applyRemove` still return what
  the server said, so `handleSave`/`handleRemove` apply to the list either way.
- `vue/entities`: `useDetails`' `load` lets only the newest call write `item`, `feedback` and `isLoading`,
  matching the overview composables. A deep-linked details page fails once while anonymous and is retried
  after sign-in, and the 401 landing after the retry succeeded painted its banner over the loaded item or
  cleared the retry's spinner. Navigating to `/new` mid-fetch clears that spinner too, instead of leaving it
  turning over a loaded form.
- `vue/entities`: **`useListView` now sends the search object** it was given. It read `.value` off the
  constructor argument — a plain search object, not the ref — so the spread was always empty and every
  `service.list()` carried paging alone, dropping UI filters and anything `useRouteOverview` restored from
  the URL. `ISearchObject` extends `Record<string, any>`, which typed the stray `.value` as `any`, so
  `vue-tsc` never saw it. **Expect list requests to carry filter parameters they did not before** — a
  back-end that rejects unknown query parameters will notice.
- `vue/ui`: `DateInput` emits `undefined` when the field is cleared instead of `new Date("")`. An Invalid
  Date is truthy, so a search-object field bound to it stayed "active" (`value != null` lights the filter
  badge, the control renders `is-invalid`) while `createQueryString` dropped the value and nothing filtered.

## 6.1.2 — 2026-08-16

- `vue/entities` guides: new **Contact data & address editors** blueprint — phone/email rows with
  type-sniffed `tel:`/`mailto:` actions and address lists with a shared formatter and `GMapButton`, as
  owned-collection editors composed in the owner's form; `how_to` keys `contact-data-editor` and
  `addresses-editor`. Sibling of the labels editor; the polymorphic-entity blueprint now points at it.

- `vue/entities`: `useForm`'s `handleSubmit` and `handleRestore` no longer re-throw after setting feedback,
  matching `handleRemove`. The scaffolded `@submit.prevent="handleSubmit"` binding logged an unhandled
  rejection on every failed save; consumers wrapping the call in `try/catch` can drop the wrapper, and code
  that needs the outcome branches on `feedback` instead. Shipped as a patch because the rejection was never
  a supported signal — the guides only ever documented wrapping the call, and `handleRemove` already behaved
  this way. If you nonetheless placed work *after* `await handleSubmit()` that relied on the throw to
  short-circuit — `router.push(...)` on the next line — guard it on `feedback.status`, or it now runs on a
  failed save. Same for the **readonly** guard in `handleSubmit`/`handleRemove`: it reported
  `fail("Readonly")` and then threw, which — because both handlers are `async` — surfaced as a rejected
  promise, not a synchronous throw, so it produced the very unhandled rejection this change removes. The
  guard now returns early after setting feedback; no save or delete was ever attempted in that branch, so
  the only difference is the absent rejection.
- `scaffold.mjs`: the shell's `$isAdmin` now wires to `authStore.hasRole(Roles.ADMIN)` against a `Roles` map
  in `infrastructure/permissions.ts`, the Identity + `AddRoles` default the guides prescribe — it previously
  generated `hasPermission("admin")`, which reads a claim a standard Identity backend never mints, leaving
  `$isAdmin` false for every user. Permission-claim backends swap to `hasPermission` per the file's comment.
- `scaffold.mjs`: entity-slice barrels export `SearchObject`, so another slice can reach the **type**
  (`import type { SearchObject } from "@/entities/vehicles"`) without patching the barrel. Constructing one
  is a value import — take the leaf module (`…/filter/SearchObject`, a default export) per
  `entities.namespaces`.
- Guides: extending an emit contract now says to match the shape being extended. The call-signature
  contracts (`FormEmits`, `FilterEmits`, …) take `(e: "reload"): void`, as `FormModalEmits extends
  FormEmits` already does; **`OverviewEmits` is the exception** — declared as tuple properties, so a custom
  event on it must be a tuple member (`{ "reload": [] }`). A call signature there flips `defineEmits` to the
  call-signature branch and every inherited two-argument emit stops compiling, which the previously
  documented fix ran into. The two worked examples that extend `OverviewEmits` are corrected.
- Guides: tab lists drop a responsive tab with `undefined` and no filtering step (`null` does not satisfy
  `TabContainer`'s prop type, and neither `.filter((t) => t)` nor `.filter(Boolean)` narrows it away);
  `vue/formatters`, `vue/lang` and `vue/app` added to the wiring table, with the mask-vs-culture split
  spelled out; `setup.md`'s infrastructure snippets brought in line with the generated shell.

## 6.1.1 — 2026-08-12

- `vue/auth`: `hasRole(role)` on the auth store and `AuthData` — probes the three role-claim spellings a
  raw token can carry (`role` for a self-issued JWT, `roles` for Entra, the `ClaimTypes.Role` URI for
  ASP.NET Identity's default), mirroring the backend's `FindRoles()`. `hasPermission` reads the
  `permissions` claim and is unsuited for role gating. **Note:** `hasRole` is a required member of the
  exported `IAuthData`, so a hand-rolled test double typed as `IAuthData` needs the method added.
- `vue/auth`: `AuthData.role` is populated — the first role found across the three spellings, for display.
- `vue/auth`: new package index card (`auth.card.md`) served by the MCP's `get_package_card`.
- `scaffold.mjs`: `--owns … --fk <fkName>` sets the owned child's FK property to the parent when the C#
  property is not named after the parent class (a `QCreditRequest` child carrying `RequestId` takes
  `--fk requestId`); without the flag the run names the derived default. `--fk` on a `--picker` join is
  rejected — the join row carries no parent FK on the client. A `--rel` naming the entity being scaffolded
  is skipped with a hand-wiring hint (its generated imports would cycle into the slice's own barrel).
- `_template/entity-slice/data/Entity.ts`: the model skeleton notes that API-projected fields are plain
  assignable properties — a class getter named after a JSON key makes hydration throw at runtime while
  `vue-tsc` stays green.
- `scaffold.mjs --shell`: the output names the `$isAdmin` claim choice (`hasPermission("admin")` vs
  `hasRole("Admin")` on a role-based backend).
- Licensing: `@regira/modules` is now licensed under the **Apache License 2.0** (previously the Regira
  Commercial License). `package.json` `license` is the SPDX expression `Apache-2.0`, and the repository
  ships the Apache-2.0 `LICENSE` plus a `NOTICE` file. No code changes — the library never contained
  license validation.

## 6.1.0 — 2026-08-08

- `vue/ui`: `useFeedback()` returns a `reactive()` object instead of a bag of refs, so its fields bind
  straight from a template — `:disabled="feedback.isPending"` now type-checks where it previously failed
  `vue-tsc` with `TS2322`. **Migration:** drop `.value` from every `FeedbackOut` field read
  (`feedback.status.value` → `feedback.status`). `vue-tsc` reports each one
  (`Property 'value' does not exist on type 'FeedbackStatus'`); an app that does not type-check reads
  `undefined` instead — falsy, so re-check any `v-if`/`:disabled` bound to feedback. As with any reactive
  object, destructuring it snapshots the values: pass the object, or `toRefs()` it.
- `vue/ui`: new `useAppFeedback()` returns the app-wide `FeedbackOut` the feedback plugin installs, for a
  handler that owns no panel of its own. Throws when the plugin was never installed.
- `vue/ui`: `DateInput` takes `showTime`, rendering `<input type="datetime-local">` and keeping the time on
  the emitted `Date`. `vue/formatters` gains the matching `dateTimeInputString`.
- `_template/scaffold.mjs`: `--owns <Join> --picker <Target>` scaffolds a pure many-to-many join as
  `InputSelectorInline` chips over a plain join-row interface, instead of the scalar editable table that has
  to be discarded for a join carrying nothing but its two foreign keys. The DOM-global collision warning now
  also covers `--owns`/`--rel` class names, and runs before any file is written.
- `vue/ui` guides: the registered icon keys are named as a source of truth, with the `bs`/`fa` sets flagged
  as different rather than mirrored — switching `source` silently blanks any key the `fa` set omits.
- `vue/entities` setup guide: the _Install_ section now describes the npm-registry install (prebuilt
  `dist/`, no on-install build), with the `github:Regira/Regira-Modules` specifier kept only as the
  unreleased-commit fallback — matching the README and getting-started guide.
- `vue/entities` guides and `_template/`: the owned-collection lift in `toEntity` is shown with its
  idempotency guard (`if (e.lines?.some((row) => !(row instanceof Line)))`). `toEntity` runs inside
  computeds, so an unconditional `map` rebuilds the array on every call and throws
  `Maximum recursive updates exceeded` **against a library component** — the guard was documented for date
  conversion but the collection-lift recipe, which the card instructs you to write, omitted it.
- `vue/entities` card and setup guide: a relation on a form binds the nested object directly —
  `InputSelector`, `Autocomplete`, `Selector` and `SelectorList` pool `modelValue` themselves, so the
  manual `fromPool` round trip applies only to relations the app renders itself. Cross-slice **value**
  imports (`FormModalButton`, `useEntityStore`, `InputSelector`) are also documented as the remaining
  barrel-cycle edge: `import type` is erased and safe, a value import is not, and `--rel` emits them.
- `vue/entities` signatures: `updateOverviewRoute` pushes onto the **current** route, so a slice
  `Overview` can be embedded in an app-owned view without hijacking navigation — paired with the
  constraint that `routeWatcher` only re-runs while the route name is unchanged.

## 6.0.0 — 2026-08-05

- Package published as **`@regira/modules`**. Every import specifier carries the scope:
  `import { EntityBase } from "@regira/modules/vue/entities"`, `import "@regira/modules/style.css"`,
  `node node_modules/@regira/modules/_template/scaffold.mjs …`. The `exports` subpaths themselves are
  unchanged — only the package name they hang off. The opt-in `@/regira` consumer alias keeps its name;
  retarget it at `node_modules/@regira/modules/dist`.
- Documentation accuracy pass: module READMEs and the `vue/entities` docs re-verified against source — directive registration (`app.use`, not `app.directive`), `Autocomplete`'s click-outside plugin requirement, `useAuth` vs `$auth`/`useGlobalAuth`, `clipboardUtility` call form, unreachable `objectUtility` members, attachments-service constructor guidance, `useFilter`'s `Constructor` input and `service.list()` return shape all corrected; root README now lists the `entities`, `firebase` and `identity` export subpaths.
- Docs site: `docs/sync-modules.mjs` now rewrites source-tree-relative links to published `/reference/<id>/` paths (or GitHub URLs for unpublished targets), fixing 30+ broken links on the generated reference pages.
- Version set to 6.0.0 for the initial public npm release (the unscoped name `regira` is refused by the registry's name-similarity filter, hence the scope).
- Added the npm publish workflow (`.github/workflows/publish-npm.yml`) with guards verifying the tag matches `package.json`, the version is not already on npm, and the changelog has the release heading.
- Install docs switched from the `github:Regira/Regira-Modules` specifier to the npm registry (a plain `npm install @regira/modules`, always resolving the latest published version) in the README, getting-started guide and the shipped `ai/` guides; the `git`-on-`PATH` and SSH caveats now apply only to the unreleased-commit fallback.
