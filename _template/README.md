# Entity slice template

`entity-slice/` is one complete **full-tier** Regira entity slice (data layer + filter + overview + details +
relation pickers + routing/DI). Copy it once per entity to scaffold a new entity instead of hand-writing ~23
files.

## Use it

```bash
# from your app root, with regira installed:
node node_modules/@regira/modules/_template/scaffold.mjs Product
# → creates src/entities/products/ with the names filled in
# no-auth app? also strip the auth-store reload hooks:
node node_modules/@regira/modules/_template/scaffold.mjs Product --no-auth
# owns a collection (back-end e.Related)? scaffold its editable table too (repeat --owns per child):
node node_modules/@regira/modules/_template/scaffold.mjs Order --owns OrderLine
# a to-one relation? generate the pooled overview column AND its advanced filter (repeat --rel per relation):
node node_modules/@regira/modules/_template/scaffold.mjs Intervention --rel Vehicle
# the entity owns files? scaffold the shared attachments slice and wire it into this one:
node node_modules/@regira/modules/_template/scaffold.mjs Intervention --attachments
# server exposes the resource under a different name than the slice folder?
node node_modules/@regira/modules/_template/scaffold.mjs PartyRelationshipType --api relationship-types
```

Or copy by hand and replace the tokens:

```bash
cp -r node_modules/@regira/modules/_template/entity-slice src/entities/products
```

| Token             | Replace with                             | Example           |
| ----------------- | ---------------------------------------- | ----------------- |
| `__Entity__`      | PascalCase class name                    | `ShoppingList`    |
| `__entities__`    | folder + client route (kebab-case)       | `shopping-lists`  |
| `__entity__`      | singular route/id (kebab-case)           | `shopping-list`   |
| `__api__`         | API resource path — must equal `[Route]` | `/shopping-lists` |
| `__entitiesKey__` | plural **camelCase** i18n key            | `shoppingLists`   |
| `__entityKey__`   | singular **camelCase** i18n key          | `shoppingList`    |

(`scaffold.mjs` fills these automatically; the camelCase i18n keys keep multi-word titles from rendering raw.)

Then register the slice's `plugin` in `src/entities/index.ts` (see the entities setup guide → Add entities).

## Owned collections (`--owns <Child>`)

`--owns <Child>` also scaffolds `owned-slice/` under the entity — an editable, `_deleted`-marked scalar-row
table (`useOwnedCollection`) for a back-end `e.Related(...)` child. It prints the three lines that wire it into
the parent (`Array<Child>` field, `<ChildOverview>` in the form, and the `prepareItem` `_deleted` filter). The
child model carries a `static create(values?)` named constructor: stored rows arrive as plain JSON (only the
root item passes through a service's `toEntity`), so lift them with it in the **owning** service's `toEntity`.
Use `InputSelectorInline` chips instead when the rows link to another entity (see the entities patterns guide).

## What to edit

Files carrying real per-entity content are marked **(c)** in the entities template guide: `data/Entity.ts`,
`config/config.ts`, `filter/SearchObject.ts`, `filter/FilterAdv.vue`, `overview/List.vue`,
`overview/ListItem.vue`, `details/Form.vue`, `selecting/SelectorList.vue`. The rest is boilerplate — leave it
as-is. Building without authentication? Scaffold with `--no-auth` — it strips the `useAuthStore` hooks in
`overview/Overview.vue` and `details/Details.vue` (and `load` from `Details.vue`'s `useDetails` destructure,
used only by that hook); for an existing slice, delete those commented lines and drop `load` from the destructure.

## App shell (`--shell`)

`app-shell/` is the one-time application shell — bootstrap (`main.ts`, `App.vue`), runtime config, router,
the config-driven dashboard + navbar, layout chrome, and views. Scaffold it once into a new app:

```bash
node node_modules/@regira/modules/_template/scaffold.mjs --shell            # auth-on
node node_modules/@regira/modules/_template/scaffold.mjs --shell --no-auth  # no-auth (omits the auth files + wiring)
```

It writes `src/**` + `public/config.json` + `public/data/translations.json`, skipping files that already
exist (`--force` overwrites). Set up the build toolchain (`vite.config`/`tsconfig`/`index.html`) from the
entities setup guide → Install first.

## Attachments (`--attachments`)

`entity-attachments/` is the shared offline file slice — an add / rename / remove list plus a drop zone
(`useOwnedCollection` over `EntityAttachment` rows), committed on the parent's save. Scaffold it once per
app — naming an entity does that and wires the slice up in one go:

```bash
node node_modules/@regira/modules/_template/scaffold.mjs Product --attachments   # shared slice + wire it into a NEW Product slice
node node_modules/@regira/modules/_template/scaffold.mjs --attachments           # shared slice only (--force overwrites)
```

Into a slice it generates, it writes the `attachments?: Array<EntityAttachment>` field, the
`insert`/`update` overrides, and the `prepareItem` `_deleted` filter — that last one is what makes a file
the user removed actually disappear on save, and it is the step that gets missed by hand. Against a slice
that already exists it prints those edits instead, since those files are yours.

Left to you either way: the `<EntityAttachments>` tab in the form — ⚠️ it renders its **own**
`FormSection`, so it goes in a tab or beside the form's section, never inside one — the `files` /
`addNewFile(s)` translations, and the back-end registration (`WithAttachments` + `HasAttachments<>`).
`setup.ts` needs no change: the helpers upload through `useAxios()`.

## Ejected UI skins (`--ui <Component>`)

`ui/` holds ejectable copies of the UI-kit reference skins — every imported built-in, from the modal,
paging, autocomplete, feedback, tabs and account forms down to the small input widgets, icons, loading,
debug, lang and gis components — for when CSS/slots aren't enough and you want the markup itself:

```bash
node node_modules/@regira/modules/_template/scaffold.mjs --ui list          # what's available
node node_modules/@regira/modules/_template/scaffold.mjs --ui DefaultModal  # → src/components/ui/ (--dir overrides)
```

The copy's imports are rewritten to public `@regira/modules/...` specifiers, so behavior (composables,
contract types) keeps flowing from the library — only the markup is yours. Restyle freely; keep the
contract (props/emits/slots, `rg-*`/`is-*` hooks, responsive) per the ui customize guide. The ejected
modal is registered app-wide via `app.use(modalPlugin, { Modal })`; the ejected loading indicator via
`app.use(loadingPlugin, { img, Loading })` — each `--ui` eject prints its own wiring note.

> `entity-slice/`, `app-shell/`, and `entity-attachments/` are generated from the AI docs by
> `scripts/build-entity-template.mjs`; `ui/` is generated from the real component source by
> `scripts/build-ui-template.mjs` — do not edit any of those by hand. `owned-slice/` (used by `--owns`) is
> hand-maintained: no generator produces it, so edit it directly.
