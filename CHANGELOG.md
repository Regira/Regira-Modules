# Changelog

Release summary for the `regira` npm package — newest first. Every user-visible change adds one
bullet under **Unreleased** in the same change, and leaves `version` in `package.json` higher than
the last published release. On publish, the Unreleased block becomes a `## x.y.z — YYYY-MM-DD`
heading.

## Unreleased

- Documentation accuracy pass: module READMEs and the `vue/entities` docs re-verified against source — directive registration (`app.use`, not `app.directive`), `Autocomplete`'s click-outside plugin requirement, `useAuth` vs `$auth`/`useGlobalAuth`, `clipboardUtility` call form, unreachable `objectUtility` members, attachments-service constructor guidance, `useFilter`'s `Constructor` input and `service.list()` return shape all corrected; root README now lists the `entities`, `firebase` and `identity` export subpaths.
- Docs site: `docs/sync-modules.mjs` now rewrites source-tree-relative links to published `/reference/<id>/` paths (or GitHub URLs for unpublished targets), fixing 30+ broken links on the generated reference pages.
- Version set to 6.0.0 for the initial public npm release of the `regira` package (the name is currently unclaimed on the registry, so the first publish claims it).
- Added the npm publish workflow (`.github/workflows/publish-npm.yml`) with guards verifying the tag matches `package.json`, the version is not already on npm, and the changelog has the release heading.
