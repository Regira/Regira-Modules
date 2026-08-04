import { execSync } from "child_process"
import { copyFileSync, mkdirSync } from "fs"
import { resolve, dirname } from "path"
import { fileURLToPath } from "url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, "..")

// Step 1: Vite build (must succeed)
execSync("npx vite build", { stdio: "inherit" })

// Step 2: TypeScript declarations (non-fatal — TS still emits .d.ts files even with errors)
try {
    execSync("npx vue-tsc --emitDeclarationOnly", { stdio: "inherit" })
} catch {
    console.warn("\n⚠  TypeScript errors found. Declaration files were still generated.\n")
}

// Step 3: Copy SCSS source files that are imported directly by consumers
const scssFiles = [
    ["src/vue/ui/autocomplete/style.scss", "dist/vue/ui/autocomplete/style.scss"],
    ["src/vue/ui/modal/style.scss", "dist/vue/ui/modal/style.scss"],
]
for (const [src, dest] of scssFiles) {
    const destPath = resolve(root, dest)
    mkdirSync(dirname(destPath), { recursive: true })
    copyFileSync(resolve(root, src), destPath)
    console.log(`Copied ${src} → ${dest}`)
}

// Step 4: Regenerate the ejectable UI skins (_template/ui) from the component source
execSync("node scripts/build-ui-template.mjs", { stdio: "inherit", cwd: root })

// Step 5: Regenerate the scaffolder's templates (_template/entity-slice, app-shell, entity-attachments) from
// the AI docs that are their source of truth. Without this the two halves drift silently: a fix authored in
// entities.examples.md or entities.shell.template.md builds green and ships the old file, so every scaffolded
// app keeps the bug while the documentation says it is fixed.
execSync("node scripts/build-entity-template.mjs", { stdio: "inherit", cwd: root })


