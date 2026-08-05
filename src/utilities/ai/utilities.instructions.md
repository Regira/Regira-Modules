# Regira Utilities — AI Agent Instructions

A framework-agnostic helper library (`@regira/modules/utilities`): twelve namespaced barrels covering
arrays (LINQ-like), strings, files/blobs, dates, colors, the DOM, HTTP/URLs, images, numbers, plain
objects, promises, and the clipboard. No Vue dependency — pure browser/TS helpers used across the app and
by the [entities client](../../vue/entities/ai/entities.instructions.md).

> **Never guess** a signature — verify in [utilities.signatures.md](utilities.signatures.md).

## Import

The package default and the named barrels come from the root specifier:

```ts
import {
    arrayUtility,
    colorUtility,
    datetimeUtility,
    fileUtility,
    htmlUtility,
    httpUtility,
    imageUtility,
    numberUtility,
    objectUtility,
    promiseUtility,
    stringUtility,
    clipboardUtility,
} from "@regira/modules/utilities"
```

Four sub-files also have granular subpaths (where you get the **full** named-export set, including
functions the barrel omits — see Gotchas):

```ts
import { except, query, naturalSort } from "@regira/modules/utilities/array-utility"
import { browse, dropHandler, saveAs } from "@regira/modules/utilities/file-utility"
import { newPassword, slugify, isEmail } from "@regira/modules/utilities/string-utility"
import { debounceToPromise, enqueue, delay } from "@regira/modules/utilities/promise-utility"
```

Each barrel is also its file's default export, so `import arrayUtility from "@regira/modules/utilities/array-utility"` works too.

## Arrays (`arrayUtility`)

LINQ-style helpers that accept any `Iterable<T>` and return a **new array** (pure), e.g. `orderBy`,
`orderByDesc`, `naturalSort`, `distinct`/`distinctBy`, `groupBy`, `innerJoin`/`groupJoin`, `union`,
`take`/`skip`/`page`, `min`/`max`/`sum`/`average`, `toMap`, `sameContent`, `query` (filter by a
`Partial<T>` shape). `toArray` normalizes arrays, iterables, or plain objects (`Object.values`) into a
`T[]`. `move` and `reFill` mutate the array in place. The granular subpath also exports `except`.

## Strings (`stringUtility`)

Case-insensitive comparisons (`equals`, `contains`, `startsWith`, `endsWith` with an `ignoreCase` flag),
char-set `trim`/`trimLeft`/`trimRight`, `replaceAll`, validators (`isEmail`, `isUrl`, `isIP`, `isPhone`,
`isDate`, `isPhysicalPath`/`isPhysicalFolder`), generators (`randomize`, `newGuid`, `newPassword`), case
converters (`capitalize`, `toKebabCase`/`toSnakeCase`/`toTrainCase`/`toCamelCase`/`toPascalCase`,
`slugify`), `normalizeDiacritics`, `htmlEncode`/`htmlDecode`, and `formatBelgianPhone`.

## Files & blobs (`fileUtility`)

Blob/File conversions (`fileToBlob`, `base64ToBlob`, `urlToBlob`, `blobToBase64`, `readAllText`,
`writeAllText`), object-URL lifecycle (`createUrl`/`revokeUrl`), filename parsing (`getFilename`,
`getExtension`, `getFilenameWithoutExtension`), `toFormData` (files + extra fields; `filesParameterName`
defaults to `"files"`), `saveAs` (triggers a browser download), and `formatFileSize`. The granular subpath
adds `browse` (open the native file picker → `Promise<File[]>`) and `dropHandler` (extract files from a
drop `DragEvent`).

## Dates (`datetimeUtility`)

`isValidDate`, `stringifyDate` (ISO string preserving the local timezone offset, no UTC shift), `timer`
(a shared stopwatch — `timer.log()` returns ms since the last call), and `countDown`. The granular file
also exports `daysDiff`.

## HTTP & URLs (`httpUtility`)

`toQueryString(obj, includeNulls?)` (nested objects → `key[child]`, arrays → repeated keys; nulls dropped
unless `includeNulls`; a `Date` → ISO-8601 with the local offset, an **invalid** `Date` → key omitted), `getQueryStringParams`, `isLocalHost`, `getHttpsUrl`/`forceHttps`. The source file
also exports `isHttps`, `tryCreateValidURL`, and `toAbsoluteUrl`. For the app's actual request layer use
[`@regira/modules/vue/http`](../../vue/http/ai/http.instructions.md) instead.

## Other namespaces

- **`colorUtility`** — hex/rgb conversions (`rgbToHex`, `hexToRgb`, `hexToRgbString`, `hexToRgbArray`,
  `getRgbString`), `invertHex`/`invertRgb`, `grayscale`.
- **`imageUtility`** — `HTMLImageElement`/canvas/blob/base64 conversions, plus `resize`, `resizeByScale`,
  `rotate`, `flipFlop`, `convertType`, `getLightness`, `white2transparent`. The granular source also
  exposes lower-level canvas helpers (`createCanvas`, `get2dContext`, `addImageToCanvas`, `flip`/`flop`, …).
- **`numberUtility`** — `getRandom(min?, max?)`, `naturalCompare`.
- **`objectUtility`** — `isPlainObject`, `flattenObject`, `crawlObject`, `mixin`, `filterObject`; the
  source file also exports `removeEmpty` and `deepCopy`.
- **`htmlUtility`** — `redirect`, `setMetaTag`, `setCanonicalTag` (source adds `getAbsOffset`,
  `getAbsScrollPosition`).
- **`promiseUtility`** — `delay(ms?)`, `enqueue` (run async fns in order), `debounceToPromise`.
- **`clipboardUtility`** — default export `copyTextToClipboard(text)`; uses `navigator.clipboard` with a
  `document.execCommand("copy")` fallback.

## Gotchas

- **Barrel ≠ full export set.** The default per-namespace object omits some functions present in the
  source: `arrayUtility` drops `except`; `fileUtility` drops `browse`/`dropHandler`; `stringUtility`
  drops `newPassword`; `httpUtility` drops `isHttps`/`tryCreateValidURL`/`toAbsoluteUrl`;
  `objectUtility` drops `removeEmpty`/`deepCopy`; `datetimeUtility` drops `daysDiff`; `htmlUtility`
  drops the offset helpers; `imageUtility` drops the low-level canvas helpers. Only four granular
  subpaths are published (`array-utility`, `file-utility`, `promise-utility`, `string-utility`) —
  `except`, `browse`/`dropHandler`, and `newPassword` are importable as named exports from theirs; the
  other omitted functions have no published subpath and are internal (not importable from the package).
- **`stringUtility.replaceAll(s, find, replace)`** builds `new RegExp(find, "g")` — `find` is a **regex**,
  so escape metacharacters (`.`, `(`, `*`, …) if you mean them literally.
- **`datetimeUtility.countDown`** starts a `setInterval` that is **never cleared** and mutates the returned
  object in place; treat it as a fire-and-forget live ticker, not a one-shot calculation.
- **`datetimeUtility.timer`** is a single shared module-level object — interleaved `timer.log()` calls from
  different code paths affect each other's `last`.
- **DOM-dependent.** `htmlUtility`, `imageUtility`, `clipboardUtility`, `fileUtility.saveAs`/`browse`, and
  `httpUtility.isLocalHost`/`forceHttps` require a browser (`window`/`document`/`navigator`).

## See also

- [utilities.examples.md](utilities.examples.md) — copy-paste basics grounded in the demo apps
- [utilities.signatures.md](utilities.signatures.md) — verbatim signatures
- [Vue HTTP](../../vue/http/ai/http.instructions.md) — the app's request layer (uses these helpers)
- [Entities](../../vue/entities/ai/entities.instructions.md) — main consumer of array/object/string helpers
