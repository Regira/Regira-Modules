# Changelog

Release summary for the `@regira/modules` npm package — newest first. Every user-visible change adds one
bullet under **Unreleased** in the same change, and leaves `version` in `package.json` higher than
the last published release. On publish, the Unreleased block becomes a `## x.y.z — YYYY-MM-DD`
heading.

## Unreleased

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
