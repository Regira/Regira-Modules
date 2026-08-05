// Generates _template/entity-slice/** from the AI doc source of truth, so the shipped
// copy-on-disk scaffold can never drift from the worked examples.
//
//   node scripts/build-entity-template.mjs
//
// Sources:
//   - src/vue/entities/ai/entities.template.md  → the `(c)` skeletons + short boilerplate (placeholder `Foo`)
//   - src/vue/entities/ai/entities.examples.md  → the longer boilerplate (UnitType slice, Part 1)
//
// Transforms applied to every file:
//   - `@/regira/…`  →  `@regira/modules/…`   (safety net: the docs use the published npm
//     specifier, so this normally matches nothing — it only catches a stray vendoring alias)
// Plus, for the two entity-named files only, the placeholder tokens used by _template/scaffold.mjs:
//   - Foo → __Entity__   foos → __entities__   foo → __entity__

import { readFileSync, writeFileSync, mkdirSync, rmSync } from "fs"
import { resolve, dirname } from "path"
import { fileURLToPath } from "url"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const aiDir = resolve(root, "src/vue/entities/ai")
const outDir = resolve(root, "_template/entity-slice")

/** Map every `## … `path`` heading to the first fenced code block that follows it. */
function extractBlocks(markdown) {
    const lines = markdown.split(/\r?\n/)
    const blocks = {}
    for (let i = 0; i < lines.length; i++) {
        const m = lines[i].match(/^#{2,}\s.*`([^`]+\.(?:ts|vue|json|html|scss))`/)
        if (!m) continue
        const path = m[1]
        // find the opening fence, then capture until the closing fence
        let j = i + 1
        while (j < lines.length && !/^```/.test(lines[j]) && !/^#{2,}\s/.test(lines[j])) j++
        if (j >= lines.length || !/^```/.test(lines[j])) continue
        const body = []
        for (j++; j < lines.length && !/^```/.test(lines[j]); j++) body.push(lines[j])
        if (!(path in blocks)) blocks[path] = body.join("\n") + "\n"
    }
    return blocks
}

const tpl = extractBlocks(readFileSync(resolve(aiDir, "entities.template.md"), "utf8"))
// Only Part 1 (the simple UnitType slice) of the examples file.
const examplesPart1 = readFileSync(resolve(aiDir, "entities.examples.md"), "utf8").split(/^# Part 2/m)[0]
const ex = extractBlocks(examplesPart1)

const unalias = (s) => s.replace(/@\/regira\//g, "@regira/modules/")
const tokenize = (s) =>
    s
        .replace(/\bFoo\b/g, "__Entity__")
        .replace(/\bfoos\b/g, "__entities__")
        .replace(/\bfoo\b/g, "__entity__")

// config.ts i18n keys are camelCase (`__entitiesKey__` / `__entityKey__`, which scaffold.mjs fills from the
// PascalCase name), distinct from the lowercase route/api placeholders. The doc's single-word `Foo` example
// can't show that, so rewrite the three i18n property values after the generic tokenize — keyed on the stable
// property names so it stays robust. See _template/scaffold.mjs.
// The api path additionally gets its own token: it defaults to the route/folder name but is separable from
// it (`scaffold.mjs --api /relationship-types`), which the doc's single placeholder can't express.
const tokenizeConfigKeys = (s) =>
    s
        .replace(/(\bconst api = ")\/__entities__(")/, "$1__api__$2")
        .replace(/(\boverviewTitle:\s*")__entities__(")/, "$1__entitiesKey__$2")
        .replace(/(\bdetailsTitle:\s*")__entity__(")/, "$1__entityKey__$2")
        .replace(/(\bdescription:\s*")__entity__(\.description")/, "$1__entityKey__$2")

// target path → [source map, tokenize?]
const FROM_TPL = false // readability flags below
const plan = [
    // entity-named skeletons (placeholder Foo → tokens)
    ["data/Entity.ts", tpl, true],
    ["config/config.ts", tpl, true],
    // (c) skeletons + short boilerplate — clean fill-in-the-blanks versions
    ["filter/SearchObject.ts", tpl, FROM_TPL],
    ["filter/FilterAdv.vue", tpl, FROM_TPL],
    ["overview/List.vue", tpl, FROM_TPL],
    ["overview/ListItem.vue", tpl, FROM_TPL],
    ["details/Form.vue", tpl, FROM_TPL],
    ["selecting/SelectorList.vue", tpl, FROM_TPL],
    ["data/EntityService.ts", tpl, FROM_TPL],
    ["data/store.ts", tpl, FROM_TPL],
    ["index.ts", tpl, FROM_TPL],
    ["setup.ts", tpl, FROM_TPL],
    // longer boilerplate (full-package, incl. auth hooks) — from the worked slice
    ["filter/Filter.vue", ex, FROM_TPL],
    ["filter/FilterInline.vue", ex, FROM_TPL],
    ["overview/Overview.vue", ex, FROM_TPL],
    ["details/Details.vue", ex, FROM_TPL],
    ["details/FormModalButton.vue", ex, FROM_TPL],
    ["selecting/Autocomplete.vue", ex, FROM_TPL],
    ["selecting/InputSelector.vue", ex, FROM_TPL],
    ["selecting/Selector.vue", ex, FROM_TPL],
    ["selecting/SelectorDropdown.vue", ex, FROM_TPL],
    ["selecting/SelectorModalButton.vue", ex, FROM_TPL],
    ["selecting/SelectorSearch.vue", ex, FROM_TPL],
]

rmSync(outDir, { recursive: true, force: true })
let written = 0
const missing = []
for (const [target, src, doToken] of plan) {
    const raw = src[target]
    if (raw == null) {
        missing.push(target)
        continue
    }
    let content = unalias(raw)
    if (doToken) content = tokenize(content)
    if (target === "config/config.ts") content = tokenizeConfigKeys(content)
    const dest = resolve(outDir, target)
    mkdirSync(dirname(dest), { recursive: true })
    writeFileSync(dest, content)
    written++
}

if (missing.length) {
    console.error(`✗ Missing code blocks in the docs for: ${missing.join(", ")}`)
    process.exit(1)
}
console.log(`✓ Wrote ${written} files to _template/entity-slice/`)

// ---- App shell (entities.shell.template.md → _template/app-shell/**, one `## `path`` heading per file) ----
const shellOutDir = resolve(root, "_template/app-shell")
const shellBlocks = extractBlocks(readFileSync(resolve(aiDir, "entities.shell.template.md"), "utf8"))
rmSync(shellOutDir, { recursive: true, force: true })
let shellWritten = 0
for (const [path, body] of Object.entries(shellBlocks)) {
    const dest = resolve(shellOutDir, path)
    mkdirSync(dirname(dest), { recursive: true })
    writeFileSync(dest, unalias(body)) // no tokenizing — the shell is not per-entity
    shellWritten++
}
if (!shellWritten) {
    console.error("✗ No app-shell blocks found in entities.shell.template.md")
    process.exit(1)
}
console.log(`✓ Wrote ${shellWritten} files to _template/app-shell/`)

// ---- Attachments slice (entities.attachments.template.md → _template/entity-attachments/**) ----
// A shared slice: no per-entity tokens (copied verbatim by scaffold.mjs --attachments).
const attOutDir = resolve(root, "_template/entity-attachments")
const attBlocks = extractBlocks(readFileSync(resolve(aiDir, "entities.attachments.template.md"), "utf8"))
rmSync(attOutDir, { recursive: true, force: true })
let attWritten = 0
for (const [path, body] of Object.entries(attBlocks)) {
    const dest = resolve(attOutDir, path)
    mkdirSync(dirname(dest), { recursive: true })
    writeFileSync(dest, unalias(body))
    attWritten++
}
if (!attWritten) {
    console.error("✗ No attachments blocks found in entities.attachments.template.md")
    process.exit(1)
}
console.log(`✓ Wrote ${attWritten} files to _template/entity-attachments/`)
