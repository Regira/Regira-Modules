# Regira JsLib HTTP — AI Agent Instructions

The front-end HTTP layer (`regira/vue/http`): one shared axios instance plus file and
query-string helpers. The [entities client](../../entities/ai/entities.instructions.md) and the auth
plugin are both built on this single instance.

> **Never guess** a signature — verify in [http.signatures.md](http.signatures.md). Examples:
> [http.examples.md](http.examples.md).

## Import

```ts
import { initAxios, useAxios, getFile, upload, createQueryString, type AxiosWithFilesInstance } from "regira/vue/http"
```

## The shared instance

Call **`initAxios({ api, includeCredentials })` once** at app startup (after loading runtime config). It
`axios.create`s an instance with `baseURL = api` and `withCredentials = includeCredentials`, attaches
the `getFile`/`upload` helpers, installs a blob-error interceptor (see gotchas), stores it in a
module-level singleton, and returns it (`AxiosWithFilesInstance`). Everything else in the app uses that
one instance — register it in the IoC container and let the auth plugin layer the bearer interceptor onto it:

```ts
const axios = initAxios({ api: appConfig.api, includeCredentials: appConfig.includeCredentials })
app.use(servicesPlugin, { configure: (sp) => sp.add("axios", () => axios) }) // see regira_modules.vue.ioc
```

`useAxios()` returns the singleton from anywhere; it **throws if `initAxios` has not run yet**, so only
call it after startup.

## File download / upload

Both are attached to the instance _and_ exported as functions:

- **`getFile(url, method?, filename?, type?)`** → `Promise<Blob>`. Requests with `responseType: "blob"`.
  If `type`/`filename` are omitted it reads them from the `content-type` / `content-disposition` headers,
  and sets `blob.name` to the resolved filename.
- **`upload(url, files, options?)`** → `Promise<AxiosResponse>`. Sends `multipart/form-data`; the files
  field name defaults to `"file"` (`options.filesParameterName`); `options.data` adds extra form fields;
  `options.method` defaults to `"POST"`.

## Query strings

`createQueryString(obj)` → `URLSearchParams`, appending **array values as repeated keys**
(`includes=A&includes=B`). The entities service uses it to build list/search URLs.

⚠️ **A `Date` serializes as ISO-8601 with the local offset** (`2026-07-29T07:00:00.000+02:00`) — the same
wall-clock convention `dateExtensions.use()` gives request bodies, and what ASP.NET Core's `DateTime` binder
expects. This has to happen here: a body goes through `JSON.stringify` (so `Date.prototype.toJSON` applies),
a query string never does, so the default coercion would emit `"Wed Jul 29 2026 07:00:00 GMT+0200 (…)"` and
the request would 400 at model binding. An **invalid** `Date` omits its key rather than sending `?from=`,
which the server would bind to `default`.

## Gotchas

- **Init before use.** `useAxios()` throws when uninitialized — its error text mistakenly says
  `initApiAxios`; the real function is `initAxios`.
- **Blob errors.** When a request uses `responseType: "blob"` and the server returns a JSON error, the
  response interceptor parses the blob back to JSON so error handlers see the real payload (not a Blob).
- **One instance.** Do not `axios.create` your own — register and reuse the `initAxios` instance so auth
  and credentials apply uniformly.

## See also

- [http.signatures.md](http.signatures.md) · [http.examples.md](http.examples.md)
- [regira_modules.vue.ioc](../../ioc/ai/ioc.instructions.md) — where the instance is registered
- [Entities](../../entities/ai/entities.instructions.md) — the main consumer
