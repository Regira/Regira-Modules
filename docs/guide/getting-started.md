# Getting started

`regira` is the Regira front-end library: TypeScript and Vue 3 building blocks
(entities/CRUD, http, ioc, auth, ui, formatters, …) that pair with the Regira back-end packages.

## Install

The library is consumed straight from GitHub. `dist/` is not committed — npm runs the package's
`prepare` script on install, which builds it (`scripts/build.mjs`: `vite build` + `vue-tsc`
declarations, then copying the consumer-imported SCSS files and regenerating the `_template`
scaffold/UI templates), so the install is a real build and takes noticeably longer than a registry
install.

```json
// package.json
{
    "dependencies": {
        "regira": "github:Regira/Regira-Modules"
    }
}
```

> npm resolves this with `git`, so a `git` binary must be on `PATH`, and the `prepare` build needs
> the dev toolchain to install — expect the first install to take a while. Where non-registry installs are
> blocked or SSH (port 22) is unavailable — CI, containers, locked-down networks — pin HTTPS instead:
> `"regira": "git+https://github.com/Regira/Regira-Modules.git"`, or map it globally with
> `git config --global url."https://github.com/".insteadOf git@github.com:`.

Bare subpath imports resolve via the package `exports` map:

```ts
import { EntityServiceBase } from "regira/vue/entities"
import { initAxios } from "regira/vue/http"
```

### Peer dependencies

Pin known-good versions of the peers and install:

```bash
npm install vue@^3.5 vue-router@^5 pinia@^3 axios@^1 date-fns@^4
npm install
```

> The toolchain moves as a set: `vue-router@5` pulls **Vite 8** (`vite@^8`, `@vitejs/plugin-vue@^6`,
> `typescript@^6`, `vue-tsc@^3`). Older `create-vue` defaults (Vite 6 / router 4 / pinia 2) hit
> peer-resolution errors — install the whole set at once rather than one `ERESOLVE` at a time. The
> authoritative list is the known-good dependency set in the `entities.setup` guide.

### Optional dev alias

A short alias keeps imports tidy in a consuming app (order matters):

```ts
// vite.config.ts
resolve: {
  alias: [
    { find: "@/regira", replacement: fileURLToPath(new URL("./node_modules/regira/dist", import.meta.url)) },
    { find: "@", replacement: fileURLToPath(new URL("./src", import.meta.url)) },
  ],
}
```

```json
// tsconfig.app.json
"compilerOptions": {
  "paths": {
    "@/regira/*": ["./node_modules/regira/dist/*"],
    "@/*": ["./src/*"]
  }
}
```

## Scaffold an app

The library ships its reference app as a template — don't hand-write the boilerplate. One command
writes the app shell (`main.ts`, `App.vue`, router, dashboard + navbar, layout, views, runtime config),
and one command per entity writes a complete, type-checked CRUD slice (~23 files; you customize ~8):

```bash
node node_modules/regira/_template/scaffold.mjs --shell     # app shell, once (--no-auth for apps without login)
node node_modules/regira/_template/scaffold.mjs Product     # one slice per entity
```

The scaffolded views are indicative of functionality, not appearance — restyle and restructure the
markup freely; the wiring (composables, services, plugin order, routing) is the part to keep. For a
lighter build, the UI kit ([UI reference](/reference/vue-ui/)) and
[formatters](/reference/vue-formatters/) also work à la carte — paging, loading, feedback, modals, and
autocomplete import individually into any Vue 3 app, no scaffold required.

## Where to go next

- **[The module stack](/guide/module-stack)** — what each module does and whether you need it.
- **[Entities reference](/reference/vue-entities/)** — the CRUD client, the most-used module.

## AI agents (MCP) {#ai-agents-mcp}

The hosted Regira MCP server serves these same modules (front-end ids look like
`regira_modules.vue.entities`) alongside the back-end packages. Connect it once and a coding agent
can discover and read the guides on demand:

```json
{ "mcpServers": { "regira": { "url": "https://mcp.regira.com/mcp", "transport": "http" } } }
```

Then use `list_packages` (filter `vue` or `frontend`), `get_package`, and `get_example`.
