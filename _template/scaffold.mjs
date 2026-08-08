#!/usr/bin/env node
// Scaffold a Regira app — one entity slice, the one-time app shell, or an ejected UI skin.
//
//   node node_modules/@regira/modules/_template/scaffold.mjs <Entity> [options]   # an entity slice
//   node node_modules/@regira/modules/_template/scaffold.mjs --shell [options]    # the app shell (once per app)
//   node node_modules/@regira/modules/_template/scaffold.mjs --ui <Component>     # eject a UI-kit reference skin
//   node node_modules/@regira/modules/_template/scaffold.mjs --ui list            # list the ejectable components
//   node node_modules/@regira/modules/_template/scaffold.mjs <Entity> --attachments  # a slice whose entity owns files
//   node node_modules/@regira/modules/_template/scaffold.mjs --attachments        # the shared offline file/attachments slice only
//
//   <Entity>            PascalCase class name, e.g. Product
//   --plural <name>     slice folder + client route prefix (default: kebab-cased plural — Category →
//                       categories, Box → boxes, InterventionType → intervention-types)
//   --api <path>        API resource path, relative to the axios baseURL (default: /<plural>). Must equal the
//                       server's [Route(...)] exactly; pass it when the two differ, e.g. a
//                       party-relationship-types slice served under --api relationship-types. The leading
//                       slash is optional — omit it under Git Bash, which rewrites /foo into a file path.
//   --singular <name>   singular i18n key (default: kebab-cased Entity)
//   --rel <Entity>      generate an overview column for a to-one relation: the related entity's
//                       FormModalButton + a label resolved through its pool (never the raw nested DTO, which
//                       has no $title, nor item.rel.title, which goes stale). Repeatable. The related slice
//                       must already be scaffolded — the column imports from its barrel, and its folder is
//                       looked up from the scaffolded slices (so a related slice with its own --plural, e.g.
//                       Person --plural people, still resolves). A differently-named FK
//                       takes an optional trailing `--as <field>`: `--rel Employee --as assignedToEmployee`
//                       binds assignedToEmployee(Id) instead of the default employee(Id), still the Employee slice.
//   --dir <path>        target base folder for a slice (default: src/entities) or an ejected skin (default: src/components/ui)
//   --owns <Child>      also scaffold an editable owned-collection sub-slice (a `_deleted`-marked scalar-row
//                       table via useOwnedCollection) under the entity, for a back-end `e.Related(...)` child.
//                       Repeatable. PascalCase, e.g. --owns OrderLine --owns OrderNote. Works on an existing
//                       slice too: only the sub-slice files are generated then.
//   --as <fieldName>    the JSON key for the --owns OR --rel directly before it — must match the back-end
//                       navigation's camelCase key. After --owns: the owned-collection field (default camelCase
//                       plural of the child, OrderLine → orderLines). After --rel: the to-one navigation property
//                       (default camelCase of the class, Employee → employee; its FK is that + Id). Place it right after its --owns/--rel:
//                       --owns Row --as orderRows  /  --rel Employee --as assignedToEmployee
//   --picker <Target>   the --owns before it is a PURE JOIN onto <Target> — only the two FKs, no scalar fields
//                       of its own: emit InputSelectorInline chips selecting <Target> instead of an editable
//                       table, over a plain join-row interface. Chains after --as; the picked slice must
//                       already be scaffolded. A join row that also carries a scalar (a quantity, a status)
//                       is not pure — leave --picker off and edit it as a table.
//   --shell             scaffold the app shell (toolchain, main.ts, App.vue, config, router, dashboard/navbar, layout, views) into the app root
//   --ui <Component>    copy a UI-kit component's reference skin into the app for free restyling; the copy
//                       imports only public @regira/modules/... API, so behavior keeps flowing from the library
//   --attachments       this entity owns files: scaffold the shared entity-attachments slice (offline
//                       add/rename/remove + drop zone, committed on the parent's save) and wire it into the
//                       slice — the attachments field, the insert/update overrides, and the prepareItem
//                       filter that drops rows marked for deletion. Only the form tab is left to place.
//                       Passed alone (no entity), it scaffolds the shared slice and stops.
//   --no-auth           strip the auth wiring (slice: reload hooks; shell: auth plugins/UI, the auth-only files + config.json keys)
//   --force             overwrite files that already exist (--shell / --ui / --attachments only — never an
//                       entity slice; slices hold hand-edited (c) files and need the explicit flag below)
//   --overwrite-slice   overwrite an existing entity slice (or owned sub-slice), customized (c) files
//                       included — destructive, deliberate opt-in
//
// Examples:
//   node .../scaffold.mjs Category --plural categories
//   node .../scaffold.mjs PartyRelationshipType --api relationship-types
//   node .../scaffold.mjs Intervention --rel Vehicle --rel Supplier
//   node .../scaffold.mjs Task --rel Employee --as assignedToEmployee   # FK assignedToEmployeeId → Employee slice
//   node .../scaffold.mjs Order --owns OrderLine
//   node .../scaffold.mjs Order --owns OrderLine --as lines   # back-end nav `Lines` → JSON key "lines"
//   node .../scaffold.mjs --shell --no-auth
//   node .../scaffold.mjs --ui DefaultModal

import { readdirSync, mkdirSync, readFileSync, writeFileSync, existsSync, rmSync } from "fs"
import { resolve, dirname, join, relative } from "path"
import { fileURLToPath } from "url"

const argv = process.argv.slice(2)
const opt = (flag, fallback) => {
    const i = argv.indexOf(flag)
    return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback
}
// The entity name is the first bare token — but a flag's VALUE is bare too, so `--dir src/modules` would
// otherwise be read as the entity (and `--attachments --dir x` would die on "SrcModules is not PascalCase").
const VALUE_FLAGS = new Set(["--dir", "--api", "--plural", "--singular", "--ui", "--rel", "--owns", "--as", "--picker"])
const firstBareArg = () => argv.find((a, i) => !a.startsWith("--") && !VALUE_FLAGS.has(argv[i - 1]))
const noAuth = argv.includes("--no-auth")
const force = argv.includes("--force")
const overwriteSlice = argv.includes("--overwrite-slice")
const here = dirname(fileURLToPath(import.meta.url))

// ----------------------------------------------------------------- help / usage
// Checked before every scaffolding path: --help is informational only, never writes files.
if (argv.includes("--help") || argv.includes("-h")) {
    printUsage()
    process.exit(0)
}

// ------------------------------------------------------------------ app shell
if (argv.includes("--shell")) {
    scaffoldShell()
    process.exit(0)
}

// ------------------------------------------------------------ ejected UI skin
if (argv.includes("--ui")) {
    scaffoldUi(opt("--ui"))
    process.exit(0)
}

// -------------------------------------------------- shared attachments slice
// With an entity named, --attachments means "this entity owns files": the shared slice is scaffolded (once,
// idempotently) and then wired into that entity's slice below. Alone, it scaffolds the shared slice only.
// Before this branched, `scaffold.mjs Product --attachments` scaffolded the shared slice and silently ignored
// Product — leaving the owner's prepareItem unwired, which submits rows the user marked for deletion.
// With an owner the shared slice is scaffolded further down, AFTER the slice guard has had its say: doing it
// here would announce a wiring the guard then refuses to perform, leaving nothing written and a non-zero exit.
const attachmentsOwner = argv.includes("--attachments") ? firstBareArg() : undefined
if (argv.includes("--attachments") && !attachmentsOwner) {
    scaffoldAttachments()
    attachmentsManualSteps()
    process.exit(0)
}

function scaffoldUi(component) {
    const uiRoot = resolve(here, "ui")
    if (!existsSync(uiRoot)) {
        console.error(`✗ ${uiRoot} not found — regira is missing the generated ui template.`)
        process.exit(1)
    }
    const manifest = JSON.parse(readFileSync(join(uiRoot, "manifest.json"), "utf8"))
    if (!component || component === "list") {
        console.log("Ejectable UI components (scaffold.mjs --ui <Component>):")
        for (const entry of manifest) console.log(`  · ${entry.name}  (${entry.files.join(", ")})`)
        return
    }
    const entry = manifest.find((e) => e.name.toLowerCase() === component.toLowerCase())
    if (!entry) {
        console.error(`✗ Unknown UI component "${component}" — run --ui list to see what's available.`)
        process.exit(1)
    }
    const targetDir = resolve(process.cwd(), opt("--dir", "src/components/ui"))
    mkdirSync(targetDir, { recursive: true })
    const written = []
    const skipped = []
    for (const file of entry.files) {
        const dest = join(targetDir, file)
        if (existsSync(dest) && !force) {
            skipped.push(file)
            continue
        }
        writeFileSync(dest, readFileSync(join(uiRoot, entry.name, file), "utf8"))
        written.push(file)
    }
    console.log(`✓ Ejected ${entry.name} → ${relative(process.cwd(), targetDir)} (${written.join(", ") || "nothing new"})`)
    if (skipped.length) console.log(`  Skipped existing: ${skipped.join(", ")} (pass --force to overwrite)`)
    console.log(`  Wiring: ${entry.note}`)
    console.log("  The copy is yours — restyle freely; keep the documented contract (props/emits/slots, rg-*/is-* hooks, responsive).")
}

// --------------------------------------------------------------- entity slice
const name = firstBareArg()
if (!name) {
    console.error("Usage: scaffold.mjs <Entity> [options] | --shell | --ui <Component> | --attachments   (run --help for all flags)")
    process.exit(1)
}
// The name becomes a class, so it must be PascalCase — the same rule --rel and --owns enforce.
if (!/^[A-Z][A-Za-z0-9]*$/.test(name)) {
    // Capitalize each word rather than stripping separators: the message is phrased as a runnable command,
    // so a flattened "Shoppinglist" would be copied verbatim and produce the wrong class name.
    const suggestion = name
        .split(/[^A-Za-z0-9]+/)
        .filter(Boolean)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join("")
    console.error(`✗ <Entity> must be PascalCase (a class name) — received "${name}". Try: scaffold.mjs ${suggestion}`)
    process.exit(1)
}
// A model class shadows a same-named DOM global inside every module that imports the slice barrel. It
// type-checks and usually works (module scope wins), but the failures it does cause are baffling: `(e: Event)`
// in a handler silently resolves to the entity, and `new Location()` reaches the DOM constructor and throws
// "Illegal constructor". The back-end guides already warn about the equivalent entity↔namespace collision.
const DOM_GLOBALS = [
    "Event",
    "Location",
    "Text",
    "Image",
    "Range",
    "Selection",
    "Notification",
    "Request",
    "Response",
    "Screen",
    "History",
    "Node",
    "Element",
    "Comment",
    "Document",
    "Option",
    "Attr",
]
// Applies to the scaffolded entity AND to every --owns/--rel class: a child or relation named only through a
// flag still emits a model class into the same barrel, so it shadows the global just as effectively. Called
// once the flags are parsed but before anything is written — a collision found after generation costs a
// scaffold-and-delete cycle.
const warnDomGlobal = (className, origin) => {
    if (!DOM_GLOBALS.includes(className)) return
    console.log(
        `! "${className}"${origin} is also a DOM global. The model class shadows window.${className} inside every module that imports this slice — a handler typed (e: ${className}) resolves to your entity, and new ${className}() can reach the DOM constructor and throw "Illegal constructor".`
    )
    console.log(
        `  Prefer a suffixed class name (${className}Item, ${className}Record). Renaming the CLASS does not rename the back-end JSON key it binds to, so every --owns/--rel pointing at it then needs --as <originalKey>; keep the resource, route and i18n keys as they are. Renaming later needs --overwrite-slice, which REPLACES the 8 (c) files you authored by then.`
    )
}
const lowerFirst = (s) => s.charAt(0).toLowerCase() + s.slice(1)
const upperFirst = (s) => s.charAt(0).toUpperCase() + s.slice(1)
const pluralize = (s) => (/(?:s|x|z|ch|sh)$/i.test(s) ? s + "es" : /[^aeiou]y$/i.test(s) ? s.slice(0, -1) + "ies" : s + "s")
// Route/folder identifiers are kebab-case, matching the conventional controller route: InterventionType →
// "intervention-types", which is what [Route("intervention-types")] serves. Flattening to one lowercase word
// would emit "/interventiontypes" and every request 404s.
const kebab = (s) =>
    s
        .replace(/([A-Z]+)([A-Z][a-z])/g, "$1-$2")
        .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
        .toLowerCase()
const plural = lowerFirst(opt("--plural", kebab(pluralize(name))))
const singular = lowerFirst(opt("--singular", kebab(name)))
// The API resource path defaults to the folder name, but the two are separable: the server may expose a
// resource under a different name than the slice is filed under (--api /relationship-types).
const api = opt("--api", `/${plural}`).replace(/^\/*/, "/")
// A POSIX shell on Windows (Git Bash/MSYS) rewrites a leading-slash argument into a filesystem path, so
// `--api /products` silently arrives as `/C:/Program Files/Git/products`. Catch it rather than emit it.
if (/^\/[A-Za-z]:\//.test(api)) {
    console.error(
        `✗ --api received "${api}" — a POSIX shell on Windows expanded the leading slash. Pass it without one: --api ${api.split("/").pop()}`
    )
    process.exit(1)
}
// i18n keys are camelCase (derived from the PascalCase name), unlike the kebab-case route/folder/api
// identifiers above: ShoppingList → route "shopping-lists" but i18n keys "shoppingLists" / "shoppingList".
// A lowercase i18n key silently renders raw (only a console warning), so keep the word boundaries.
const camelPlural = lowerFirst(pluralize(name))
const camelSingular = lowerFirst(name)
const baseDir = opt("--dir", "src/entities")

const srcRoot = resolve(here, "entity-slice")
const destRoot = resolve(process.cwd(), baseDir, plural)

// --owns and --rel each accept an optional trailing `--as <field>` that renames the JSON key. Parsed in one
// ordered pass so placement is unambiguous: an `--as` binds to the --owns/--rel whose value token sits
// immediately before it (a misplaced --as is a hard error, like every other bad flag value, never a silent
// default). --owns → the owned-collection field; --rel → the to-one navigation property (its FK is that +Id).
// A --rel value must look like a class name, or the next flag is consumed as one (`--rel --no-auth` would
// otherwise scaffold a relation named "--no-auth"); an --as value must be a camelCase JSON key.
const owns = []
const rels = []
let pending = null // the last --owns/--rel still able to take an `--as`; { set, kind, valueIndex }
for (let i = 0; i < argv.length; i++) {
    const flag = argv[i]
    const value = argv[i + 1]
    const hasValue = !!value && !value.startsWith("--")
    if (flag === "--owns") {
        if (!hasValue) {
            console.error("✗ --owns requires a PascalCase child class name (e.g. --owns OrderLine).")
            process.exit(1)
        }
        const entry = { child: value, field: undefined, picker: undefined }
        owns.push(entry)
        pending = { entry, set: (f) => (entry.field = f), kind: "--owns", valueIndex: i + 1 }
    } else if (flag === "--rel") {
        if (!hasValue || !/^[A-Z][A-Za-z0-9]*$/.test(value)) {
            console.error("✗ --rel requires a PascalCase related class name (e.g. --rel Vehicle).")
            process.exit(1)
        }
        const entry = { name: value, field: undefined }
        rels.push(entry)
        pending = { entry, set: (f) => (entry.field = f), kind: "--rel", valueIndex: i + 1 }
    } else if (flag === "--as") {
        if (!pending || pending.valueIndex !== i - 1 || pending.as) {
            console.error(
                "✗ --as must come directly after the --owns or --rel it renames (e.g. --owns OrderLine --as lines, --rel Employee --as assignedToEmployee)."
            )
            process.exit(1)
        }
        if (!hasValue) {
            console.error(
                "✗ --as requires a field name — the back-end navigation's camelCase JSON key (e.g. --as orderLines, --as assignedToEmployee)."
            )
            process.exit(1)
        }
        if (!/^[a-z][A-Za-z0-9]*$/.test(value)) {
            console.error(`✗ --as value "${value}" must be a camelCase JSON key (lower-case first letter), e.g. assignedToEmployee.`)
            process.exit(1)
        }
        if (pending.kind === "--rel" && /Id$/.test(value)) {
            const nav = value.replace(/Id$/, "")
            console.error(
                `✗ --as after --rel takes the navigation property (${nav}), not its FK (${value}) — the scaffold derives the ${value} FK itself. Drop the trailing "Id".`
            )
            process.exit(1)
        }
        pending.set(value)
        // Stays pending so a --picker can chain after the rename (--owns X --as f --picker Y); `as` marks it
        // consumed, so a second --as is misplaced rather than silently overwriting the first.
        pending.as = true
        pending.valueIndex = i + 1
    } else if (flag === "--picker") {
        if (!pending || pending.kind !== "--owns" || pending.valueIndex !== i - 1 || pending.picker) {
            console.error(
                "✗ --picker must come directly after the --owns it applies to (e.g. --owns ArticleCategory --as categories --picker Category)."
            )
            process.exit(1)
        }
        if (!hasValue || !/^[A-Z][A-Za-z0-9]*$/.test(value)) {
            console.error(
                "✗ --picker requires the PascalCase class the join row points AT — the entity being picked, not the join itself (e.g. --owns ArticleCategory --picker Category)."
            )
            process.exit(1)
        }
        if (value === pending.entry.child) {
            console.error(
                `✗ --picker ${value} repeats the --owns class. It names the OTHER side of the join — the entity whose rows the chips select.`
            )
            process.exit(1)
        }
        pending.entry.picker = value
        pending.picker = true
        pending.valueIndex = i + 1
    }
}

warnDomGlobal(name, "")
for (const o of owns) warnDomGlobal(o.child, " (--owns)")
for (const r of rels) warnDomGlobal(r.name, " (--rel)")

// The owned-collection JSON key — the back-end navigation's camelCase key, defaulting to the camelCase plural
// of the child class. Derived once: the generated prepareItem filter and the sub-slice scaffolder below must
// agree on it, or the filter would clear a field the DTO does not have.
const ownedField = ({ child, field }) => field ?? lowerFirst(pluralize(child))

// The import alias mirrors the target folder: `--dir src/modules` must emit "@/modules/...", not the
// default "@/entities/...", or the generated slice cannot resolve its imports.
const aliasRoot = baseDir
    .replace(/\\/g, "/")
    .replace(/^\.?\/?src\//, "")
    .replace(/\/+$/, "")
// A --rel's slice folder is looked UP, not re-derived: the related slice may have been scaffolded with its own
// --plural (`Person --plural people` lives in "people"), and re-deriving it emits imports from a folder that
// does not exist. Every generated config.ts carries `key: "<PascalCase class>"`, so the folder holding that
// class is discoverable by scanning <baseDir>/*/config/config.ts. The derived plural stays the fallback for a
// relation that has not been scaffolded yet (the run warns about it below).
const baseDirAbs = resolve(process.cwd(), baseDir)
function findSliceFolder(className) {
    let entries
    try {
        entries = readdirSync(baseDirAbs, { withFileTypes: true })
    } catch {
        return undefined // no base dir yet — nothing to resolve against
    }
    for (const entry of entries) {
        if (!entry.isDirectory()) continue
        const cfg = join(baseDirAbs, entry.name, "config", "config.ts")
        if (!existsSync(cfg)) continue
        try {
            if (new RegExp(`\\bkey:\\s*["']${className}["']`).test(readFileSync(cfg, "utf8"))) return entry.name
        } catch {
            // an unreadable slice config is not fatal — keep scanning, then fall back to the derived plural
        }
    }
    return undefined
}
const relations = rels.map((r) => {
    const folder = findSliceFolder(r.name) ?? lowerFirst(kebab(pluralize(r.name)))
    return {
        name: r.name,
        field: r.field ?? lowerFirst(r.name), // FK binding — `--as` overrides it for a differently-named to-one
        folder,
        key: r.field ?? lowerFirst(r.name), // header i18n key — distinct per role when `--as` renames it
        alias: `@/${aliasRoot}/${folder}`,
    }
})
// The per-ENTITY blocks (imports, store consts, model imports) de-dupe by class name, so two --rel to the
// SAME entity (--rel Employee --as assignedTo --rel Employee --as reportedBy) never emit a duplicate identifier.
const relEntities = [...new Map(relations.map((r) => [r.name, r])).values()]
// Generated content is inserted after a stable line in the template rather than at a placeholder, so the
// doc sources these templates are built from stay readable as worked examples.
// Same as insertAfter, but a missing anchor is fatal. Generated content that silently fails to land ships a
// control bound to a field nobody added — the consumer meets it as a type error in their app, not here.
const insertAfterOrFail = (text, anchor, addition, file) => {
    if (addition && !text.includes(anchor)) {
        console.error(
            `✗ ${file} no longer contains "${anchor}" — regenerate _template/entity-slice from the ai docs, or update the anchor in scaffold.mjs.`
        )
        process.exit(1)
    }
    return insertAfter(text, anchor, addition)
}
const insertAfter = (text, anchor, addition) => {
    if (!addition) return text
    const i = text.indexOf(anchor)
    if (i < 0) return text
    // after the whole line, not the match — anchors are often followed by a trailing comment
    const eol = text.indexOf("\n", i + anchor.length)
    const at = eol < 0 ? text.length : eol
    return text.slice(0, at) + "\n" + addition + text.slice(at)
}
// Relation columns are revealed progressively, widest breakpoint last: every column carrying a .btn costs
// ~4.5rem it cannot shrink below, so revealing them all at md is what overflows a narrow viewport.
const relationBreakpoint = (i) => ["d-none d-md-block", "d-none d-lg-block", "d-none d-xl-block"][Math.min(i, 2)]
const relationBlocks = {
    // overview/ListItem.vue
    cells: relations
        // both the button and the label take the pooled instance — a raw nested DTO has no $title, and an
        // edit made through the button's own modal must relabel this cell without a reload
        .map(
            (r, i) =>
                `        <div class="col ${relationBreakpoint(i)} text-truncate">\n            <${r.name}Button :model-value="get${r.name}(item.${r.field})" /> {{ get${r.name}(item.${r.field})?.$title }}\n        </div>`
        )
        .join("\n"),
    imports: relEntities
        .map((r) => `import { FormModalButton as ${r.name}Button, useEntityStore as use${r.name}Store } from "${r.alias}"`)
        .join("\n"),
    stores: relEntities.map((r) => `const { fromPool: get${r.name} } = use${r.name}Store()`).join("\n"),
    // overview/List.vue — headers mirror the cells 1:1
    headers: relations.map((r, i) => `            <div class="col ${relationBreakpoint(i)}">{{ $t("${r.key}") }}</div>`).join("\n"),
    // data/Entity.ts — the FK and the nested relation, so the generated column type-checks as scaffolded.
    // Barrels export the model as `Entity`, hence the alias.
    // `import type { … }`, not the inline `import { type … }`: under verbatimModuleSyntax the inline modifier
    // keeps the import STATEMENT at runtime, and --rel is exactly what produces mutually-referencing slices —
    // whose barrels then cycle through store.ts reading Entity.name at module-evaluation time. The erased
    // form costs nothing and cannot cycle. (The failure is dev-server-only; vue-tsc and the build stay green.)
    modelImports: relEntities.map((r) => `import type { Entity as ${r.name} } from "${r.alias}"`).join("\n"),
    fields: relations
        .map(
            (r) =>
                `    ${r.field}Id?: number\n    ${r.field}?: ${r.name} // populated only when the API eager-loads it — e.Includes(...), not a client includes flag`
        )
        .join("\n"),
    // filter/SearchObject.ts — a filter per relation. SCALAR by design: an InputSelector speaks one id
    // (`idValue?: number | string`), so widening this to an array is 9 TS2322s in FilterAdv.vue. The API's
    // ICollection<TKey> binds one value or many, so widening later — behind a multi-select — is UI-only.
    searchFields: relations.map((r) => `    ${r.field}Id?: number // filter on ${r.name}`).join("\n"),
    // filter/FilterAdv.vue — the control, its entity ref, and the reset that clears it
    filterImports: relEntities
        .map((r) => `import { InputSelector as ${r.name}InputSelector } from "${r.alias}"\nimport type { Entity as ${r.name} } from "${r.alias}"`)
        .join("\n"),
    filterControls: relations
        .map(
            (r) =>
                `        <div class="mb-2">\n` +
                `            <${r.name}InputSelector\n` +
                `                v-model="filter${upperFirst(r.field)}"\n` +
                `                v-model:idValue="searchObject.${r.field}Id as number"\n` +
                `                :canEdit="false"\n` +
                `                :placeholder="$t('${r.key}')"\n` +
                `                @select="handleUpdate"\n` +
                `            />\n` +
                `        </div>`
        )
        .join("\n"),
    // Both v-models are bound on purpose: `idValue` is what filters, `modelValue` is what the control renders.
    // Bind only idValue and InputSelector's own dev warning fires — it resolves the entity into nothing.
    filterRefs: relations.map((r) => `const filter${upperFirst(r.field)} = ref<${r.name}>()`).join("\n"),
    filterResets: relations.map((r) => `    filter${upperFirst(r.field)}.value = undefined`).join("\n"),
}
function applyRelations(relPath, text) {
    if (!relations.length) return text
    // config/config.ts is deliberately NOT rewritten: `baseQueryParams` ships empty from the template, which
    // is right for a --rel run too. A to-one relation shown on every list row belongs in the API's
    // unconditional e.Includes(...) (the back-end guidance), a SIMPLE registration binds no ?includes= at all
    // so anything written here would be inert, and ["All"] on a complex entity drags every gated collection
    // onto every row. Blank fails visibly — an empty label, and the console hint names the fix — rather than
    // silently over-fetching. Keeping one shape for both paths is what stops the tool contradicting itself.
    switch (relPath.replace(/\\/g, "/")) {
        case "overview/ListItem.vue":
            text = insertAfter(text, `<div class="col text-truncate">{{ item.$title }}</div>`, relationBlocks.cells)
            text = insertAfter(text, `import FormModalButton from "../details/FormModalButton.vue"`, relationBlocks.imports)
            return insertAfter(text, `const item = defineModel<Entity>({ required: true })`, relationBlocks.stores)
        case "overview/List.vue":
            return insertAfter(text, `<div class="col">{{ $t("name") }}</div>`, relationBlocks.headers)
        case "data/Entity.ts":
            text = insertAfter(text, `import { EntityBase } from "@regira/modules/vue/entities"`, relationBlocks.modelImports)
            return insertAfter(text, `title = ""`, relationBlocks.fields)
        case "filter/SearchObject.ts":
            return insertAfterOrFail(text, `title?: string`, relationBlocks.searchFields, "filter/SearchObject.ts")
        case "filter/FilterAdv.vue": {
            const at = (anchor, addition) => (text = insertAfterOrFail(text, anchor, addition, "filter/FilterAdv.vue"))
            at(`<input v-model.lazy.trim="searchObject.title"`, relationBlocks.filterControls)
            at(`import SearchObject from "./SearchObject"`, relationBlocks.filterImports)
            at(`const searchObject = defineModel<SearchObject>({ required: true })`, relationBlocks.filterRefs)
            // framework import first, as everywhere else in the templates — hence a prefix, not an insertAfter
            text = text.replace(
                `import { IconButton } from "@regira/modules/vue/ui"`,
                `import { ref } from "vue"\nimport { IconButton } from "@regira/modules/vue/ui"`
            )
            return withFilterReset(text)
        }
        default:
            return text
    }
}

// useFilter's own handleReset clears the SEARCH OBJECT; the entity refs behind the relation selectors are the
// slice's, so a reset that leaves them set makes each control keep rendering the label of a filter that is no
// longer applied. Wrap it rather than asking the reader to remember.
const FILTER_RESET_ANCHOR = "const { handleReset, handleUpdate, filterIsActive } = useFilter({ searchObject, emit, Constructor: SearchObject })"
function withFilterReset(text) {
    if (!relations.length) return text
    if (!text.includes(FILTER_RESET_ANCHOR)) {
        console.error(
            `✗ filter/FilterAdv.vue no longer carries the useFilter destructure this scaffolder rewrites — regenerate _template/entity-slice from the ai docs, or update FILTER_RESET_ANCHOR in scaffold.mjs.`
        )
        process.exit(1)
    }
    return text.replace(
        FILTER_RESET_ANCHOR,
        `const { handleReset: resetSearchObject, handleUpdate, filterIsActive } = useFilter({ searchObject, emit, Constructor: SearchObject })\n` +
            `// Clear the selector-backing entities too — resetting the ids alone leaves each control showing a label.\n` +
            `function handleReset() {\n    resetSearchObject()\n${relationBlocks.filterResets}\n}`
    )
}

// data/EntityService.ts ships a TODO marker for the owned-collection filter — its source is the entities
// template doc, where it has to read as a worked example. `--owns` knows the real lines, so write them here;
// with nothing owned the marker is dead weight in a file the user is told to leave alone, so drop it.
const OWNED_FILTER_TODO = /^[^\S\r\n]*\/\/ TODO \(owned collections only\):.*\r?\n/m
function applyOwnedCollections(relPath, text) {
    if (relPath.replace(/\\/g, "/") !== "data/EntityService.ts") return text
    const marker = text.match(OWNED_FILTER_TODO)
    if (!marker) {
        console.error(
            '✗ data/EntityService.ts no longer carries the "// TODO (owned collections only):" line this scaffolder rewrites — regenerate _template/entity-slice from the ai docs, or update the anchor in scaffold.mjs.'
        )
        process.exit(1)
    }
    const indent = marker[0].match(/^[^\S\r\n]*/)[0]
    // One filter line per owned collection, in the order the flags were given. No `|| []`: the back-end
    // contract is null = untouched, [] = delete every row, so coalescing an unloaded collection to [] tells
    // the server to delete all of its rows. `?.filter(...)` keeps undefined and still yields [] when the user
    // removed the last row.
    return text.replace(
        OWNED_FILTER_TODO,
        owns.map((o) => `${indent}item.${ownedField(o)} = item.${ownedField(o)}?.filter((x) => !x._deleted)\n`).join("")
    )
}

// --------------------------------------------------- attachments host wiring
// The four edits §Wire it into an owning entity prescribes. Hand-applied, step 2 is the one that gets missed,
// and its failure is silent: without the prepareItem filter a row the user marked for deletion is submitted
// unchanged, so the file comes back after a save with no error anywhere.
const ATTACHMENT_ANCHORS = {
    // the overrides go ABOVE this comment block, which documents prepareItem and has to stay against it
    prepareDoc: "    // Owned child collections use the `_deleted` mark (never splice): removed rows are filtered out here so",
    superPrepare: "        return super.prepareItem(item)",
}
function applyAttachments(relPath, text) {
    if (!attachmentsOwner) return text
    const path = relPath.replace(/\\/g, "/")
    const need = (anchor, file) => {
        if (text.includes(anchor)) return
        console.error(
            `✗ ${file} no longer carries "${anchor.trim()}" — regenerate _template/entity-slice from the ai docs, or update ATTACHMENT_ANCHORS in scaffold.mjs.`
        )
        process.exit(1)
    }
    switch (path) {
        case "data/Entity.ts":
            text = insertAfter(
                text,
                `import { EntityBase } from "@regira/modules/vue/entities"`,
                `import type { Entity as EntityAttachment } from "../../entity-attachments"`
            )
            return insertAfter(text, `title = ""`, `    attachments?: Array<EntityAttachment>`)
        case "data/EntityService.ts":
            need(ATTACHMENT_ANCHORS.prepareDoc, "data/EntityService.ts")
            need(ATTACHMENT_ANCHORS.superPrepare, "data/EntityService.ts")
            text = insertAfter(
                text,
                `import Entity from "./Entity"`,
                `import { insertWithAttachments, updateWithAttachments } from "../../entity-attachments/data/functions"`
            )
            // insert stages the pending files against the id the FIRST save returns, hence the update callback
            text = text.replace(
                ATTACHMENT_ANCHORS.prepareDoc,
                `    // Files are staged in memory until the owner has an id, so both write paths flush them. The helpers\n` +
                    `    // upload through useAxios(); adding getAttachments/addAttachment of your own instead means typing the\n` +
                    `    // constructor's axios as AxiosWithFilesInstance and resolving it as one in setup.ts.\n` +
                    `    override async insert(item: Entity): Promise<Entity | undefined> {\n` +
                    `        return await insertWithAttachments(this.config.api, item, () => super.insert(item), (saved) => super.update(saved))\n` +
                    `    }\n` +
                    `    override async update(item: Entity): Promise<Entity | undefined> {\n` +
                    `        return await updateWithAttachments(this.config.api, item, () => super.update(item))\n` +
                    `    }\n\n` +
                    ATTACHMENT_ANCHORS.prepareDoc
            )
            // deleted by omission — the same contract as an owned collection, and the same trap if it is missed
            return text.replace(
                ATTACHMENT_ANCHORS.superPrepare,
                `        item.attachments = item.attachments?.filter((x) => !x._deleted)\n` + ATTACHMENT_ANCHORS.superPrepare
            )
        default:
            return text
    }
}

const sliceExists = existsSync(destRoot)
// "Product exists; now it should own files" is an ordinary request, not an error — so --attachments joins
// --owns as a reason to proceed against an existing slice. Neither rewrites the (c) files: --owns adds a
// sub-slice, and --attachments hands back its edits at the end (see the sliceGenerated branch below).
if (sliceExists && !overwriteSlice && !owns.length && !attachmentsOwner) {
    console.error(
        `✗ ${destRoot} already exists — pass --owns <Child> to add an owned sub-slice to it, --attachments for the file-wiring steps, or --overwrite-slice to regenerate it (customized (c) files included; --force deliberately does NOT apply to slices).`
    )
    process.exit(1)
}
if (attachmentsOwner) scaffoldAttachments(attachmentsOwner)

// Replace the camelCase i18n-key placeholders before the kebab-case route placeholders (longest-match first).
const subst = (s) =>
    s
        .replace(/__Entity__/g, name)
        .replace(/__entitiesKey__/g, camelPlural)
        .replace(/__entityKey__/g, camelSingular)
        .replace(/__api__/g, api)
        .replace(/__entities__/g, plural)
        .replace(/__entity__/g, singular)
// the auth-coupled lines in Overview.vue / Details.vue: the useAuthStore import + store, the
// $onAction reload hook, and the "no-auth app: delete these two lines" marker comment
const authLine = /useAuthStore|authStore\.\$onAction|no-auth app:/
// Details.vue destructures `load` from useDetails only to feed that hook, so drop it too.
const dropLoad = (line) => (line.includes("useDetails(") ? line.replace(/\bload\s*,\s*/, "").replace(/,\s*load\b/, "") : line)
const stripAuth = (s) =>
    s
        .split("\n")
        .filter((line) => !authLine.test(line))
        .map(dropLoad)
        .join("\n")

function copyDir(from, to, rootFrom = from) {
    mkdirSync(to, { recursive: true })
    for (const entry of readdirSync(from, { withFileTypes: true })) {
        const src = join(from, entry.name)
        const dst = join(to, entry.name)
        if (entry.isDirectory()) copyDir(src, dst, rootFrom)
        else {
            let content = subst(readFileSync(src, "utf8"))
            if (noAuth) content = stripAuth(content)
            // attachments first: both it and --rel insert at the same `title = ""` anchor, and the LAST
            // writer ends up nearest it — this order puts the relation fields above the attachments field
            content = applyAttachments(relative(rootFrom, src), content)
            content = applyRelations(relative(rootFrom, src), content)
            content = applyOwnedCollections(relative(rootFrom, src), content)
            writeFileSync(dst, content)
        }
    }
}

// whether THIS run (re)generated the parent slice's own files — the owned-collection wiring hints below
// differ, since an existing slice keeps the EntityService it already has
const sliceGenerated = !sliceExists || overwriteSlice
if (sliceGenerated) {
    if (sliceExists) {
        console.log(`! ${destRoot} exists — --overwrite-slice: replacing it, customized (c) files included.`)
        // a clean replace, not an overlay — files from an older template generation must not linger
        rmSync(destRoot, { recursive: true, force: true })
    }
    copyDir(srcRoot, destRoot)
    console.log(`✓ Scaffolded ${name} → ${join(baseDir, plural)}${noAuth ? " (auth hooks stripped)" : ""}`)
    // The files you actually edit — everything else is vue-tsc-verified boilerplate you leave untouched.
    const customize = [
        "data/Entity.ts",
        "config/config.ts",
        "filter/SearchObject.ts",
        "filter/FilterAdv.vue",
        "overview/List.vue",
        "overview/ListItem.vue",
        "details/Form.vue",
        "selecting/SelectorList.vue",
    ]
    console.log(`  Customize these ${customize.length} (c) files (a lookup drops the overview trio List/ListItem/FilterAdv):`)
    for (const f of customize) console.log(`    · ${join(baseDir, plural, f)}`)
    console.log(`  Then register its plugin in ${join(baseDir, "index.ts")} (see the entities setup guide → Add entities).`)
    console.log(
        `  Confirm api "${api}" equals the server route — [Route("${api.slice(1)}")] on ${name}Controller. A mismatch 404s every call; re-run with --api <path> to change it.`
    )
    if (attachmentsOwner) {
        console.log(`  Files: the attachments field, the insert/update overrides and the prepareItem filter are written in.`)
        attachmentsTodo()
    }
    for (const r of relations) {
        console.log(
            `  Filter for ${r.name}: searchObject.${r.field}Id + a ${r.name}InputSelector in FilterAdv.vue, cleared by handleReset. Add the "${r.key}" translation key; the API filters on it via its SearchObject.`
        )
    }
    for (const r of relations) {
        const relDir = join(baseDir, r.folder)
        console.log(
            existsSync(resolve(process.cwd(), relDir))
                ? `  Relation column for ${r.name}: reads item.${r.field} — the API must eager-load it, unconditionally via e.Includes((q, _) => q.Include(x => x.${r.name})) for a to-one shown on every row; add the "${r.key}" translation key.`
                : `  ! Relation column for ${r.name} imports from ${relDir}, which does not exist yet — scaffold that slice or vue-tsc will fail.`
        )
    }
    if (relations.length) {
        console.log(
            `  baseQueryParams is left {} — a relation column blank at runtime means the API is not eager-loading it. Only add includes for a gated COLLECTION, and only member names of the API's NAMED [Flags] enum (an unnamed EntityIncludes accepts just Default/All, and a name it doesn't declare 400s: "The value '<Rel>' is not valid").`
        )
    }
} else {
    const adding = [owns.length ? "owned sub-slice(s)" : null, attachmentsOwner ? "the attachments wiring" : null].filter(Boolean).join(" + ")
    console.log(`· ${join(baseDir, plural)} exists — leaving the slice as-is, adding ${adding} only.`)
}

// ------------------------------------------------------------- owned sub-slices
// Each `--owns <Child>` scaffolds an editable owned-collection table under the parent slice.
// `--picker <Target>` switches to the join template: chips selecting <Target>, not an editable scalar table.
const ownedSrcRoot = resolve(here, "owned-slice")
const ownedJoinSrcRoot = resolve(here, "owned-slice-join")
for (const { child, field, picker } of owns) scaffoldOwned(child, field, picker)

// An existing slice keeps its own (c) files, so the three attachment edits cannot be written into it —
// they are handed back instead. Printed last, after any owned sub-slice has had its say.
if (attachmentsOwner && !sliceGenerated) {
    console.log(`· ${join(baseDir, plural)} already exists, so its files are yours — the attachments wiring below is by hand.`)
    attachmentsManualSteps()
}

function scaffoldOwned(childName, fieldName, pickerName) {
    if (!/^[A-Z]/.test(childName)) {
        console.error(`✗ --owns ${childName}: expected a PascalCase child name, e.g. --owns OrderLine`)
        return
    }
    const srcRoot = pickerName ? ownedJoinSrcRoot : ownedSrcRoot
    if (!existsSync(srcRoot)) {
        console.error(`✗ ${srcRoot} not found — regira is missing the ${pickerName ? "owned-slice-join" : "owned-slice"} template.`)
        return
    }
    // The picked slice is looked up the same way a --rel is: it may live under its own --plural.
    const targetFolder = pickerName ? (findSliceFolder(pickerName) ?? lowerFirst(kebab(pluralize(pickerName)))) : undefined
    const targetAlias = pickerName ? `@/${aliasRoot}/${targetFolder}` : undefined
    const childFolder = kebab(pluralize(childName)) // OrderLine → order-lines (folder / import path — kebab-case, like every other derived path)
    // The DTO field must match the back-end navigation's camelCase JSON key — that follows the C# property
    // name, not the child class name. Default: camelCase plural of the class; pass --as when they differ.
    const childField = fieldName ?? lowerFirst(pluralize(childName)) // OrderLine → orderLines
    const ChildrenPascal = childField.charAt(0).toUpperCase() + childField.slice(1) // the e.Related nav property (JSON key ⇔ PascalCase property)
    const childDest = resolve(destRoot, childFolder)
    if (existsSync(childDest)) {
        if (!overwriteSlice) {
            console.error(`✗ ${childDest} already exists — skipping owned ${childName} (pass --overwrite-slice to overwrite).`)
            return
        }
        rmSync(childDest, { recursive: true, force: true }) // clean replace, like the parent slice
    }
    // __children__ → the camelCase field (the JSON key), NOT the folder; __parent__ → camelCase parent singular
    // (so a `ShoppingList` child FK is `shoppingListId`, matching the server). Folder/import paths use childFolder.
    // __childrenSlug__ → the same field kebab-cased, for markup identifiers (CSS classes): every class name in
    // the templates is kebab-case, so a camelCase one (.shoppingListItems-editor) sticks out as a typo.
    // __Target__/__target__/__targetAlias__ are only present in the join template — the picked entity's class,
    // its camelCase navigation (whose FK is that + "Id") and the import path to its slice.
    const childSubst = (s) =>
        s
            .replace(/__Children__/g, ChildrenPascal)
            .replace(/__Child__/g, childName)
            .replace(/__childrenSlug__/g, kebab(childField))
            .replace(/__children__/g, childField)
            .replace(/__Parent__/g, name)
            .replace(/__parent__/g, camelSingular)
            .replace(/__targetAlias__/g, targetAlias ?? "")
            .replace(/__Target__/g, pickerName ?? "")
            .replace(/__target__/g, pickerName ? lowerFirst(pickerName) : "")
    // Printed BEFORE the folder exists: once it does, correcting the key needs --overwrite-slice, so a hint
    // that only appears in the wiring list below is a hint you can no longer act on cheaply.
    if (fieldName == null) {
        console.log(
            `! Owned ${childName}: defaulting its JSON key to "${childField}" — it must match the back-end navigation's camelCase key, which follows the C# property name, not the class name.`
        )
        console.log(
            `  If they differ, stop here and re-run with --owns ${childName} --as <fieldName> — correcting it later needs --overwrite-slice, which REPLACES the 8 (c) files you authored by then.`
        )
    }
    mkdirSync(childDest, { recursive: true })
    for (const entry of readdirSync(srcRoot, { withFileTypes: true })) {
        if (entry.isDirectory()) continue // both owned templates are flat
        writeFileSync(resolve(childDest, entry.name), childSubst(readFileSync(join(srcRoot, entry.name), "utf8")))
    }
    const p = (f) => join(baseDir, plural, f)
    const filterLine = `item.${childField} = item.${childField}?.filter((x) => !x._deleted)`
    console.log(`✓ Owned collection ${childName} → ${join(baseDir, plural, childFolder)} (${pickerName ? `${pickerName} chips` : "editable table"})`)
    if (pickerName && !findSliceFolder(pickerName)) {
        console.log(
            `  ! The chips import from ${join(baseDir, targetFolder)}, which does not exist yet — scaffold the ${pickerName} slice or vue-tsc will fail.`
        )
    }
    console.log(`  Wire it into the ${name} slice (the editor is generated; these ${sliceGenerated ? "two" : "three"} lines connect it):`)
    console.log(
        `    1. ${p("data/Entity.ts")}         field   ${childField}?: Array<${childName}>   // import type { Entity as ${childName} } from "../${childFolder}"`
    )
    console.log(
        `    2. ${p("details/Form.vue")}       render  <${childName}Overview v-model="item.${childField}" />   // import { ${childName}Overview } from "../${childFolder}"`
    )
    console.log(
        sliceGenerated
            ? `    ✓ ${p("data/EntityService.ts")}  prepareItem   ${filterLine}   // already written by this run — it type-checks as soon as step 1 declares the field`
            : `    3. ${p("data/EntityService.ts")}  prepareItem   ${filterLine}   // add it yourself: the existing service was left untouched`
    )
    console.log(`    back-end: e.Related(x => x.${ChildrenPascal}) on ${name} (owned child — no For<>()/controller/budget slot).`)
    if (pickerName) {
        console.log(
            `    back-end: eager-load the nested ${pickerName} too — .Include(x => x.${ChildrenPascal}).ThenInclude(r => r.${pickerName}) — or every chip renders blank.`
        )
    }
}

// -------------------------------------------------------------- app-shell impl
function scaffoldShell() {
    const shellRoot = resolve(here, "app-shell")
    if (!existsSync(shellRoot)) {
        console.error(`✗ ${shellRoot} not found — regira is missing the generated app-shell template.`)
        process.exit(1)
    }
    // auth-only files: omitted entirely on --no-auth
    const AUTH_ONLY = new Set([
        "src/infrastructure/user-plugin.ts",
        "src/shims.d.ts",
        "src/views/AccountView.vue",
        "src/views/ResetPasswordView.vue",
        "src/components/users/ForgotPasswordForm.vue",
    ])
    // ...and the one file whose auth-only bits are DATA, out of reach of applyShellVariant's comment markers
    const AUTH_CONFIG_FILE = "public/config.json"
    const written = []
    const skipped = []

    const walk = (dir) => {
        for (const entry of readdirSync(dir, { withFileTypes: true })) {
            const abs = join(dir, entry.name)
            if (entry.isDirectory()) {
                walk(abs)
                continue
            }
            const rel = relative(shellRoot, abs).replace(/\\/g, "/")
            if (noAuth && AUTH_ONLY.has(rel)) continue
            const dest = resolve(process.cwd(), rel)
            if (existsSync(dest) && !force) {
                skipped.push(rel)
                continue
            }
            mkdirSync(dirname(dest), { recursive: true })
            let content = applyShellVariant(readFileSync(abs, "utf8"), noAuth)
            if (noAuth && rel === AUTH_CONFIG_FILE) content = stripAuthConfigKeys(content, rel)
            writeFileSync(dest, content)
            written.push(rel)
        }
    }
    walk(shellRoot)

    console.log(`✓ Scaffolded the app shell — ${written.length} file(s)${noAuth ? " (no-auth)" : ""}`)
    if (skipped.length) {
        console.log(`  Skipped ${skipped.length} existing file(s); pass --force to overwrite:`)
        for (const f of skipped) console.log(`    · ${f}`)
    }
    console.log("  Next: ensure package.json has the known-good dependency set (entities.setup.md → Install),")
    console.log("  then scaffold entities and register them in src/entities/index.ts.")
    console.log("  The layout/navigation components are default implementations, not a prescribed design — restyle them,")
    console.log("  or replace any of them with your own as long as the functionality stays available")
    console.log("  (entities.shell.template.md → Default implementations, not requirements).")
}

// ---------------------------------------------------- attachments slice impl
// What the generator cannot decide for you: where the tab goes, the translations, and the back-end.
function attachmentsTodo() {
    console.log(`  Still yours to place: the form tab.`)
    console.log(
        `    details/Form.vue   <template #files><EntityAttachments v-model="item.attachments" :readonly="readonly" /></template>   // import { Overview as EntityAttachments } from "../../entity-attachments"`
    )
    console.log(
        `    ⚠️ It renders its OWN <FormSection> — put it in a tab or beside the form's section, never inside one, or you get a titled panel within a titled panel.`
    )
    console.log(
        `    public/data/translations.json  the shell ships "files" and "addNewFile(s)" (literal key, parentheses included) in English — add the other languages from config.json → langs`
    )
    console.log(`    back-end: register the owner's files (WithAttachments + HasAttachments<>).`)
    console.log(
        `    Adding getAttachments/addAttachment of your own? Those call this.axios.upload/getFile, so type the ctor as AxiosWithFilesInstance and resolve it as one in setup.ts.`
    )
}

// The three edits the generator makes when it owns the slice's files — printed when it cannot: no entity
// named, or a slice that already exists and whose (c) files are the user's.
function attachmentsManualSteps() {
    console.log(`  Wire it into each entity that owns files (3 edits + the tab):`)
    console.log(
        `    1. data/Entity.ts         field    attachments?: Array<EntityAttachment>   // import type { Entity as EntityAttachment } from "../../entity-attachments"`
    )
    console.log(
        `    2. data/EntityService.ts  override insert/update via insertWithAttachments/updateWithAttachments; ⚠️ prepareItem must drop _deleted rows — without it a file the user removed is submitted unchanged and comes back after the save, with no error`
    )
    console.log(`    3. setup.ts               nothing to change — the helpers upload through useAxios(), so the default axios registration stands`)
    console.log(`  A NEW slice gets edits 1 and 2 written for it: scaffold.mjs <Entity> --attachments`)
    attachmentsTodo()
}

function scaffoldAttachments(owner) {
    const attRoot = resolve(here, "entity-attachments")
    if (!existsSync(attRoot)) {
        console.error(`✗ ${attRoot} not found — regira is missing the entity-attachments template.`)
        process.exit(1)
    }
    const baseDir = opt("--dir", "src/entities")
    const dest = resolve(process.cwd(), baseDir, "entity-attachments")
    if (existsSync(dest) && !force) {
        // The shared slice is one per app, so the second owner finds it already there — that is the normal
        // path, not an error. Without an owner to wire, an existing slice means the command had nothing to do.
        if (owner) {
            console.log(`· ${join(baseDir, "entity-attachments")} already exists — reusing it for ${owner}.`)
            return
        }
        console.error(`✗ ${dest} already exists — pass --force to overwrite, or wire the existing slice.`)
        process.exit(1)
    }
    // shared slice: no per-entity tokens, no auth variants — a plain verbatim copy
    const copyPlain = (from, to) => {
        mkdirSync(to, { recursive: true })
        for (const entry of readdirSync(from, { withFileTypes: true })) {
            const s = join(from, entry.name)
            const d = join(to, entry.name)
            if (entry.isDirectory()) copyPlain(s, d)
            else writeFileSync(d, readFileSync(s, "utf8"))
        }
    }
    copyPlain(attRoot, dest)
    console.log(`✓ Scaffolded the attachments slice → ${join(baseDir, "entity-attachments")}`)
}

// public/config.json is DATA, not code: applyShellVariant is comment-marker driven and JSON has no comment
// syntax, so there is nowhere to hang a @auth:only marker and the auth-only keys would ride along into an app
// that deliberately has no auth. Nothing reads them there (main.ts touches them inside the @auth block this
// run deletes), but shipping them is confusing output. Dropped by key below.
//
// Edited as TEXT, not re-stringified: the config is hand-formatted (inline api/navigation objects inside a
// 4-space file) and JSON.stringify would reflow all of it. The edit is then re-parsed and compared against the
// object it should have produced, so anything the text surgery got wrong fails loudly instead of shipping.
function stripAuthConfigKeys(json, file) {
    const AUTH_CONFIG_KEYS = ["clientApp", "loginUrl"]
    let parsed
    try {
        parsed = JSON.parse(json)
    } catch (err) {
        console.error(`✗ ${file} is not valid JSON (${err.message}) — cannot strip its auth-only keys.`)
        process.exit(1)
    }
    const present = AUTH_CONFIG_KEYS.filter((key) => key in parsed)
    if (!present.length) return json
    const expected = { ...parsed }
    for (const key of present) delete expected[key]
    const stripped = json.replace(new RegExp(`^[^\\S\\r\\n]*"(?:${present.join("|")})"\\s*:.*\\r?\\n`, "gm"), "").replace(/,(\s*[}\]])/g, "$1") // dropping what happened to be the LAST key leaves a dangling comma
    let after
    try {
        after = JSON.parse(stripped)
    } catch (err) {
        console.error(`✗ dropping ${present.join(" + ")} left ${file} unparseable (${err.message}) — fix the strip in scaffold.mjs.`)
        process.exit(1)
    }
    if (JSON.stringify(after) !== JSON.stringify(expected)) {
        console.error(`✗ dropping ${present.join(" + ")} from ${file} changed more than those keys — fix the strip in scaffold.mjs.`)
        process.exit(1)
    }
    return stripped
}

// Resolve the auth/no-auth variant: keep one tag's marked lines/blocks, drop the other's.
// Markers (comment-syntax agnostic): `@auth:only` / `@noauth:only` (single line),
// `@auth:block-start`…`@auth:block-end` (and the `@noauth:` pair) for multi-line blocks.
function applyShellVariant(content, noAuthVariant) {
    const keep = noAuthVariant ? "noauth" : "auth"
    const drop = noAuthVariant ? "auth" : "noauth"
    const out = []
    let dropping = false
    for (const line of content.split("\n")) {
        if (dropping) {
            if (line.includes(`@${drop}:block-end`)) dropping = false
            continue
        }
        if (line.includes(`@${drop}:block-start`)) {
            dropping = true
            continue
        }
        if (line.includes(`@${drop}:only`)) continue
        if (line.includes(`@${keep}:block-start`) || line.includes(`@${keep}:block-end`)) continue // drop the marker fence, keep its body
        out.push(line.replace(/\s*(?:\/\/|<!--)\s*@(?:no)?auth:only\b.*$/, "")) // strip the kept line's trailing marker comment
    }
    return out.join("\n")
}

// --------------------------------------------------------------------- --help
// The complete flag reference — descriptions kept in sync with the authored header comment above (the short
// usage line printed when <Entity> is missing lists only the modes). Informational: prints and exits, never
// scaffolds. Grouped by command so each flag sits with the path it applies to.
function printUsage() {
    console.log(`Scaffold a Regira app — one entity slice, the one-time app shell, or an ejected UI skin.

Usage:
  scaffold.mjs <Entity> [options]     scaffold an entity slice
  scaffold.mjs --shell [--no-auth]    scaffold the app shell (once per app)
  scaffold.mjs --ui <Component>       eject a UI-kit reference skin  (--ui list to list them)
  scaffold.mjs <Entity> --attachments scaffold a slice whose entity owns files (wires the shared slice into it)
  scaffold.mjs --attachments          scaffold the shared file/attachments slice only

Entity slice:
  <Entity>            PascalCase class name, e.g. Product
  --plural <name>     slice folder + client route prefix (default: kebab-cased plural — Category → categories)
  --singular <name>   singular i18n key (default: kebab-cased Entity)
  --api <path>        API resource path relative to the axios baseURL (default: /<plural>). Must equal the
                      server's [Route(...)] exactly; leading slash optional (omit it under Git Bash)
  --rel <Entity>      overview column for a to-one relation (the related entity's FormModalButton + a label
                      resolved through its pool). Repeatable; the related slice must already be scaffolded.
                      A differently-named FK takes a trailing --as <field> (--rel Employee --as assignedToEmployee)
  --dir <path>        target base folder (slice default: src/entities; ejected skin default: src/components/ui)

Owned collections (a back-end e.Related(...) child):
  --owns <Child>      also scaffold an editable owned-collection sub-slice. Repeatable, PascalCase, e.g.
                      --owns OrderLine. Works on an existing slice too (only the sub-slice is generated then)
  --as <fieldName>    JSON key for the --owns OR --rel directly before it — must match the back-end navigation's
                      camelCase key. After --owns: the collection field (default camelCase plural, OrderLine →
                      orderLines). After --rel: the to-one nav property (default camelCase class, Employee → employee)
  --picker <Entity>   the --owns before it is a PURE JOIN onto <Entity> (only the two FKs, no scalar fields of
                      its own): emit chips selecting <Entity> instead of an editable table. Chains after --as.
                      The picked slice must already be scaffolded. A join row that also carries a scalar
                      (a quantity, a status) is not pure — leave --picker off and edit it as a table

Modes & shared flags:
  --shell             scaffold the app shell (toolchain, main.ts, App.vue, config, router, dashboard, layout, views)
  --ui <Component>    copy a UI-kit component's reference skin for free restyling (--ui list lists them)
  --attachments       this entity owns files — scaffold the shared slice (once per app) and wire it in;
                      alone, it scaffolds the shared slice and stops
  --no-auth           strip the auth wiring (slice: reload hooks; shell: auth plugins/UI, the auth-only files + config.json keys)
  --force             overwrite files that already exist (--shell / --ui / --attachments only — never a slice)
  --overwrite-slice   overwrite an existing entity slice or owned sub-slice, customized (c) files included
  -h, --help          show this reference and exit

Examples:
  scaffold.mjs Category --plural categories
  scaffold.mjs PartyRelationshipType --api relationship-types
  scaffold.mjs Intervention --rel Vehicle --rel Supplier
  scaffold.mjs Task --rel Employee --as assignedToEmployee
  scaffold.mjs Order --owns OrderLine --as lines
  scaffold.mjs Article --owns ArticleCategory --as categories --picker Category
  scaffold.mjs --shell --no-auth
  scaffold.mjs --ui DefaultModal`)
}
