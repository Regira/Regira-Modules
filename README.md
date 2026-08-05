# Regira Modules

`regira` — the Regira front-end library: TypeScript and Vue 3 building blocks (entities/CRUD,
http, ioc, auth, ui, formatters, …) that pair with the Regira back-end packages.

## Documentation

Each module ships a developer README (linked below) with deeper guides under its `docs/` folder where
present. Building a Vue 3 SPA against a Regira.Entities API? Start with the
[entities client](src/vue/entities/README.md); otherwise pick a module from the tables.

**Vue modules**

| Module | Developer docs |
|--------|----------------|
| Entities (Vue CRUD client) | [src/vue/entities](src/vue/entities/README.md) |
| HTTP (shared axios + helpers) | [src/vue/http](src/vue/http/README.md) |
| IoC (service container) | [src/vue/ioc](src/vue/ioc/README.md) |
| Auth (JWT bearer auth) | [src/vue/auth](src/vue/auth/README.md) |
| UI (components & plugins) | [src/vue/ui](src/vue/ui/README.md) |
| App (lifecycle & culture) | [src/vue/app](src/vue/app/README.md) |
| Lang (i18n) | [src/vue/lang](src/vue/lang/README.md) |
| Formatters | [src/vue/formatters](src/vue/formatters/README.md) |
| Directives | [src/vue/directives](src/vue/directives/README.md) |
| Online (connectivity) | [src/vue/online](src/vue/online/README.md) |
| Debug | [src/vue/debug](src/vue/debug/README.md) |
| Vue Helper (composition helpers) | [src/vue/vue-helper](src/vue/vue-helper/README.md) |

**Core (framework-agnostic)**

| Module | Developer docs |
|--------|----------------|
| Utilities | [src/utilities](src/utilities/README.md) |
| Extensions | [src/extensions](src/extensions/README.md) |
| TreeList | [src/treelist](src/treelist/README.md) |
| Events | [src/events](src/events/README.md) |
| IO (file/image helpers) | [src/io](src/io/README.md) |
| Entities (dormant — legacy entity client; the `regira/entities` subpath exists, but its barrel currently exports nothing) | [src/entities](src/entities) |
| Firebase (dormant — Realtime Database REST `EntityService` + `AuthenticationService`) | [src/firebase](src/firebase) |
| Identity (dormant — `IdentityManager`: login/refresh state with auto-refresh, broadcasting via Events) | [src/identity](src/identity) |

> Consuming the library (git install) is covered under **Git import** below.

## Updating

```bash
npx npm-check-updates
npx npm-check-updates -u

npm install

npm audit fix
```

## Publish

Publishing to the npm registry runs through [`.github/workflows/publish-npm.yml`](.github/workflows/publish-npm.yml). Release flow:

1. Bump the version (or verify it already exceeds the last published release):
   ```bash
   npm version patch --no-git-tag-version
   ```
   (`minor`/`major` for feature/breaking releases — see `AGENTS.md` §7.)
2. In `CHANGELOG.md`, turn the **Unreleased** block into a `## <version> — <date>` heading.
3. Commit, then tag and push:
   ```bash
   git tag v<version> && git push origin main v<version>   # <version> = the version in package.json
   ```
   The workflow verifies the tag matches `package.json`, the version is not already on npm, and the
   changelog has the release heading; it then type-checks, tests, builds (via `prepare`), and
   publishes with provenance. It can also be run manually from the Actions tab.

The workflow needs the `NPM_TOKEN` repository secret. For the first publish this must be an
all-packages (or org-scoped) npm access token — a granular token cannot be scoped to a package that
does not exist on the registry yet. After the first publish it can be swapped for a granular token
narrowed to read/write on the `regira` package.

## Git import

https://github.com/Regira/Regira-Modules

*package.json*
```json
  "dependencies": {
    "regira": "github:Regira/Regira-Modules"
  }
```

`package.json` defines full `exports` subpaths, so consumers import the published specifiers directly — no
Vite alias or tsconfig path required:

```ts
import { EntityBase } from "regira/vue/entities"
import { useAxios } from "regira/vue/http"
```

<details><summary>Legacy <code>@/regira</code> alias (opt-in)</summary>

Redundant with the `exports` subpaths above — use it only for an app already written against the
`@/regira/*` specifier.

*vite.config.ts*
```ts
  resolve: {
    alias: [
      // order is important!
      { find: "@/regira", replacement: fileURLToPath(new URL("./node_modules/regira/dist", import.meta.url)) },
      { find: "@", replacement: fileURLToPath(new URL("./src", import.meta.url)) },
    ]
  }
```

*tsconfig.app.json*
```json
  "compilerOptions": {
    "paths": {
      "@/regira/*": ["./node_modules/regira/dist/*"],
      "@/*": ["./src/*"]
    },
  }
```

</details>

## Symlinks (legacy)

```bash
mklink /J "regira" "C:\Projects\Regira\Regira-Modules\src"
```

*vite.config.ts*
```ts
  // ...
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
    preserveSymlinks: true
  },
  // ...
  server: {
    fs: {
      allow: [
        "C:/Projects/Regira" // add to enable symlink...
      ]
    }
  }
```
