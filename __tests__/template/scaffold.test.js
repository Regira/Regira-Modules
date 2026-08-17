import { describe, test, expect, beforeAll, afterAll } from "vitest"
import { execFileSync } from "child_process"
import { mkdtempSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "fs"
import { tmpdir } from "os"
import { dirname, join, resolve } from "path"
import { fileURLToPath } from "url"

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..")
const scaffold = join(repoRoot, "_template", "scaffold.mjs")

let cwd
beforeAll(() => (cwd = mkdtempSync(join(tmpdir(), "regira-scaffold-"))))
afterAll(() => rmSync(cwd, { recursive: true, force: true }))

/** run scaffold.mjs in an isolated app root; returns its stdout */
function run(...args) {
    return execFileSync(process.execPath, [scaffold, ...args], { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] })
}
function app(...segments) {
    return join(cwd, ...segments)
}
function isDir(...segments) {
    try {
        return statSync(app(...segments)).isDirectory()
    } catch {
        return false
    }
}
/** every file under a directory, recursively */
function walk(dir, out = []) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const abs = join(dir, entry.name)
        entry.isDirectory() ? walk(abs, out) : out.push(abs)
    }
    return out
}
/** the "@/..." specifiers of REAL import statements (the templates also mention some in comments) */
function aliasImports(dir) {
    const specs = new Set()
    for (const file of walk(dir)) {
        for (const line of readFileSync(file, "utf8").split("\n")) {
            if (/^\s*(\/\/|\*|<!--)/.test(line)) continue // commented worked-example imports
            for (const m of line.matchAll(/\bfrom\s*["'](@\/[^"']+)["']/g)) specs.add(m[1])
        }
    }
    return [...specs]
}

/** run scaffold.mjs expecting a non-zero exit; returns its stderr */
function runFailing(...args) {
    try {
        execFileSync(process.execPath, [scaffold, ...args], { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] })
    } catch (ex) {
        return `${ex.stdout || ""}${ex.stderr || ""}`
    }
    throw new Error(`expected scaffold.mjs ${args.join(" ")} to fail`)
}

describe("scaffold.mjs entity name", () => {
    test("rejects a non-PascalCase entity name", () => {
        // The name becomes a class; --rel and --owns already enforce this, while the root argument was
        // accepted verbatim and emitted `export class product extends EntityBase`.
        const err = runFailing("product", "--no-auth")

        expect(err).toContain("must be PascalCase")
        expect(err).toContain("Product")
    })

    test("warns when the entity name shadows a DOM global", () => {
        // A model class named Location shadows window.Location inside every module importing the barrel:
        // new Location() reaches the DOM constructor and throws "Illegal constructor".
        const out = run("Location", "--no-auth")

        expect(out).toContain("DOM global")
        expect(out).toContain("LocationItem")
    })

    test("a normal entity name produces no collision warning", () => {
        const out = run("Invoice", "--no-auth")

        expect(out).not.toContain("DOM global")
    })

    test("warns when an --owns or --rel class shadows a DOM global", () => {
        // The child/relation classes land in the same barrel, so they shadow the global just as effectively —
        // and the warning has to precede generation, or acting on it costs a scaffold-and-delete cycle.
        const owns = run("Diary", "--owns", "Event", "--no-auth")
        expect(owns).toContain("DOM global")
        expect(owns.indexOf("DOM global")).toBeLessThan(owns.indexOf("✓ Scaffolded"))

        const rel = run("Venue", "--rel", "Location", "--no-auth")
        expect(rel).toContain("DOM global")
        expect(rel.indexOf("DOM global")).toBeLessThan(rel.indexOf("✓ Scaffolded"))
    })
})

describe("scaffold.mjs derived paths", () => {
    test("a slice folder is kebab-cased, from the derived plural", () => {
        run("ShoppingList", "--no-auth")

        expect(isDir("src", "entities", "shopping-lists")).toBe(true)
    })

    test("an owned sub-slice folder is kebab-cased too — not flattened to one lowercase word", () => {
        // regression: childFolder was lowerFirst(pluralize(child.toLowerCase())) — the only derived path in
        // the file that skipped kebab(), emitting assets/assetassignments beside a correct shopping-lists
        const out = run("Asset", "--owns", "AssetAssignment", "--no-auth")

        expect(isDir("src", "entities", "assets", "asset-assignments")).toBe(true)
        expect(isDir("src", "entities", "assets", "assetassignments")).toBe(false)
        expect(out).toContain("../asset-assignments") // the wiring hints point at the folder that exists
        expect(out).not.toContain("assetassignments")
    })

    test("--as renaming the owned collection is offered BEFORE the folder is created", () => {
        // acting on the hint means re-running with --as; once the sub-slice folder exists that needs
        // --overwrite-slice, so the hint has to come first to be actionable
        const out = run("Order", "--owns", "OrderLine", "--no-auth")

        expect(out.indexOf("--as <fieldName>")).toBeGreaterThan(-1)
        expect(out.indexOf("--as <fieldName>")).toBeLessThan(out.indexOf("✓ Owned collection OrderLine"))
    })

    test("--as after --owns overrides the JSON key without moving the folder", () => {
        run("Invoice", "--owns", "InvoiceRow", "--as", "lines", "--no-auth")

        expect(isDir("src", "entities", "invoices", "invoice-rows")).toBe(true)
        expect(readFileSync(app("src", "entities", "invoices", "invoice-rows", "Entity.ts"), "utf8")).toContain("invoiceId")
    })
})

describe("scaffold.mjs --rel", () => {
    test("imports the folder the related slice ACTUALLY lives in, honouring its --plural", () => {
        // regression: the folder was re-derived as kebab(pluralize(Rel)), so `Person --plural people`
        // produced imports from a nonexistent @/entities/persons that vue-tsc rejects
        run("Person", "--plural", "people", "--no-auth")
        run("Task", "--rel", "Person", "--no-auth")

        const imports = aliasImports(app("src", "entities", "tasks"))
        expect(imports).toContain("@/entities/people")
        expect(imports).not.toContain("@/entities/persons")
    })

    test("every emitted @/ import resolves to a directory the runs actually created", () => {
        for (const spec of aliasImports(app("src", "entities"))) {
            const rel = spec.replace(/^@\//, "").split("/")
            expect(isDir("src", ...rel), `${spec} does not exist`).toBe(true)
        }
    })

    test("falls back to the derived plural for a relation that is not scaffolded yet, and says so", () => {
        const out = run("Ticket", "--rel", "Vehicle", "--no-auth")

        expect(aliasImports(app("src", "entities", "tickets"))).toContain("@/entities/vehicles")
        expect(out).toContain("which does not exist yet")
    })

    test("--dir is honoured by the lookup as well as by the output", () => {
        run("Country", "--plural", "countries", "--no-auth", "--dir", "src/modules")
        run("City", "--rel", "Country", "--no-auth", "--dir", "src/modules")

        expect(isDir("src", "modules", "cities")).toBe(true)
        expect(aliasImports(app("src", "modules", "cities"))).toContain("@/modules/countries")
    })
})

describe("scaffold.mjs stdout", () => {
    test("the includes hint matches the includes the run actually wrote", () => {
        // regression: the CLI must never promise an includes value it did not write. It used to advertise
        // baseQueryParams.includes "<Rel>" while writing ["All"]; a --rel run now writes NO includes at all
        // (a to-one shown on every row belongs in the API's unconditional e.Includes), so the hint has to
        // point at the back-end instead of at a client flag.
        const out = run("Booking", "--rel", "Person", "--no-auth")
        const config = readFileSync(app("src", "entities", "bookings", "config", "config.ts"), "utf8")

        expect(config).toContain("baseQueryParams: {}")
        expect(config).not.toContain('includes: ["All"]')
        expect(out).toContain("baseQueryParams is left {}")
        expect(out).toContain("e.Includes")
        expect(out).not.toContain('includes ["All"]')
        expect(out).not.toContain('includes "Person"')
    })

    test("still warns that an includes member the API's NAMED [Flags] enum does not declare 400s", () => {
        // the ["All"] default is gone, but a consumer who adds includes by hand still needs the 400 rule
        const out = run("Reservation", "--rel", "Person", "--no-auth")

        expect(out).toContain("NAMED [Flags]")
        expect(out).toContain("400s")
    })

    test("lists the (c) files to customize, all of which exist", () => {
        const out = run("Supplier", "--no-auth")

        const listed = out
            .split("\n")
            .filter((l) => l.trim().startsWith("· src"))
            .map((l) => l.trim().slice(2).trim())
        expect(listed.length).toBe(8)
        for (const f of listed) {
            expect(statSync(join(cwd, f)).isFile(), `${f} was listed but not generated`).toBe(true)
        }
    })

    test("--help prints the reference without writing anything", () => {
        const before = readdirSync(cwd)
        const out = run("--help")

        expect(out).toContain("Usage:")
        expect(out).toContain("--overwrite-slice")
        expect(readdirSync(cwd)).toEqual(before)
    })
})

describe("scaffold.mjs owned collections", () => {
    test("writes the real prepareItem filter — one line per --owns — instead of leaving the TODO marker", () => {
        // regression: the marker survived into the generated service and the correct line was only PRINTED,
        // so an app that never read the console silently re-inserted every row the user had removed
        run("PurchaseOrder", "--owns", "PurchaseOrderLine", "--owns", "PurchaseOrderNote", "--as", "notes", "--no-auth")
        const service = readFileSync(app("src", "entities", "purchase-orders", "data", "EntityService.ts"), "utf8")

        expect(service).toContain("item.purchaseOrderLines = item.purchaseOrderLines?.filter((x) => !x._deleted)")
        expect(service).toContain("item.notes = item.notes?.filter((x) => !x._deleted)") // --as renames the key
        expect(service).not.toContain("TODO (owned collections only)")
        expect(service).toContain("return super.prepareItem(item)")
    })

    test("does not coalesce an unloaded owned collection to an empty array", () => {
        // regression: `|| []` turned "this form never loaded the collection" (undefined) into "delete every
        // row" — the back-end contract is null = untouched, [] = delete-all, and the failure is silent.
        run("PurchaseOrder", "--owns", "PurchaseOrderLine", "--no-auth")
        const filterLines = readFileSync(app("src", "entities", "purchase-orders", "data", "EntityService.ts"), "utf8")
            .split("\n")
            .filter((l) => !/^\s*\/\//.test(l) && l.includes("_deleted"))

        expect(filterLines.length).toBeGreaterThan(0)
        expect(filterLines.some((l) => l.includes("|| []"))).toBe(false)
    })

    test("strips the marker line entirely when nothing is owned", () => {
        run("Colour", "--no-auth")
        const service = readFileSync(app("src", "entities", "colours", "data", "EntityService.ts"), "utf8")

        expect(service).not.toContain("TODO")
        expect(service).toContain("return super.prepareItem(item)")
    })

    test("the owned editor's CSS class is kebab-case, like every other class in the templates", () => {
        run("Menu", "--owns", "MenuItem", "--no-auth")
        const overview = readFileSync(app("src", "entities", "menus", "menu-items", "Overview.vue"), "utf8")

        expect(overview).toContain('class="menu-items-editor"')
        expect(overview).not.toContain("menuItems-editor")
        expect(overview).toContain('v-model="item.menuItems"') // the BINDING stays the camelCase JSON key
    })

    test("--picker emits chips over a plain join row, not the scalar editable table", () => {
        // A pure join has nothing to type into, and InputSelectorInline constrains rows to
        // `{ _deleted?, id? }` — giving it the EntityBase row class is what makes add({...}) fail to compile.
        run("Article", "--owns", "ArticleCategory", "--as", "categories", "--picker", "Category", "--no-auth")
        const dir = ["src", "entities", "articles", "article-categories"]
        const entity = readFileSync(app(...dir, "Entity.ts"), "utf8")
        const overview = readFileSync(app(...dir, "Overview.vue"), "utf8")

        expect(entity).toContain("export interface ArticleCategory")
        expect(entity).toContain("categoryId: number")
        expect(entity).not.toContain("extends EntityBase")
        expect(overview).toContain("InputSelectorInline")
        expect(overview).toContain("add({ categoryId: x.id!, category: x })")
        expect(overview).not.toContain("useOwnedCollection")
    })

    test("--picker names the OTHER side of the join", () => {
        expect(() => run("Article", "--owns", "ArticleCategory", "--picker", "ArticleCategory", "--no-auth")).toThrow(/repeats the --owns class/)
        expect(() => run("Article", "--rel", "Category", "--picker", "Category", "--no-auth")).toThrow(/directly after the --owns/)
    })

    test("--fk overrides the child's FK to the parent", () => {
        // The default FK derives from the parent CLASS name, but the wire key follows the C# PROPERTY —
        // a `QCreditRequest` child whose FK property is `RequestId` needs requestId, not qCreditRequestId.
        run("CreditRequest", "--owns", "CreditRequestItem", "--as", "items", "--fk", "requestId", "--no-auth")
        const entity = readFileSync(app("src", "entities", "credit-requests", "credit-request-items", "Entity.ts"), "utf8")

        expect(entity).toContain("requestId?: number")
        expect(entity).not.toContain("creditRequestId")
    })

    test("without --fk the FK defaults to the parent class name, and the run says so", () => {
        const out = run("WorkOrder", "--owns", "WorkOrderStep", "--no-auth")
        const entity = readFileSync(app("src", "entities", "work-orders", "work-order-steps", "Entity.ts"), "utf8")

        expect(entity).toContain("workOrderId?: number")
        expect(out).toContain('defaulting its FK to the parent to "workOrderId"')
    })

    test("a --picker join gets no FK hint — the flag it would suggest is rejected for pure joins", () => {
        // The join row carries only the two FKs, so there is no parent FK to rename; acting on the hint
        // hard-errors with "--fk does not apply to … --picker".
        const out = run("Article", "--owns", "ArticleTag", "--as", "tags", "--picker", "Tag", "--no-auth")

        expect(out).not.toContain("defaulting its FK to the parent")
        expect(() => run("Post", "--owns", "PostTag", "--as", "tags", "--picker", "Tag", "--fk", "postId", "--no-auth")).toThrow(
            /--fk does not apply/
        )
    })

    test("--fk validates its value and placement", () => {
        expect(() => run("Ledger", "--owns", "LedgerLine", "--fk", "request", "--no-auth")).toThrow(/ending in "Id"/)
        expect(() => run("Ledger", "--rel", "Account", "--fk", "accountId", "--no-auth")).toThrow(/directly after the --owns/)
    })

    test("--fk on a --picker join is rejected", () => {
        // The join template carries no parent FK on the client (Related() sets it server-side), so an
        // accepted-but-ignored --fk would read as a successful rename.
        expect(() => run("Order", "--owns", "OrderTag", "--as", "tags", "--picker", "Tag", "--fk", "orderId", "--no-auth")).toThrow(
            /--fk does not apply/
        )
    })
})

describe("scaffold.mjs --no-auth", () => {
    // 40+ calls pass --no-auth for convenience but nothing asserted on what stripping produced, so a marker
    // that stopped matching went unnoticed: the hook and its import were removed while the multi-line
    // comment describing them stayed, telling the reader to "delete this line AND its import above" when
    // both were already gone.
    test("leaves no trace of the auth hook in an entity slice", () => {
        run("Kiosk", "--no-auth")

        for (const file of ["overview/Overview.vue", "details/Details.vue"]) {
            const src = readFileSync(app("src", "entities", "kiosks", ...file.split("/")), "utf8")
            expect(src, `${file} mentions auth`).not.toMatch(/auth/i)
            expect(src, `${file} kept the marker comment`).not.toMatch(/no-auth app:/i)
            expect(src, `${file} kept the hook's comment block`).not.toMatch(/token arrives/i)
        }
    })

    test("drops `load` from Details' useDetails destructure — it exists only to feed the hook", () => {
        run("Terminal", "--no-auth")

        const details = readFileSync(app("src", "entities", "terminals", "details", "Details.vue"), "utf8")
        expect(details).toContain("useDetails(service)")
        expect(details).not.toMatch(/\bload\b/)
    })

    test("without --no-auth the hook and its comment both survive", () => {
        run("Terminus")

        const overview = readFileSync(app("src", "entities", "terminuses", "overview", "Overview.vue"), "utf8")
        expect(overview).toContain("onAuthenticated(")
        expect(overview).toMatch(/no-auth app:/i) // the marker the stripper keys on
    })
})

describe("scaffold.mjs --overwrite-slice", () => {
    // The clean replace used to wipe the whole slice folder before re-emitting the template. An owned
    // sub-slice lives INSIDE that folder and is only re-emitted when the run repeats its --owns, so
    // re-running the flag without it silently destroyed the hand-authored child files and exited 0.
    test("keeps a nested owned sub-slice the run does not regenerate", () => {
        run("Purchase", "--owns", "PurchaseLine", "--no-auth")
        const childEntity = app("src", "entities", "purchases", "purchase-lines", "Entity.ts")
        writeFileSync(childEntity, "// hand-authored\n")

        const out = run("Purchase", "--overwrite-slice", "--no-auth") // note: no --owns

        expect(readFileSync(childEntity, "utf8")).toContain("hand-authored")
        expect(out).toContain("purchase-lines") // and it names what it kept rather than silently keeping it
    })

    test("repeating the --owns does replace the sub-slice", () => {
        run("Delivery", "--owns", "DeliveryLine", "--no-auth")
        const childEntity = app("src", "entities", "deliveries", "delivery-lines", "Entity.ts")
        writeFileSync(childEntity, "// hand-authored\n")

        run("Delivery", "--owns", "DeliveryLine", "--overwrite-slice", "--no-auth")

        expect(readFileSync(childEntity, "utf8")).not.toContain("hand-authored")
    })

    test("still replaces the slice's own (c) files", () => {
        run("Shipment", "--no-auth")
        const form = app("src", "entities", "shipments", "details", "Form.vue")
        writeFileSync(form, "<!-- hand-authored -->\n")

        run("Shipment", "--overwrite-slice", "--no-auth")

        expect(readFileSync(form, "utf8")).not.toContain("hand-authored")
    })
})

describe("scaffold.mjs self-referencing --rel", () => {
    test("a --rel naming the scaffolded entity is skipped with a hand-wiring hint", () => {
        // The generated relation blocks import from the related slice's BARREL — for a self-relation
        // (Employee → manager) that is the slice's own barrel, a self-import cycle through store.ts.
        const out = run("Employee", "--rel", "Employee", "--no-auth")

        expect(out).toContain("references the Employee slice itself — skipped")
        const listItem = readFileSync(app("src", "entities", "employees", "overview", "ListItem.vue"), "utf8")
        expect(listItem).not.toContain('from "@/entities/employees"')
    })
})

describe("scaffold.mjs --shell config.json", () => {
    // --shell writes into the app ROOT, so every run gets its own
    const roots = []
    afterAll(() => roots.forEach((dir) => rmSync(dir, { recursive: true, force: true })))
    function shellConfig(...args) {
        const root = mkdtempSync(join(tmpdir(), "regira-shell-"))
        roots.push(root)
        execFileSync(process.execPath, [scaffold, "--shell", ...args], { cwd: root, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] })
        return readFileSync(join(root, "public", "config.json"), "utf8")
    }

    test("--no-auth drops the auth-only keys — no marker can live in JSON, so the file is edited by key", () => {
        const raw = shellConfig("--no-auth")
        const config = JSON.parse(raw)

        expect(config).not.toHaveProperty("loginUrl")
        expect(config).not.toHaveProperty("clientApp")
        expect(config.api).toBeTruthy() // everything else survives
        expect(config.navigation).toBeTruthy()
    })

    test("the surviving keys keep their hand-written formatting — the file is not re-stringified", () => {
        const raw = shellConfig("--no-auth")

        expect(raw).toContain('"api": { "development"') // still inline, not reflowed onto three lines
        expect(raw).toContain('    "isDebug"') // still 4-space indented
    })

    test("an auth app keeps both keys", () => {
        const config = JSON.parse(shellConfig())

        expect(config.loginUrl).toBeTruthy()
        expect(config.clientApp).toBeTruthy()
    })
})

describe("scaffold.mjs guards", () => {
    test("refuses to silently regenerate an existing slice", () => {
        run("Widget", "--no-auth")

        expect(() => run("Widget", "--no-auth")).toThrow(/already exists/)
    })

    test("rejects a misplaced --as", () => {
        expect(() => run("Thing", "--as", "stuff", "--no-auth")).toThrow(/must come directly after/)
    })

    test("rejects an --as that names the FK instead of the navigation property", () => {
        expect(() => run("Thing", "--rel", "Employee", "--as", "assignedToEmployeeId", "--no-auth")).toThrow(/not its FK/)
    })

    test("catches a Git-Bash-expanded --api path", () => {
        mkdirSync(app("ignored"), { recursive: true })
        expect(() => run("Thing", "--api", "/C:/Program Files/Git/products", "--no-auth")).toThrow(/expanded the leading slash/)
    })
})
