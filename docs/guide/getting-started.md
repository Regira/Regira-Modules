# Getting started

`@regira/modules` is the Regira front-end library: TypeScript and Vue 3 building blocks
(entities/CRUD, http, ioc, auth, ui, formatters, …) that pair with the Regira back-end packages.

## Install

The library is published to the npm registry as [`@regira/modules`](https://www.npmjs.com/package/@regira/modules) —
the published package ships a prebuilt `dist/`. The `prepare` build (`scripts/build.mjs`: `vite build`,
`vue-tsc` declarations, SCSS copies, `_template` regeneration) runs at publish time, not on install:

```bash
npm install @regira/modules
```

`npm install` resolves the **latest published version** and writes the caret range to `package.json` —
don't pin a specific version by hand.

> To pin an unreleased commit you can still install from the repo with
> `"@regira/modules": "github:Regira/Regira-Modules"` — that path needs a `git` binary on `PATH` and runs the
> full `prepare` build on install, so expect it to be much slower than the registry install.

Bare subpath imports resolve via the package `exports` map:

```ts
import { EntityServiceBase } from "@regira/modules/vue/entities"
import { initAxios } from "@regira/modules/vue/http"
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
    { find: "@/regira", replacement: fileURLToPath(new URL("./node_modules/@regira/modules/dist", import.meta.url)) },
    { find: "@", replacement: fileURLToPath(new URL("./src", import.meta.url)) },
  ],
}
```

```json
// tsconfig.app.json
"compilerOptions": {
  "paths": {
    "@/regira/*": ["./node_modules/@regira/modules/dist/*"],
    "@/*": ["./src/*"]
  }
}
```

## Scaffold an app

The library ships its reference app as a template — don't hand-write the boilerplate. One command
writes the app shell (`main.ts`, `App.vue`, router, dashboard + navbar, layout, views, runtime config),
and one command per entity writes a complete, type-checked CRUD slice (~23 files; you customize ~8):

```bash
node node_modules/@regira/modules/_template/scaffold.mjs --shell     # app shell, once (--no-auth for apps without login)
node node_modules/@regira/modules/_template/scaffold.mjs Product     # one slice per entity
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
