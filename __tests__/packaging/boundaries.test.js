import { describe, test, expect } from "vitest"
import { readFileSync, existsSync, readdirSync } from "fs"
import { resolve, dirname, relative } from "path"
import ts from "typescript"

// Which framework packages each built entry can reach, by following the imports of `dist/` file by file — shared
// chunks included, so a framework-free module that a bundler merged into a chunk with a Vue one shows up here.
// `core` must reach no framework at all, in its JavaScript and in its declarations alike: an app without Vue
// compiles against those. The framework-free `vue/*` entries are pinned too, so an import added to one of them
// fails here instead of in an app that relied on it.

const root = resolve(import.meta.dirname, "../..")
const dist = resolve(root, "dist")
const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"))

const VUE = ["vue", "vue-router", "pinia"]
const REACT = ["react", "react-dom", "react-router"]

// a bare specifier's package: `@vue/runtime-core` → `@vue/runtime-core`, `date-fns/locale` → `date-fns`
const packageOf = (specifier) =>
    specifier
        .split("/")
        .slice(0, specifier.startsWith("@") ? 2 : 1)
        .join("/")
const isFramework = (name, frameworks) => frameworks.includes(name) || (frameworks === VUE && name.startsWith("@vue/"))

const STATIC = /(?:^|[^\w$.])(?:import|export)\s*(?:type\s+)?(?:[\w*{}\s,$]*?from\s*)?["']([^"']+)["']/g
const DYNAMIC = /import\(\s*["']([^"']+)["']\s*\)/g
const AUGMENTED = /declare\s+module\s+["']([^"']+)["']/g
const REFERENCED = /\/\/\/\s*<reference\s+types=["']([^"']+)["']/g

function specifiersOf(source, declarations) {
    const patterns = declarations ? [STATIC, DYNAMIC, AUGMENTED, REFERENCED] : [STATIC, DYNAMIC]
    return patterns.flatMap((pattern) => [...source.matchAll(pattern)].map((match) => match[1]))
}

function resolveRelative(from, specifier, declarations) {
    const base = resolve(dirname(from), specifier)
    const candidates = declarations
        ? [base.replace(/\.js$/, ".d.ts"), `${base}.d.ts`, resolve(base, "index.d.ts")]
        : [base, `${base}.js`, resolve(base, "index.js")]
    return candidates.find((candidate) => existsSync(candidate) && candidate.endsWith(declarations ? ".d.ts" : ".js"))
}

/** every package the file reaches, following relative imports through dist/ */
function reach(entry, declarations) {
    const packages = new Set()
    const seen = new Set()
    const pending = [entry]
    while (pending.length > 0) {
        const file = pending.pop()
        if (seen.has(file)) continue
        seen.add(file)
        for (const specifier of specifiersOf(readFileSync(file, "utf8"), declarations)) {
            if (specifier.startsWith(".")) {
                const next = resolveRelative(file, specifier, declarations)
                if (next) pending.push(next)
            } else {
                packages.add(packageOf(specifier))
            }
        }
    }
    return [...packages].sort()
}

const entries = Object.fromEntries(
    Object.entries(pkg.exports)
        .filter(([, target]) => typeof target === "object" && target.import)
        .map(([subpath, target]) => [subpath, { js: resolve(root, target.import), dts: resolve(root, target.types) }])
)

// the entries an app without Vue can load; one that starts reaching Vue breaks that app
const VUE_FREE = [
    "./core",
    "./events",
    "./extensions",
    "./extensions/date-extensions",
    "./io",
    "./treelist",
    "./utilities",
    "./utilities/array-utility",
    "./utilities/file-utility",
    "./utilities/promise-utility",
    "./utilities/string-utility",
    "./vue/entities/abstractions",
    "./vue/entities/abstractions/IEntity",
    "./vue/formatters",
    "./vue/http",
    "./vue/http/axios",
    "./vue/ioc",
].filter((subpath) => subpath in entries)

// the scan itself: a pattern that stops matching would let every boundary below pass
test("the import scan reads formatted and minified code", () => {
    const formatted =
        'import { ref } from "vue"\nimport type { Router } from "vue-router"\nexport * from "./chunk.js"\nimport "./side-effect.js"\nconst page = import("./page.js")'
    const minified = 'import{a as b}from"vue";export{c}from"./chunk.js";import"./side.js";const d=import("pinia")'
    expect(specifiersOf(formatted, false)).toEqual(["vue", "vue-router", "./chunk.js", "./side-effect.js", "./page.js"])
    expect(specifiersOf(minified, false)).toEqual(["vue", "./chunk.js", "./side.js", "pinia"])
    expect(specifiersOf('declare module "@vue/runtime-core" {}', true)).toEqual(["@vue/runtime-core"])
})

// What a TypeScript source imports, read from its syntax tree as the compiler parses it: imports, re-exports
// (`export * as v from` too), `import = require`, `import("…")` types and calls, `require`, `declare module` and
// `/// <reference types>` — and nothing written in a comment, a string or a regular expression
function sourceSpecifiers(source, fileName = "source.ts") {
    const kind = fileName.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS
    const file = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, kind)
    const found = file.typeReferenceDirectives.map((directive) => directive.fileName)
    const add = (node) => {
        if (node && ts.isStringLiteralLike(node)) found.push(node.text)
    }
    function visit(node) {
        if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) add(node.moduleSpecifier)
        else if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference)) add(node.moduleReference.expression)
        else if (ts.isImportTypeNode(node) && ts.isLiteralTypeNode(node.argument)) add(node.argument.literal)
        else if (ts.isModuleDeclaration(node) && ts.isStringLiteral(node.name)) add(node.name)
        else if (
            ts.isCallExpression(node) &&
            (node.expression.kind === ts.SyntaxKind.ImportKeyword || (ts.isIdentifier(node.expression) && node.expression.text === "require"))
        )
            add(node.arguments[0])
        ts.forEachChild(node, visit)
    }
    visit(file)
    return found
}

test("the source scan reads code, not comments, strings or regular expressions", () => {
    const source = [
        "// accepts image/*",
        'import { ref } from "vue"',
        "/** a doc comment */",
        'const accept = "image/*"',
        "const quoted = /[`'\"]/g",
        '// never imports from "vue-demi"',
        'import type { Router } from "vue-router"',
        'export * as store from "pinia"',
        'type Lazy = typeof import("react")',
        'const later = () => import("react-dom")',
        'import legacy = require("vue-demi/legacy")',
        'const loaded = require("react-router")',
        'declare module "@vue/runtime-core" {}',
    ].join("\n")
    expect(sourceSpecifiers(source).sort()).toEqual([
        "@vue/runtime-core",
        "pinia",
        "react",
        "react-dom",
        "react-router",
        "vue",
        "vue-demi/legacy",
        "vue-router",
    ])
    expect(sourceSpecifiers('/// <reference types="vue/macros-global" />\nexport {}')).toEqual(["vue/macros-global"])
    expect(sourceSpecifiers('declare module "@vue/runtime-core" {\n    interface ComponentCustomProperties {}\n}')).toEqual(["@vue/runtime-core"])
    expect(sourceSpecifiers('const a = <p>don`t</p>\nimport { b } from "react"', "view.tsx")).toEqual(["react"])
})

// what a source's import reaches: a package by its name, and a single-file component (`./View.vue`) as Vue itself
const reachedBy = (specifier) => (/\.vue$/.test(specifier) ? "vue" : specifier.startsWith(".") ? undefined : packageOf(specifier))

test("a relative .vue import counts as reaching Vue", () => {
    expect(["./Pending.vue", "../ui/Feedback.vue", "./errors", "vue-router/auto"].map(reachedBy)).toEqual(["vue", "vue", undefined, "vue-router"])
})

// every file under src/core, exported or not: the Vue layer imports the core's controllers directly, so the trace of
// the built entries below never reaches the ones `./core` does not export
test("src/core imports no framework, its unexported files included", () => {
    const sources = readdirSync(resolve(root, "src/core"), { recursive: true, withFileTypes: true })
        .filter((entry) => entry.isFile() && /\.tsx?$/.test(entry.name))
        .map((entry) => relative(resolve(root, "src/core"), resolve(entry.parentPath, entry.name)))
    const reached = sources.flatMap((file) =>
        sourceSpecifiers(readFileSync(resolve(root, "src/core", file), "utf8"), file)
            .map(reachedBy)
            .filter((name) => name != null && (isFramework(name, VUE) || isFramework(name, REACT)))
            .map((name) => `${file}: ${name}`)
    )
    expect(sources.length).toBeGreaterThan(0)
    expect(reached).toEqual([])
})

describe.runIf(existsSync(dist))("package boundaries", () => {
    test.each(VUE_FREE)("%s loads without Vue", (subpath) => {
        expect(reach(entries[subpath].js, false).filter((name) => isFramework(name, VUE))).toEqual([])
    })

    test.runIf("./core" in entries)("./core declares nothing from a framework", () => {
        expect(reach(entries["./core"].dts, true).filter((name) => isFramework(name, VUE) || isFramework(name, REACT))).toEqual([])
    })

    test.each(Object.keys(entries))("%s loads no React", (subpath) => {
        if (subpath === "./react") return
        expect(reach(entries[subpath].js, false).filter((name) => isFramework(name, REACT))).toEqual([])
    })
})
