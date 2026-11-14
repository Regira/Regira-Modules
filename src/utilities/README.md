# Regira Utilities (front-end)

`@regira/modules/utilities` — a framework-agnostic helper library exposed as twelve namespaced barrels
(arrays, strings, files, dates, colors, DOM, HTTP/URLs, images, numbers, objects, promises, clipboard).
No Vue dependency; used throughout the app and by the [entities client](../vue/entities/README.md).

## What it provides

| Export             | Purpose                                                                                                       |
| ------------------ | ------------------------------------------------------------------------------------------------------------- |
| `arrayUtility`     | LINQ-like iterable helpers: `orderBy`, `groupBy`, `distinct`, `innerJoin`, `page`, `sum`, `toMap`, `query`, … |
| `stringUtility`    | Compare/trim/case-convert, validators (`isEmail`/`isUrl`/…), `slugify`, `newGuid`, `normalizeDiacritics`.     |
| `fileUtility`      | Blob/File/base64/url conversions, `toFormData`, `saveAs`, `formatFileSize` (+ `browse`/`dropHandler`).        |
| `datetimeUtility`  | `isValidDate`, `stringifyDate` (timezone-preserving), `timer`, `countDown`.                                   |
| `httpUtility`      | `toQueryString`, `getQueryStringParams`, `getHttpsUrl`/`forceHttps`, `isLocalHost`.                           |
| `colorUtility`     | Hex ⇄ rgb conversions, `invertHex`, `grayscale`.                                                              |
| `imageUtility`     | `HTMLImageElement`/canvas/blob conversions, `resize`, `rotate`, `convertType`, `white2transparent`.           |
| `numberUtility`    | `getRandom`, `naturalCompare`.                                                                                |
| `objectUtility`    | `isPlainObject`, `flattenObject`, `crawlObject`, `mixin`, `filterObject`.                                     |
| `promiseUtility`   | `delay`, `enqueue`, `debounceToPromise`.                                                                      |
| `htmlUtility`      | `redirect`, `setMetaTag`, `setCanonicalTag`.                                                                  |
| `clipboardUtility` | The copy function itself — `clipboardUtility(text)` (clipboard API with `execCommand` fallback).              |

`array-utility`, `file-utility`, `string-utility`, and `promise-utility` also have granular subpaths
(e.g. `@regira/modules/utilities/array-utility`); the array/file/string subpaths' named exports include a few
functions the barrel object omits (e.g. `browse`/`dropHandler`, `newPassword`) — see the reference.
`object-utility` has no subpath, so its source-only named exports `deepCopy` and `removeEmpty` are
internal: they are not reachable from the published package.

## Images (`imageUtility`)

- **`resizeByScale(img, scale, options?)`** lets the browser scale: a first draw takes the source straight to a
  canvas no larger than 4096 px per side (the largest one iOS Safari still draws), and each further draw halves it
  until it lands on the target size. A phone's full-size photo scales like any other; transparency is kept for a
  type that has it (`options.type`; the default is JPEG), and a JPEG gets a white background. The target canvas is
  not capped, so a target above 4096 px per side is blank on iOS Safari. `ImageHelper.resize` uses it.
- **`imageToBlob(img, filename?, type?)`** makes no request when the page holds the image's bytes: an image of
  `blobToImage` answers the Blob it was made from (unless another `type` is asked), and a `data:` source is decoded —
  base64, or URL-encoded text such as SVG; binary bytes must be base64. Any other `blob:` source is drawn to a canvas
  and encoded as `type` (default `image/png`). Any other URL is fetched. So a `Content-Security-Policy` whose `connect-src` leaves out `data:` and `blob:` does not stop it.
- **`blobToImage(blob)`** releases its object URL once the image has loaded or failed to. The image keeps its
  pixels, so it draws and converts like any other, but its `src` loads nothing more: to show the Blob, give it a
  URL of your own (`URL.createObjectURL`, revoked when done).
