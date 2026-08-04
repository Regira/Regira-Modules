#!/usr/bin/env node
// Generates _template/ui/** — ejectable copies of the UI-kit reference skins — from the REAL
// component source in src/ (unlike entity-slice/app-shell, which are generated from the ai docs).
//
// Each ejected file gets its relative imports rewritten to public `regira/...` specifiers,
// so the copy stays wired to library behavior (composables, contract types) across upgrades.
// A relative import without a public mapping FAILS the build: an ejectable skin may only depend
// on public API — this doubles as architecture enforcement for the headless split.
//
//   node scripts/build-ui-template.mjs        (also runs as part of `npm run build`)

import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from "fs"
import { resolve, dirname, join, posix } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, "..")
const srcRoot = resolve(root, "src")
const outRoot = resolve(root, "_template", "ui")

// ------------------------------------------------------------------ manifest
// name  → scaffold.mjs --ui <name>
// dir   → source folder (relative to src/)
// files → copied verbatim-with-rewrites; imports between files of the same set stay relative.
//         An entry may be { from, to } to eject under a clearer name (e.g. Display.vue → Debug.vue)
// styles→ co-located scss copied along (side-effect import rewritten to the new file name)
// note  → wiring hint printed by scaffold.mjs after ejecting
const MANIFEST = [
    {
        name: "DefaultModal",
        dir: "vue/ui/modal",
        files: ["DefaultModal.vue"],
        styles: { "style.scss": "DefaultModal.scss" },
        note: 'register your copy app-wide: app.use(modalPlugin, { Modal }) — it swaps every modal, including the ones inside library components',
    },
    {
        name: "Paging",
        dir: "vue/ui/paging",
        files: ["Paging.vue", "PagingButton.vue", "PagingAnchor.vue"],
        note: "import your copy instead of regira/vue/ui Paging (behavior stays in the exported usePaging)",
    },
    {
        name: "Autocomplete",
        dir: "vue/ui/autocomplete",
        files: ["Autocomplete.vue"],
        styles: { "style.scss": "Autocomplete.scss" },
        note: "import your copy instead of the library Autocomplete; requires the v-click-outside directive (directives plugin, part of the shell)",
    },
    {
        name: "Feedback",
        dir: "vue/ui/feedback",
        files: ["Feedback.vue"],
        note: "import your copy instead of the library Feedback (status/message state stays in useFeedback)",
    },
    {
        name: "ConfirmButton",
        dir: "vue/ui/buttons",
        files: ["ConfirmButton.vue"],
        note: "import your copy instead of the library ConfirmButton",
    },
    {
        name: "FormButtonsRow",
        dir: "vue/ui/input",
        files: ["FormButtonsRow.vue"],
        note: "import your copy instead of the library FormButtonsRow",
    },
    {
        name: "FileDropZone",
        dir: "vue/ui/input",
        files: ["FileDropZone.vue"],
        note: "import your copy instead of the library FileDropZone",
    },
    {
        name: "Tabs",
        dir: "vue/ui/tabs",
        files: ["TabContainer.vue", "TabNavigation.vue"],
        note: "import your TabContainer copy instead of the library one (hash-route nav ships in its props: use-route-nav)",
    },
    {
        name: "LoginForm",
        dir: "vue/auth",
        files: ["LoginForm.vue"],
        note: "slot your copy into LoginModal's default slot (behavior stays in useLoginForm)",
    },
    {
        name: "ChangePasswordForm",
        dir: "vue/auth",
        files: ["ChangePasswordForm.vue"],
        note: "import your copy instead of the library ChangePasswordForm (behavior stays in useChangePasswordForm)",
    },
    {
        name: "ResetPasswordForm",
        dir: "vue/auth",
        files: ["ResetPasswordForm.vue"],
        note: "import your copy instead of the library ResetPasswordForm (behavior stays in useResetPasswordForm)",
    },
    {
        name: "InputSelectorInline",
        dir: "vue/entities/form",
        files: ["InputSelectorInline.vue"],
        note: "import your copy instead of regira/vue/entities InputSelectorInline",
    },
    {
        name: "Anchor",
        dir: "vue/ui/input",
        files: ["Anchor.vue"],
        note: "import your copy instead of the library Anchor",
    },
    {
        name: "DateInput",
        dir: "vue/ui/input",
        files: ["DateInput.vue"],
        note: "import your copy instead of the library DateInput",
    },
    {
        name: "DescriptionInput",
        dir: "vue/ui/input",
        files: ["DescriptionInput.vue"],
        note: "import your copy instead of the library DescriptionInput",
    },
    {
        name: "FormLabel",
        dir: "vue/ui/input",
        files: ["FormLabel.vue"],
        note: "import your copy instead of the library FormLabel",
    },
    {
        name: "FormSection",
        dir: "vue/ui/input",
        files: ["FormSection.vue"],
        note: "import your copy instead of the library FormSection",
    },
    {
        name: "NullableCheckBox",
        dir: "vue/ui/input",
        files: ["NullableCheckBox.vue"],
        note: "import your copy instead of the library NullableCheckBox",
    },
    {
        name: "NullableLabel",
        dir: "vue/ui/input",
        files: ["NullableLabel.vue"],
        note: "import your copy instead of the library NullableLabel",
    },
    {
        name: "ResultSummary",
        dir: "vue/ui/paging",
        files: ["ResultSummary.vue"],
        note: "import your copy instead of the library ResultSummary",
    },
    {
        name: "Icon",
        dir: "vue/ui/icons",
        files: ["Icon.vue"],
        note: "import your copy instead of the library Icon, and pass it to iconPlugin { Icon } for the global registration; glyph sets keep coming from the plugin's icons/source config. Library-internal call sites keep the library Icon",
    },
    {
        name: "IconButton",
        dir: "vue/ui/icons",
        files: ["IconButton.vue"],
        note: "import your copy instead of the library IconButton (or pass iconPlugin { IconButton } for the global registration)",
    },
    {
        name: "Loading",
        dir: "vue/ui/loading",
        files: ["Loading.vue", "LoadingContainer.vue", "LoadingButton.vue"],
        note: "register your Loading app-wide: app.use(loadingPlugin, { img, Loading }) — LoadingContainer/LoadingButton (library and ejected alike) resolve it via injectLoading()",
    },
    {
        name: "Debug",
        dir: "vue/debug",
        files: [{ from: "Display.vue", to: "Debug.vue" }],
        note: "import your copy instead of the library Debug (or pass debugPlugin { Debug } for the global registration); visibility stays on $isDebug from debugPlugin",
    },
    {
        name: "LangSelector",
        dir: "vue/lang",
        files: ["LangSelector.vue"],
        note: "import your copy instead of the library LangSelector (behavior stays in useLang)",
    },
    {
        name: "DetailsSummary",
        dir: "vue/entities/details",
        files: ["DetailsSummary.vue"],
        note: "import your copy instead of regira/vue/entities DetailsSummary (e.g. in the EntityDescriptor fiche/details route)",
    },
    {
        name: "GMapButton",
        dir: "vue/ui/gis/gmaps",
        files: [{ from: "ModalButton.vue", to: "GMapButton.vue" }],
        note: "import your copy instead of the library GMapButton (the map modal resolves via injectModal, so it follows your modalPlugin swap)",
    },
    {
        name: "LoginModal",
        dir: "vue/auth",
        files: ["LoginModal.vue"],
        note: "import your copy instead of the library LoginModal (behavior stays in useLoginForm; the modal resolves via injectModal)",
    },
    {
        name: "ForgotPasswordModal",
        dir: "vue/auth",
        files: ["ForgotPasswordModal.vue"],
        note: "import your copy instead of the library ForgotPasswordModal (behavior stays in useForgotPasswordForm; the modal resolves via injectModal)",
    },
]

// -------------------------------------------------- public-specifier mappings
// key: import path resolved relative to src/ (posix, no extension normalization)
// spec: the public subpath; named: the barrel export replacing a .vue default import;
// defaultAs: the barrel export replacing a ts module's default import
const MODULE_MAP = {
    "vue/ui/icons/Icon.vue": { spec: "regira/vue/ui", named: "Icon" },
    "vue/ui/icons/IconButton.vue": { spec: "regira/vue/ui", named: "IconButton" },
    "vue/ui/icons/BsIcon.vue": { spec: "regira/vue/ui", named: "BsIcon" },
    "vue/ui/icons/FaIcon.vue": { spec: "regira/vue/ui", named: "FaIcon" },
    "vue/ui/buttons/ConfirmButton.vue": { spec: "regira/vue/ui", named: "ConfirmButton" },
    "vue/ui/feedback/Pending.vue": { spec: "regira/vue/ui", named: "Pending" },
    "vue/ui/feedback/Success.vue": { spec: "regira/vue/ui", named: "Success" },
    "vue/ui/feedback/ErrorSummary.vue": { spec: "regira/vue/ui", named: "ErrorSummary" },
    "vue/ui/modal": { spec: "regira/vue/ui" },
    "vue/ui/modal/modal": { spec: "regira/vue/ui" },
    "vue/ui/paging/paging": { spec: "regira/vue/ui", defaultAs: "usePaging" },
    "vue/ui/autocomplete/autocomplete": { spec: "regira/vue/ui" },
    "vue/ui/feedback": { spec: "regira/vue/ui" },
    "vue/ui/feedback/feedback": { spec: "regira/vue/ui" },
    "vue/ui/tabs/tabs": { spec: "regira/vue/ui" },
    "vue/ui/tabs/Tab": { spec: "regira/vue/ui" },
    "vue/ui/buttons/confirm": { spec: "regira/vue/ui" },
    "vue/ui/input/formButtonsRow": { spec: "regira/vue/ui" },
    "vue/ui/input/fileDropZone": { spec: "regira/vue/ui" },
    "vue/vue-helper": { spec: "regira/vue/vue-helper" },
    "vue/entities/abstractions/PagingInfo": { spec: "regira/vue/entities" },
    "vue/entities/form/inputSelectorInline": { spec: "regira/vue/entities" },
    "vue/auth/useLoginForm": { spec: "regira/vue/auth" },
    "vue/auth/useChangePasswordForm": { spec: "regira/vue/auth" },
    "vue/auth/useResetPasswordForm": { spec: "regira/vue/auth" },
    "vue/auth/useForgotPasswordForm": { spec: "regira/vue/auth" },
    "vue/auth/LoginForm.vue": { spec: "regira/vue/auth", named: "LoginForm" },
    "vue/ui/input/inputs": { spec: "regira/vue/ui" },
    "vue/ui/input/FormLabel.vue": { spec: "regira/vue/ui", named: "FormLabel" },
    "vue/ui/icons/icons": { spec: "regira/vue/ui" },
    "vue/ui/loading/loading": { spec: "regira/vue/ui" },
    "vue/ui/gis/gmaps/GMap.vue": { spec: "regira/vue/ui", named: "GMap" },
    "vue/ui/gis/gmaps/gmaps": { spec: "regira/vue/ui" },
    "vue/debug/debug": { spec: "regira/vue/debug" },
    "vue/lang/useLang": { spec: "regira/vue/lang" },
    "vue/lang/langSelector": { spec: "regira/vue/lang" },
    "vue/entities/details/detailsSummary": { spec: "regira/vue/entities" },
    "vue/formatters": { spec: "regira/vue/formatters" },
    "utilities/string-utility": { spec: "regira/utilities" },
}

// -------------------------------------------------- public-export resolution
// The transitive named-export set of each public barrel a mapping targets, so a MODULE_MAP that
// points a symbol at a spec whose barrel doesn't actually export it FAILS the build — not just a
// missing MODULE_MAP key. This is what makes the "may only depend on public API" promise real.
function resolveModuleFile(absNoExt) {
    for (const cand of [`${absNoExt}.ts`, `${absNoExt}.tsx`, join(absNoExt, "index.ts")]) {
        if (existsSync(cand)) return cand
    }
    return null
}
function collectExports(absFile, seen = new Set()) {
    if (!absFile || seen.has(absFile)) return new Set()
    seen.add(absFile)
    const names = new Set()
    let content
    try {
        content = readFileSync(absFile, "utf8")
    } catch {
        return names
    }
    const dir = dirname(absFile)
    // export [type] * from "./x"  → union the target barrel's exports
    for (const m of content.matchAll(/export\s+(?:type\s+)?\*\s+from\s*["']([^"']+)["']/g)) {
        for (const n of collectExports(resolveModuleFile(resolve(dir, m[1])), seen)) names.add(n)
    }
    // export [type] { a, b as c, default as D } [from "..."]  → the exported (right-of-`as`) names
    for (const m of content.matchAll(/export\s+(?:type\s+)?\{([^}]*)\}/g)) {
        for (let part of m[1].split(",")) {
            part = part.trim().replace(/^type\s+/, "")
            if (!part) continue
            const seg = part.split(/\s+as\s+/)
            const name = (seg[1] ?? seg[0]).trim()
            if (name) names.add(name)
        }
    }
    // export [declare] [abstract] const|let|var|function|class|enum|interface|type X
    for (const m of content.matchAll(/export\s+(?:declare\s+)?(?:abstract\s+)?(?:const|let|var|function|class|enum|interface|type)\s+([\w$]+)/g)) {
        names.add(m[1])
    }
    if (/export\s+default\b/.test(content)) names.add("default")
    return names
}
// spec (e.g. regira/vue/ui) → its barrel's transitive export set
const PUBLIC_EXPORTS = {}
for (const { spec } of Object.values(MODULE_MAP)) {
    if (spec in PUBLIC_EXPORTS) continue
    const barrel = resolveModuleFile(resolve(srcRoot, spec.replace(/^regira\//, "")))
    PUBLIC_EXPORTS[spec] = collectExports(barrel)
}

// side-effect imports:  import "./style.scss"
const SIDE_EFFECT_RE = /import\s*(["'])([^"']+)\1/g
// clause imports:  import [type] <default>[, { ... }] | { ... } from "..."   (braces may span lines)
const CLAUSE_RE = /import\s+(type\s+)?([\w$]+\s*,\s*\{[\s\S]*?\}|\{[\s\S]*?\}|[\w$]+)\s*from\s*(["'])([^"']+)\3/g

function rewriteImports(content, set, srcFile) {
    const fileDir = posix.dirname(srcFile) // e.g. "vue/ui/paging"
    const setFiles = new Set(set.files.map((f) => (typeof f === "string" ? f : f.from)))
    const styles = set.styles || {}
    const errors = []

    const resolveSpec = (spec) => posix.normalize(posix.join(fileDir, spec))

    // 1) side-effect imports (styles)
    content = content.replace(SIDE_EFFECT_RE, (full, q, spec, offset, whole) => {
        // skip clause imports — those contain "from" right before the string; handled below
        const before = whole.slice(Math.max(0, offset), offset + full.length)
        if (/from\s*["']/.test(before)) return full
        if (!spec.startsWith(".")) return full
        const base = posix.basename(spec)
        if (styles[base]) return `import ${q}./${styles[base]}${q}`
        errors.push(`${srcFile}: unmapped side-effect import "${spec}"`)
        return full
    })

    // 2) clause imports
    content = content.replace(CLAUSE_RE, (full, typeKw, clause, q, spec) => {
        if (!spec.startsWith(".")) return full // bare specifier (vue, vue-router, ...) — keep
        const target = resolveSpec(spec)
        const baseName = posix.basename(target)
        if (setFiles.has(baseName)) return full // import between files of the same ejected set — keep relative

        const map = MODULE_MAP[target]
        if (!map) {
            errors.push(`${srcFile}: no public mapping for "${spec}" (resolved: ${target})`)
            return full
        }

        // split the clause into default identifier and brace group
        const m = clause.match(/^([\w$]+)?\s*,?\s*(\{[\s\S]*\})?$/)
        const defaultName = m?.[1]
        const braces = m?.[2]
        let inner = braces ? braces.slice(1, -1).trim().replace(/,\s*$/, "") : ""

        if (defaultName) {
            const publicName = map.named ?? map.defaultAs
            if (!publicName) {
                errors.push(`${srcFile}: default import "${defaultName}" from "${spec}" has no public named export mapping`)
                return full
            }
            const imported = publicName === defaultName ? publicName : `${publicName} as ${defaultName}`
            inner = inner ? `${imported}, ${inner}` : imported
        }
        // enforce that every rewritten name is actually exported by the target barrel
        const publicSet = PUBLIC_EXPORTS[map.spec]
        if (publicSet?.size) {
            for (const part of inner.split(",")) {
                const name = part.trim().replace(/^type\s+/, "").split(/\s+as\s+/)[0].trim()
                if (name && !publicSet.has(name)) {
                    errors.push(`${srcFile}: "${name}" is not a public export of ${map.spec} (mapped from "${spec}") — add it to that barrel or fix the mapping`)
                }
            }
        }
        return `import ${typeKw || ""}{ ${inner} } from ${q}${map.spec}${q}`
    })

    if (errors.length) {
        throw new Error("Eject build failed — ejectable skins may only depend on public API:\n  " + errors.join("\n  "))
    }
    return content
}

// ------------------------------------------------------------------ generate
rmSync(outRoot, { recursive: true, force: true })
const index = []
for (const set of MANIFEST) {
    const outDir = join(outRoot, set.name)
    mkdirSync(outDir, { recursive: true })
    const written = []
    for (const file of set.files) {
        const from = typeof file === "string" ? file : file.from
        const to = typeof file === "string" ? file : file.to
        const srcFile = posix.join(set.dir, from)
        const content = readFileSync(resolve(srcRoot, srcFile), "utf8")
        writeFileSync(join(outDir, to), rewriteImports(content, set, srcFile))
        written.push(to)
    }
    for (const [from, to] of Object.entries(set.styles || {})) {
        writeFileSync(join(outDir, to), readFileSync(resolve(srcRoot, set.dir, from), "utf8"))
        written.push(to)
    }
    index.push({ name: set.name, files: written, note: set.note })
    console.log(`Ejectable ${set.name} → _template/ui/${set.name} (${written.join(", ")})`)
}
writeFileSync(join(outRoot, "manifest.json"), JSON.stringify(index, null, 4) + "\n")
console.log(`✓ _template/ui generated — ${index.length} ejectable component(s)`)
