import { describe, test, expect } from "vitest"
import { readFileSync, existsSync } from "fs"
import { resolve } from "path"
import ts from "typescript"

// What every `package.json` `exports` entry hands an app, pinned per entry: the names its JavaScript exports at runtime,
// and the value and type names its declaration file exports. Moving code between modules must leave every existing
// entry's snapshot as it is; a change here is a change to what an installed app can import. Reads the built `dist/`
// through the package's own name, as an install does, so it runs after `npm run build`.

const root = resolve(import.meta.dirname, "../..")
const pkg = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"))
const entries = Object.entries(pkg.exports)
    .filter(([, target]) => typeof target === "object" && target.import)
    .map(([subpath, target]) => ({ subpath, js: target.import, dts: resolve(root, target.types) }))

const program = ts.createProgram(
    entries.map((entry) => entry.dts),
    { noEmit: true, skipLibCheck: true, moduleResolution: ts.ModuleResolutionKind.Bundler, module: ts.ModuleKind.ESNext }
)
const checker = program.getTypeChecker()

function declaredExports(dts) {
    const source = program.getSourceFile(dts)
    const moduleSymbol = source && checker.getSymbolAtLocation(source)
    if (!moduleSymbol) return { values: [], types: [] }
    const values = []
    const types = []
    for (const symbol of checker.getExportsOfModule(moduleSymbol)) {
        const target = symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol
        if (target.flags & ts.SymbolFlags.Value) values.push(symbol.name)
        if (target.flags & ts.SymbolFlags.Type) types.push(symbol.name)
    }
    return { values: values.sort(), types: types.sort() }
}

// the first import of dist/ through Vitest's transform can take several seconds under a full run, past the 5 s default
const timeout = 30_000

describe.runIf(existsSync(resolve(root, "dist")))("package exports", () => {
    // the test's own `expect`: an assertion that ran late fails this test, and never writes into the snapshot of the
    // test running at the time
    test.for(entries.map((entry) => [entry.subpath, entry]))("%s", { timeout }, async ([subpath, { dts }], { expect }) => {
        const mod = await import(subpath === "." ? "@regira/modules" : `@regira/modules/${subpath.slice(2)}`)
        expect({ runtime: Object.keys(mod).sort(), declared: declaredExports(dts) }).toMatchSnapshot()
    })

    // one package, one copy of each module: a service registered or a translator set through `core` is the one the
    // `vue/*` entries use, because the build puts what they share into common chunks rather than into each entry
    test("the vue/* entries hand out core's own instances", { timeout }, async () => {
        const core = await import("@regira/modules/core")
        const ioc = await import("@regira/modules/vue/ioc")
        const http = await import("@regira/modules/vue/http")
        const feedback = await import("@regira/modules/vue/ui/feedback")
        const abstractions = await import("@regira/modules/vue/entities/abstractions")
        const entities = await import("@regira/modules/vue/entities")
        const auth = await import("@regira/modules/vue/auth")
        const lang = await import("@regira/modules/vue/lang")
        const formatters = await import("@regira/modules/vue/formatters")
        expect(ioc.default).toBe(core.defaultServiceProvider)
        expect(http.useAxios).toBe(core.useAxios)
        expect(feedback.setErrorTranslator).toBe(core.setErrorTranslator)
        expect(abstractions.EntityServiceBase).toBe(core.EntityServiceBase)
        expect(entities.EntityServiceBase).toBe(core.EntityServiceBase)
        expect(entities.PagingInfo).toBe(core.PagingInfo)
        expect(auth.AuthService).toBe(core.AuthService)
        expect(auth.registerCredentialUrls).toBe(core.registerCredentialUrls)
        expect(lang.translate).toBe(core.translate)
        expect(formatters.formatDate).toBe(core.formatDate)
    })
})
