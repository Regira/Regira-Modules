# Regira IO — AI Agent Instructions

Browser file and image helpers (`@regira/modules/io`): two classes, `FileHelper` and `ImageHelper`
(which extends it). `FileHelper` normalises a `File`, `Blob`, URL, or base64 string into a `Blob` and
covers browse/download/upload/JSON; `ImageHelper` adds canvas-based image transforms (resize, rotate,
flip, convert). They wrap the lower-level `@regira/modules/utilities` file/image utilities and are
DOM-dependent — they only run in the browser.

> **Never guess** a signature — verify in [io.signatures.md](io.signatures.md).

## Import

```ts
import { FileHelper, ImageHelper } from "@regira/modules/io"
```

Both are named exports; the package root also default-exports `{ FileHelper, ImageHelper }`. There are
no granular subpaths — everything is re-exported from `@regira/modules/io` above. Instantiate per use:
`const files = new FileHelper()`, `const images = new ImageHelper()`.

## FileHelper

The central method is **`getBlob(input, filename?, type?)`**, which every other method routes through. It
accepts a `File`, a `Blob`, an http(s) URL string (fetched via `fetch`, filename read from the
`content-disposition` header), or a base64/data-URL string, and always resolves to a `Blob` (with a
`name` set when a filename is available).

- **`browse(options?)`** → `Promise<File[]>` — opens a hidden `<input type="file">` and resolves with
  the picked files. `options.multiple` defaults to `true`; `options.accept` is a string or string[]
  (joined with commas).
- **`getBase64Url(input)`** / **`createUrl(input)`** → `Promise<string>` — both return a base64 **data
  URL** (`reader.readAsDataURL`). See gotchas: `createUrl` is _not_ `URL.createObjectURL`.
- **`readJson(blob)`** → `Promise<any>` — reads the blob as text and `JSON.parse`s it.
- **`writeJson(object, filename)`** → `Promise<Blob & { name }>` — pretty-prints (2-space) to an
  `application/json` named blob.
- **`send(url, files, data?, options?)`** → `Promise<AxiosResponse>` — `multipart/form-data` upload via
  axios. `options.method` defaults to `"POST"`; extra fields go in `data`; the files field name comes
  from `options.filesParameterName`.
- **`saveAs(input, type?, filename?)`** → `Promise<void>` — converts via `getBlob` then triggers a
  browser download (falls back to the input's own `name`/`type`, then `"file"`).

## ImageHelper

`ImageHelper extends FileHelper`, so all of the above is available. It overrides `getBlob` to also accept
`HTMLImageElement` and `HTMLCanvasElement`, and adds `getImage(input)` → `Promise<HTMLImageElement>`
(input may be an image, URL, `Blob`, or canvas). Transform methods take the same `ImageInput` union and
resolve to a new `HTMLImageElement`:

- **`resize(input, max, options?)`** — scales so the longest side is at most `max` (never upscales);
  `options.quality` / `options.type` tune the output.
- **`rotate(input, direction)`** — `input` is a `Blob`; `direction` is degrees.
- **`flipHorizontally(input)`** / **`flipVertically(input)`** / **`flipFlop(input, flip?, flop?, type?)`** —
  mirror on one or both axes.
- **`convertType(input, targetType)`** — re-encode to a MIME type (e.g. `"image/png"`).
- **`getLightness(input)`** → `Promise<number>`; **`white2transparent(input, tolerance?)`** — knock out
  near-white pixels (`tolerance` defaults to `0`).

## Gotchas

- **`createUrl` returns a data URL, not an object URL.** Both `createUrl` and `getBase64Url` delegate to
  `blobToBase64` and are effectively identical — neither calls `URL.createObjectURL`. For a revocable
  object URL use `createUrl`/`revokeUrl` from `@regira/modules/utilities/file-utility` instead.
- **`send` uses a bare axios call, not the shared instance.** Unlike `upload` in
  [`@regira/modules/vue/http`](../../vue/http/ai/http.instructions.md), `FileHelper.send` imports `axios`
  directly, so it gets **no `baseURL`, credentials, or auth interceptor** — pass an absolute URL, or
  prefer the http module's `upload` when those are needed.
- **Default upload field name.** `send` only forwards `filesParameterName` when you set it; the
  underlying `toFormData` then defaults the field to `"files"` (note: `vue/http`'s `upload` defaults to
  `"file"`).
- **Browser-only.** Every method touches `document`, `FileReader`, `Blob`, `fetch`, or `<canvas>`; there
  is no SSR/Node fallback.

## See also

- [io.examples.md](io.examples.md) — short, focused usage snippets
- [io.signatures.md](io.signatures.md) — verbatim signatures
- [HTTP](../../vue/http/ai/http.instructions.md) — the shared axios instance and its `upload`/`getFile` helpers
- [Entities](../../vue/entities/ai/entities.instructions.md) — entity attachments are the main consumer of file blobs
