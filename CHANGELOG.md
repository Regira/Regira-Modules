# Changelog

Release summary for the `@regira/modules` npm package — newest first. Every user-visible change adds one
bullet under **Unreleased** in the same change, and leaves `version` in `package.json` higher than
the last published release. On publish, the Unreleased block becomes a `## x.y.z — YYYY-MM-DD`
heading.

## Unreleased

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
