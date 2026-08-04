# Regira Front-end Consumer Bootstrap (Vue 3 SPA)

Authoritative downstream entry for building a **browser front-end** (Vue 3 single-page app / admin UI /
CRUD client) against a **Regira.Entities** API. Use this when the target is a SPA.

> **Building the .NET back-end instead?** That is a different flow — call `get_bootstrap_guide` (the
> default consumer bootstrap). This front-end family is **npm / TypeScript**, published from the
> `Regira-Modules` repo, with package ids like `regira_modules.vue.entities`. There is **no NuGet feed and
> no license key** on the front-end.

## Pick the build tier first

Decide the tier **before reading any further guides** — it determines which docs you need at all.
**Default: a scalable, production-ready app on the full reference scaffold — whatever the app type.** Treat
every build request as production-bound: implementing the full building-block set is what makes the app
scalable, and a storefront, demo, or embed still gets the full scaffold by default. Drop to a lighter tier
only when the **user explicitly asks for a lighter build** ("keep it minimal", "just the data layer", "no
scaffold") — the app type alone is never the signal. The user holds the highest authority: when they request
a lighter or custom approach, follow it. Declare the chosen tier either way (tier definitions:
`entities.instructions` → _How much to build_).

| Tier                        | Build when…                                                   | Read (everything else is skippable)                                                                                                         |
| --------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| **Full scaffold** (default) | any app, no explicit lighter ask — storefronts/demos included | the full reading order below                                                                                                                |
| **Lean** (generic views)    | the user asks for a lighter build with standard lists         | `entities.instructions` → _How much to build_ + `entities.setup` → _Install_ / _Lean tier_ + `ui.instructions`                              |
| **Headless** (data layer)   | the user asks for data-only access / a fully bespoke UI       | `entities.setup` → _Install_ / _Headless quick-start_ + `entities.namespaces` + `ui.instructions` for any list/form UI; skip the shell docs |

**Every tier keeps the UI kit** — a lighter tier drops the slice scaffold and the shell, not the building
blocks. `Paging`/`ResultSummary`, `LoadingContainer`, `Feedback`/`useFeedback`, `DefaultModal`,
`TabContainer`, `ConfirmButton`, and `Autocomplete` import à la carte from `vue/ui` into any Vue 3 app (no
plugins required); dates/currency come from `vue/formatters`, hierarchies from `treelist` — see
`entities.setup` → _UI building blocks without the scaffold_ and `ui.instructions`.

**Full scaffold** = the complete plugin stack, the per-entity slice
(`config`/`data`/`filter`/`overview`/`details`/`selecting`/`setup`), the app shell (dashboard + navbar),
the preloader, and the `app-config.ts` runtime config. Use the **full** features of `regira`, not a
hand-rolled subset — the scaffold type-checks green out of the box and ships the server-searchable relation
pickers, pooling, and preloader a hand-rolled tier would only have to rebuild. Scaffold each entity by
copying the shipped slice template rather than re-writing ~23 files:

```bash
node node_modules/regira/_template/scaffold.mjs --shell    # → app shell once: main.ts, App.vue, router, dashboard/navbar, layout, views (--no-auth variant)
node node_modules/regira/_template/scaffold.mjs Product     # → src/entities/products/  (--no-auth for a no-auth app)
```

The app shell — the config-driven **dashboard + navbar** (`entity-navigation/` + `layout/`) — is
**auth-independent**: it builds from `$configs` + `config.json → navigation`, not the auth store, so build it
even for a no-auth app. Navigation entries reference each entity by its **`config.key`** — the literal string
in the slice's `config.ts` (conventionally the class name, e.g. `"Product"`), not the route/kebab plural and
**not** `Entity.name` (minified in a build). An unmatched key is skipped with a console warning. Hand-rolling a navbar
instead of `useNavigation()` forfeits that config-driven shell; only `users/` + `user-plugin` are auth-coupled.

**Token economy.** Prefer heading-scoped reads — `get_package(id, section, heading)` — over pulling a whole
large section. When scaffolding multiple slices, read **one** generated slice in full, then template the
rest: `List.vue`, `ListItem.vue` and `SelectorList.vue` are model-agnostic (they render `item.$title`), so
only `Form.vue` and `FilterAdv.vue` change per entity.

## MCP server

The Regira MCP server (`https://mcp.regira.com/mcp`) has full knowledge of every front-end module,
including ones not yet installed locally. Use it to discover and read guides on demand:

| Tool                                                       | Purpose                                                                                                                                                                                       |
| ---------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `list_packages` (filter `vue` / `frontend`)                | Browse the front-end module catalog.                                                                                                                                                          |
| `recommend_packages` / `search_packages`                   | First-pass / keyword package discovery.                                                                                                                                                       |
| `get_package_card`                                         | **Orient first** — the must-know card (e.g. `regira_modules.vue.entities`); often enough on its own.                                                                                          |
| `get_package_toc`                                          | List a package's documentation sections.                                                                                                                                                      |
| `get_section_toc`                                          | List a section's headings before loading content.                                                                                                                                             |
| `get_package` (`section=`, `heading=`, `maxChars`, `page`) | Read the actual guidance, scoped.                                                                                                                                                             |
| `get_example` (`section=`)                                 | Pull only matching examples.                                                                                                                                                                  |
| `list_types` / `get_type`                                  | **One symbol, one call** — exact signature from the `.d.ts` map, e.g. `get_type("regira_modules.vue.ui", "useFeedback")`. Composables and component prop types are indexed, not just classes. |

Context economy: orient with `get_package_card` first; read only your tier's primary guides in full; for
everything else prefer `get_section_toc` + heading-scoped `get_package` (several headings in one call,
comma-separated) and `get_example(pattern=…)` over whole-section reads. When you
**delegate reference-mining to a sub-agent**, ask it for distilled patterns + the 3–4 files worth cloning —
never a verbatim dump of every file (that alone can cost 100k+ tokens for little gain).

**Checking one signature: use `get_type`.** `get_type("regira_modules.vue.ui", "useFeedback")` returns the
declaration in a single call. Reach for the installed `dist/**/*.d.ts` (in `node_modules/regira`) when you want to _browse_ a module's
surface — locating the right file first costs several shell round-trips, which is enough friction that
guessing starts to look cheaper than verifying. It never is: `useFeedback`, `useOwnedCollection` and
`useDetails` are the three most-misremembered shapes in this library.

**Components answer to the same call, under a different name.** A `.vue` build emits an anonymous default
export, so a component is never indexed — its authored contract is, as `<Component>Props` / `<Component>Emits`
/ `<Component>Slots`. `get_type("regira_modules.vue.ui", "ConfirmButton")` resolves to those types for you and
says which of the three exist; for slots, events and defaults that the prop type cannot carry, the source of
truth is `get_package("regira_modules.vue.ui", section: "ui.signatures")`.

## Pre-flight checklist

- [ ] **Probe the install before reading further.** `regira` installs from GitHub
      (`"regira": "github:Regira/Regira-Modules"`), so npm needs a **`git` binary on `PATH`** plus
      network access — sandboxed/CI environments may block non-registry installs, and the shorthand can
      resolve over SSH where port 22 is closed. Pin HTTPS when either bites:
      `"regira": "git+https://github.com/Regira/Regira-Modules.git"` (or
      `git config --global url."https://github.com/".insteadOf git@github.com:`). Run the `npm install`
      first and surface any blocker before spending context on guides. **Expect it to be slow** — the first
      install clones the repo, pulls the full Vite/TS toolchain, and runs the package's `prepare`
      build (`vite build` + `vue-tsc`) to produce `dist/`, routinely past a 2-minute shell timeout;
      run it detached (or raise the timeout) and poll, rather than reading a timeout as failure. No NuGet, no
      license key, no service budget on the front-end.
- [ ] Peers + toolchain installed from the **known-good dependency set** (`entities.setup` → Install) in
      one `npm install` — the majors move as a set (`vue-router 5` → `vite 8` → `typescript 6` /
      `vue-tsc 3`); do not resolve them one `ERESOLVE` at a time.
- [ ] **Authentication is optional.** Do not assume the auth plugin is required; follow the _Running
      without authentication_ recipe in `entities.setup` to run without a login.
- [ ] **Type the client from the API's OpenAPI.** When the API exposes OpenAPI, generate TypeScript types
      from it and feed them into the hand-written entity models (you still hand-write the model classes).
- [ ] The primary guides **for the chosen tier** (full tier: `entities.instructions` + `entities.setup`)
      are read in full before generating slices, services, composables, or the app shell.
- [ ] **Restyling never requires forking the library.** Theme tokens, stable `rg-*`/`is-*` css hooks,
      typed slots, contract-typed replacement skins, and `scaffold.mjs --ui <Component>` ejects cover
      every customization level — see `regira_modules.vue.ui` → `ui.customize`.
- [ ] Verify the SPA with `npm run build` (`vue-tsc -b`) in the generated app — not only a `--noEmit` typecheck.

## Reading order (start here)

Minimum viable read: the card, then the workflow sections of `entities.instructions`. Everything below
that is fetched by heading when the current task needs it — `get_section_toc` first, then the one heading.
Loading a whole reference section is the exception, not the on-ramp.

0. `get_package_card id="regira_modules.vue.entities"` — the must-know bullets (built-ins checklist,
   owned-collection rule, save/paging contract). Orient here; it decides which sections you need at all.
1. `get_package id="regira_modules.vue.entities" section="entities.instructions"` — the entity-slice
   workflow and conventions (incl. the list-vs-search / simple-vs-complex composable mapping). Read the
   workflow before writing a slice; leave the gotcha and troubleshooting tables for symptom lookup.
2. `section="entities.setup"` — the new-project template (Vite + Pinia + vue-router): `main.ts`,
   `App.vue`, router, plugin install order, **required-vs-optional plugins**, **running with or without
   authentication**, the npm install (no alias needed), the **full project structure** (per-entity folder
   set incl. `selecting/`, plus `components/`, `infrastructure/`, `config.json` + `app-config.ts`), and
   **Bootstrap 5** styling.
3. `section="entities.namespaces"` (exact import specifiers) + `section="entities.signatures"` (entity-side
   signatures) + `regira_modules.vue.ui` → `section="ui.signatures"` (the **kit's** components and
   composables — `useFeedback`, `ConfirmButton`, `NullableCheckBox`, `Tab`, the inputs) — consult while
   coding. `ui.signatures` is not optional reading: the kit is what a hand-written view calls, and its member
   arities are the most commonly extrapolated-and-wrong shapes in the library. **Never guess** a front-end
   import or signature; `get_type` settles a single one in one call.
4. `section="entities.examples"` (simple + standard slices) / `section="entities.advanced.example"`
   (complex slice), then `section="entities.patterns"` (child collections, trees, JSON lookups, typing
   the client from OpenAPI, custom endpoints) — load on demand.

## Front-end module family

The CRUD client `regira_modules.vue.entities` wires onto sibling modules:

| Module id                                                           | Role                                                                            |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `regira_modules.vue.entities`                                       | CRUD client: models, services, search/paging, overview/details/form composables |
| `regira_modules.vue.ioc`                                            | DI container (`$services`, `get()`)                                             |
| `regira_modules.vue.http`                                           | shared axios instance + query strings                                           |
| `regira_modules.vue.app`                                            | app lifecycle (`AppStatus`, `$setAppStatus`) + culture                          |
| `regira_modules.vue.ui`                                             | icon / loading / modal / feedback components and plugins                        |
| `regira_modules.vue.auth`                                           | bearer-token auth (**optional**)                                                |
| `regira_modules.vue.lang`                                           | i18n (`$t`)                                                                     |
| `regira_modules.vue.directives`, `.formatters`, `.online`, `.debug` | smaller helpers                                                                 |
| `regira_modules.io`                                                 | `FileHelper` / `ImageHelper` (uploads, blob/base64/url, image ops)              |

## You are the Vue 3 / TypeScript / Vite expert

These guides cover Regira's front-end modules only. General front-end concerns — dev server, proxy, CORS,
bundling, the build — are yours to own. Style with **Bootstrap 5**. When a Regira import, signature, or
option is unconfirmed, **stop and ask**; do not invent it — verify against `entities.namespaces` /
`entities.signatures` and the installed `dist/**/*.d.ts`.

## Following conventions

Follow the prescribed conventions by default; deviate deliberately, not by defaulting to a remembered
pattern, and declare any **intended deviations** and why. This applies especially to the **build tier**
(`entities.instructions` → _How much to build_) — declare which one and reuse the library data layer and
generic views (`EntityOverview` / `EntityForm`) rather than re-implementing them —
the **per-entity slice / project structure** (`entities.setup` → _Project structure_), and **Bootstrap 5**
styling (`entities.setup` → _Bootstrap — main.ts_). The scaffolded templates are **indicative of
functionality, not appearance** — their default styling is deliberately plain, and **improving it is
encouraged and expected**; the app-owned shell components go one step further and may be **replaced
outright** by your own design, not merely restyled. The customization ladder in `regira_modules.vue.ui` → `ui.customize` (theme
tokens → `rg-*` css hooks → slots → contract-typed replacement → `scaffold.mjs --ui` eject) covers every
level; what you preserve is the contract (composables, props/emits/slots, DI, plugin order, routing,
`_deleted` marking, `rg-*`/`is-*` hooks), not the look.

## App-quality defaults (apply unless the user opts out)

- **Prefer the provided components — for the UI kit.** Reach for a library built-in and
  restyle/wrap/eject it before writing a new one (pager, spinner, toast, modal, tab strip, confirm
  button, autocomplete, account form): their behaviour lives in the `use*` composables, so a rewrite
  re-earns it from scratch.
- **The app shell is yours to design.** The scaffolded shell components (`layout/`, `entity-navigation/`,
  the views) are app-owned **default implementations of a functionality**, not a prescribed look — replace
  any of them outright with your own design whenever the app calls for it (`entities.shell.template` →
  _Default implementations, not requirements_). Use the generated ones as-is when no stronger design is
  called for.
- **Keep the functionality when you replace a component.** A custom design may not silently drop what the
  component it replaced provided — every entity manageable, server-side paging + count + filtering,
  confirmed delete, related records openable from where they're shown, pooled (reactive) relation labels,
  visible feedback/loading, the **full** account surface when auth is requested (sign in, forgot, reset,
  change password, sign out), a language selector when multilanguage. Checklist:
  `entities.instructions` → _Functionality contract_. If the **user** asks for less, build what they asked
  — the rule is against losing a capability by accident, not against a smaller scope.
- **Responsive layout, always** — unless the user explicitly requests otherwise. Bootstrap grid with
  breakpoint variants, `d-none d-md-inline` button labels, `d-none d-md-block` to drop list columns on
  small screens, `$screen` for JS-side switches (`entities.patterns` → _Overview list layout_).
- **Tabs for big forms.** When an entity form grows beyond a handful of fields or has related data
  (children, links, trees), split it with hash-routed tabs — a main `#form` tab plus related-data tabs
  (`entities.patterns` → _Tabbed forms_; always `:use-route-nav="!isPopup"`).
- **Auth means the full account surface, shown on time.** Wire login **and** forgot/reset/change
  password with the provided components (`vue/auth`), and pop the login modal immediately for anonymous
  users instead of rendering a dashboard they can't use (`auth.instructions` → _Account UI_).
- **Multilanguage means a visible selector.** Wire `LangSelector` (from `vue/lang`) into the header
  whenever the app is multilanguage.
- **Group form fields** with `FormSection` (+ `FormLabel`, `input-group` icon prefixes) instead of flat
  field lists.
- **Every component you add or modify gets deliberate styling and placement.** Spacing (`mb-2`/`mb-3`,
  `gap-*`), alignment (`align-items-center`), and a gap between an icon and its label are part of the
  work, not polish for later — a dropped-in component with none reads as unfinished.

## Code-generation workflow

1. Confirm the target is a Vue 3 SPA (otherwise use the back-end `get_bootstrap_guide`).
2. Choose the entity slices the app needs (one slice per entity).
3. **Hand-author `package.json`** from the known-good dependency set (`entities.setup` → Install) and run
   one `npm install`. Do **not** run `npm create vue@latest` — it prompts interactively and cannot be
   driven headless, and its output then blocks step 5: `scaffold.mjs --shell` refuses to overwrite the
   generated `index.html` without `--force`, and that file has no `#modals` teleport host — so every
   modal, `FormModalButton` and `ConfirmButton` silently opens nothing.
4. Orient with `get_package_card("regira_modules.vue.entities")`, then read the core sections of
   `entities.instructions` and `entities.setup` (via MCP `get_package`). Troubleshooting/lookup tables are
   symptom-driven — fetch a heading when you hit the symptom, not up front. For one exact signature call
   `get_type`; for a set of them read `entities.signatures` / `ui.signatures` by heading rather than whole.
5. Scaffold the app shell — `node node_modules/regira/_template/scaffold.mjs --shell` (`--no-auth`
   for a no-auth app) writes `main.ts`, `App.vue`, router, dashboard/navbar, layout, views, `config.json` +
   `app-config.ts` (full source: `entities.shell.template`); then set up the toolchain per `entities.setup` → Install.
6. Scaffold each entity slice with `node node_modules/regira/_template/scaffold.mjs <Entity>`
   (add `--no-auth` for a no-auth app), then customize the `(c)` files; consult `entities.namespaces` / `entities.signatures` for exact
   imports/signatures and `entities.patterns` for recipes. Re-running the scaffold over an existing slice
   needs `--overwrite-slice` (`--force` deliberately excludes slices). For entities that own files/pictures,
   scaffold the shared offline file slice once with `scaffold.mjs --attachments` and wire it into each
   (a tab + the model/service/`setup.ts` edits).
7. Verify with `npm run build` (`vue-tsc -b`), then **drive the app in a browser** — a green build proves
   compilation only. Walk the runtime checklist in `entities.instructions` (save twice, filter + reopen,
   empty/new-row paths) and check the main views at a mobile viewport before calling anything responsive.
