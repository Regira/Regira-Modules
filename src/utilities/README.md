# Regira Utilities (front-end)

`regira/utilities` — a framework-agnostic helper library exposed as twelve namespaced barrels
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
| `objectUtility`    | `isPlainObject`, `flattenObject`, `mixin`, `filterObject` (+ `deepCopy`/`removeEmpty`).                       |
| `promiseUtility`   | `delay`, `enqueue`, `debounceToPromise`.                                                                      |
| `htmlUtility`      | `redirect`, `setMetaTag`, `setCanonicalTag`.                                                                  |
| `clipboardUtility` | `copyTextToClipboard` (clipboard API with `execCommand` fallback).                                            |

`array-utility`, `file-utility`, `string-utility`, and `promise-utility` also have granular subpaths
(e.g. `regira/utilities/array-utility`) whose named exports include a few functions the barrel
object omits — see the reference.
