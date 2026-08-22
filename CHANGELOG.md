# Changelog

Release summary for the `@regira/modules` npm package — newest first. Every user-visible change adds one
bullet under **Unreleased** in the same change, and leaves `version` in `package.json` higher than
the last published release. On publish, the Unreleased block becomes a `## x.y.z — YYYY-MM-DD`
heading.

## Unreleased

- `vue/ui`: `Autocomplete`'s result panel flips **above** the control when the results do not fit below it
  and there is more room above — a field at the foot of a modal used to drop its options off screen. The
  panel also clamps its height to the room on the side it opens to, so a list that fits neither way scrolls
  inside the viewport instead of running past its edge; `--rg-dropdown-max-height` stays the ceiling.
  `useAutocomplete` returns a `resultEl` ref for this and `Autocomplete` binds and exposes it — a
  replacement skin must put `ref="resultEl"` on its panel next to `:style="resultStyle"`, or the panel is
  never measured and keeps opening downwards.

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
