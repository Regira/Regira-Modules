// Installs the packed package into each app under __tests__/fixtures and builds it, the way an app outside this
// repository installs it. Each app is copied to a temporary folder first: inside the repository, Node would resolve
// `vue` from the repository's own node_modules and hide an import an app without Vue cannot satisfy.
//
// Packs the existing dist/ (run `npm run build` first) rather than rebuilding it through `prepack`.
import { execSync } from "child_process"
import { cpSync, existsSync, mkdtempSync, readdirSync, rmSync } from "fs"
import { tmpdir } from "os"
import { dirname, join, resolve } from "path"
import { fileURLToPath } from "url"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const fixtures = resolve(root, "__tests__/fixtures")
// the packages an app without Vue must not end up with: npm installs a required peer, never an optional one
const ABSENT = { "consumer-no-vue": ["vue", "vue-router", "pinia", "@vue/runtime-core"] }

if (!existsSync(resolve(root, "dist"))) {
    console.error("dist/ is missing — run `npm run build` first")
    process.exit(1)
}

const run = (command, cwd) => execSync(command, { cwd, stdio: "inherit" })
const work = mkdtempSync(join(tmpdir(), "regira-consumers-"))
let failed = false
try {
    const tarball = execSync(`npm pack --ignore-scripts --loglevel error --pack-destination "${work}"`, { cwd: root, encoding: "utf8" }).trim().split(/\r?\n/).pop()
    for (const name of readdirSync(fixtures)) {
        const app = join(work, name)
        console.log(`\n▶ ${name}`)
        cpSync(join(fixtures, name), app, { recursive: true })
        try {
            run(`npm install --no-audit --no-fund "${join(work, tarball)}"`, app)
            const present = (ABSENT[name] ?? []).filter((dependency) => existsSync(join(app, "node_modules", dependency)))
            if (present.length > 0) {
                throw new Error(`installed without asking: ${present.join(", ")}`)
            }
            run("npx tsc --noEmit -p .", app)
            run("npx vite build --logLevel warn", app)
            console.log(`✓ ${name}`)
        } catch (error) {
            failed = true
            console.error(`✗ ${name}: ${error.message}`)
        }
    }
} finally {
    rmSync(work, { recursive: true, force: true })
}
process.exit(failed ? 1 : 0)
