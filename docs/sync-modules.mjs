// Build-time sync: copies each module's human docs (README.md + docs/*.md) from
// ../src into ./reference, and writes ./.vitepress/sidebar.json. This keeps the
// docs site DRY — the canonical markdown stays in src/**, nothing is duplicated
// in git (./reference and ./.vitepress/sidebar.json are .gitignored).
//
// Defensive by design: it never throws. A missing module is skipped with a
// warning so the VitePress build always proceeds.

import { promises as fs } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(__dirname, "..")
const srcRoot = path.join(repoRoot, "src")
const outRoot = path.join(__dirname, "reference")

// Module roots relative to src/, with display title + sidebar group.
// Order here is the order they appear in the sidebar.
const MODULES = [
  // Vue platform
  { id: "vue-entities", dir: "vue/entities", title: "Entities (CRUD)", group: "Vue modules" },
  { id: "vue-http", dir: "vue/http", title: "HTTP", group: "Vue modules" },
  { id: "vue-ioc", dir: "vue/ioc", title: "IoC", group: "Vue modules" },
  { id: "vue-auth", dir: "vue/auth", title: "Auth", group: "Vue modules" },
  { id: "vue-ui", dir: "vue/ui", title: "UI", group: "Vue modules" },
  { id: "vue-app", dir: "vue/app", title: "App", group: "Vue modules" },
  { id: "vue-lang", dir: "vue/lang", title: "Lang (i18n)", group: "Vue modules" },
  { id: "vue-formatters", dir: "vue/formatters", title: "Formatters", group: "Vue modules" },
  { id: "vue-directives", dir: "vue/directives", title: "Directives", group: "Vue modules" },
  { id: "vue-online", dir: "vue/online", title: "Online", group: "Vue modules" },
  { id: "vue-debug", dir: "vue/debug", title: "Debug", group: "Vue modules" },
  { id: "vue-helper", dir: "vue/vue-helper", title: "Vue Helper", group: "Vue modules" },
  // Core (framework-agnostic)
  { id: "utilities", dir: "utilities", title: "Utilities", group: "Core" },
  { id: "extensions", dir: "extensions", title: "Extensions", group: "Core" },
  { id: "treelist", dir: "treelist", title: "TreeList", group: "Core" },
  { id: "events", dir: "events", title: "Events", group: "Core" },
  { id: "io", dir: "io", title: "IO", group: "Core" },
]

const exists = async (p) => !!(await fs.stat(p).catch(() => null))
const titleCase = (s) => s.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())

async function run() {
  await fs.rm(outRoot, { recursive: true, force: true })

  /** @type {Record<string, Array<object>>} */
  const groups = {}

  for (const m of MODULES) {
    const modSrc = path.join(srcRoot, m.dir)
    if (!(await exists(modSrc))) {
      console.warn(`[sync] skip (missing): src/${m.dir}`)
      continue
    }

    const destDir = path.join(outRoot, m.id)
    await fs.mkdir(destDir, { recursive: true })

    const items = [{ text: "Overview", link: `/reference/${m.id}/` }]

    // Top-level README.md -> index.md (module landing)
    const readme = path.join(modSrc, "README.md")
    if (await exists(readme)) {
      await fs.copyFile(readme, path.join(destDir, "index.md"))
    } else {
      await fs.writeFile(
        path.join(destDir, "index.md"),
        `# ${m.title}\n\nSee the topics in the sidebar.\n`,
      )
    }

    // docs/*.md -> sibling pages
    const docsDir = path.join(modSrc, "docs")
    if (await exists(docsDir)) {
      const files = (await fs.readdir(docsDir)).filter((f) => f.endsWith(".md")).sort()
      for (const f of files) {
        if (f.toLowerCase() === "readme.md") {
          // A docs/README.md is the better landing if present
          await fs.copyFile(path.join(docsDir, f), path.join(destDir, "index.md"))
          continue
        }
        const slug = f.replace(/\.md$/, "")
        await fs.copyFile(path.join(docsDir, f), path.join(destDir, f))
        items.push({ text: titleCase(slug), link: `/reference/${m.id}/${slug}` })
      }
    }

    ;(groups[m.group] ||= []).push({ text: m.title, collapsed: true, items })
  }

  const sidebar = {
    "/reference/": Object.entries(groups).map(([text, items]) => ({ text, items })),
  }

  await fs.mkdir(path.join(__dirname, ".vitepress"), { recursive: true })
  await fs.writeFile(
    path.join(__dirname, ".vitepress", "sidebar.json"),
    JSON.stringify(sidebar, null, 2),
  )
  console.log(`[sync] done — ${Object.values(groups).flat().length} modules`)
}

run().catch((e) => {
  // Never fail the build because of doc sync; a partial site is better than none.
  console.error("[sync] failed (continuing with whatever was copied):", e)
})
