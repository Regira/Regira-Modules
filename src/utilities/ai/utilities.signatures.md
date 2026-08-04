# Regira JsLib Utilities — API Signatures Reference

Verbatim TypeScript signatures for `regira/utilities`. Do not guess — look up here first.

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
} from "regira/utilities"
```

The root export is the twelve namespaced barrels above (each is the `default` of its file). Four files
also have granular subpaths — `regira/utilities/{array-utility,file-utility,string-utility,promise-utility}`
— whose **named** exports include everything below (the barrel omits the ones marked _(subpath/file only)_).

## arrayUtility — `regira/utilities/array-utility`

```ts
type Comparable = number | string | bigint | boolean
export declare const isArray: (items: unknown) => items is unknown[]
export declare const isIterable: (items: unknown) => boolean
export declare const toArray: <T>(items: T[] | Iterable<T> | Record<string, T> | null | undefined) => T[]
export declare const newArray: (length: number) => undefined[]
export declare const orderBy: <T>(items: Iterable<T>, selector?: (x: T) => unknown) => T[]
export declare const orderByDesc: <T>(items: Iterable<T>, selector?: (x: T) => unknown) => T[]
export declare const naturalSort: <T>(items: Iterable<T>, selector?: (x: T) => string | number) => T[]
export declare const shuffle: <T>(items: Iterable<T>) => T[]
export declare const innerJoin: <T, U = T, R = T>(
    items1: Iterable<T>,
    items2: Iterable<U>,
    selector1?: (x: T) => unknown,
    selector2?: (x: U) => unknown,
    resultSelector?: (x: T, y: U) => R
) => R[]
export declare const groupBy: <T, K = unknown>(items: Iterable<T>, keySelector: (x: T, i?: number, arr?: T[]) => K) => [K, T[]][]
export declare const groupJoin: <T, U, R = [T, U[]]>(
    parentItems: Iterable<T>,
    childItems: Iterable<U>,
    parentKeySelector?: (x: T, i?: number, arr?: T[]) => unknown,
    childSelector?: (x: U, i?: number, arr?: U[]) => unknown,
    resultSelector?: (parent: T, children: U[]) => R
) => R[]
export declare const except: <T, U = T>(items1: Iterable<T>, items2: Iterable<U>, selector1?: (x: T) => unknown, selector2?: (x: U) => unknown) => T[] // subpath/file only
export declare const count: <T>(items: Iterable<T>, predicate?: (x: T) => boolean) => number
export declare const first: <T>(items: Iterable<T>, predicate?: (x: T) => boolean) => T | undefined
export declare const last: <T>(items: Iterable<T>, predicate?: (x: T) => boolean) => T | undefined
export declare const distinctBy: <T>(items: Iterable<T>, selector: (x: T) => unknown) => T[]
export declare const distinct: <T>(items: Iterable<T>) => T[]
export declare const union: <T>(arr1: Iterable<T>, arr2: Iterable<T>) => T[]
export declare const take: <T>(items: Iterable<T>, n: number) => T[]
export declare const skip: <T>(items: Iterable<T>, n: number) => T[]
export declare const page: <T>(items: Iterable<T>, pageSize: number, pageIndex?: number) => T[]
export declare const countPages: (items: Iterable<unknown>, pageSize: number) => number
export declare const min: <T>(items: Iterable<T>, selector?: (x: T) => unknown) => Comparable | undefined
export declare const max: <T>(items: Iterable<T>, selector?: (x: T) => unknown) => Comparable | undefined
export declare const sum: <T>(items: Iterable<T>, selector?: (x: T) => number) => number
export declare const average: <T>(items: Iterable<T>, selector?: (x: T) => number) => number
export declare const toMap: <T, K, V = T>(
    items: Iterable<T>,
    keySelector: (x: T) => K,
    valueSelector?: (item: T, i?: number, map?: Map<K, V>) => V
) => Map<K, V>
export declare const sameContent: <T>(
    items1: Iterable<T> | null | undefined,
    items2: Iterable<T> | null | undefined,
    includeOrder?: boolean
) => boolean
export declare const query: <T>(items: Iterable<T>, filter: Partial<T>) => T[]
export declare const getEnumerator: <T>(arr: T[]) => {
    selectedIndex: number
    readonly length: number
    readonly current: T | undefined
    first(): void
    previous(): boolean
    next(): boolean
    last(): void
}
export declare const move: <T>(arr: T[], item: T, pos: number) => void // mutates arr
export declare const reFill: <T>(arr: T[], values: T[]) => void // mutates arr
```

## stringUtility — `regira/utilities/string-utility`

```ts
export declare const equals: (s1: string, s2: string, ignoreCase?: boolean) => boolean
export declare const contains: (s: string, searchString: string, ignoreCase?: boolean) => boolean
export declare const startsWith: (s: string, searchString: string, ignoreCase?: boolean) => boolean
export declare const endsWith: (s: string, searchString: string, ignoreCase?: boolean) => boolean
export declare const trimLeft: (s: string, chars?: string) => string
export declare const trimRight: (s: string, chars?: string) => string
export declare const trim: (s: string, chars?: string) => string
export declare const replaceAll: (s: string, find: string, replace: string) => string // find is a RegExp source
export declare function randomize(length?: number): string
export declare function newGuid(): string
export declare const newPassword: (length?: number) => string // named export of the string-utility subpath only (not on the barrel's stringUtility)
export declare function isEmail(email: string): boolean
export declare function isUrl(url: string): boolean
export declare function isIP(input: string): boolean
export declare function isPhone(input: string): boolean
export declare function isDate(input: string): boolean
export declare function isPhysicalFolder(value: string): boolean
export declare function isPhysicalPath(value: string): boolean
export declare function formatBelgianPhone(phone: string): string
export declare function htmlEncode(s: string): string
export declare function htmlDecode(s: string): string
export declare function normalizeDiacritics(s: string): string
export declare const capitalize: (s: string) => string
export declare const toKebabCase: (s: string) => string
export declare const toSnakeCase: (s: string) => string
export declare const toTrainCase: (s: string) => string
export declare const toCamelCase: (s: string) => string
export declare const toPascalCase: (s: string) => string
export declare const slugify: (s: string) => string
```

## fileUtility — `regira/utilities/file-utility`

```ts
type NamedBlob = Blob & { name: string }
export declare const browse: ({ multiple, accept }?: { multiple?: boolean; accept?: string | string[] }) => Promise<File[]> // subpath/file only
export declare const isFile: (item: unknown) => item is Blob
export declare const createUrl: (blob: Blob) => string
export declare const revokeUrl: (url: string) => void
export declare const getFilename: (uri: string) => string | undefined
export declare const getExtension: (filename: string) => string
export declare const getFilenameWithoutExtension: (uri: string | undefined) => string | undefined
export declare const toFormData: (files: Blob[], data: Record<string, unknown>, { filesParameterName }?: { filesParameterName?: string }) => FormData
export declare const fileToBlob: (file: File, filename?: string, type?: string) => Promise<NamedBlob>
export declare const base64ToBlob: (base64: string, filename: string, type?: string) => NamedBlob
export declare const urlToBlob: (url: string, filename?: string) => Promise<NamedBlob>
export declare const blobToBase64: (blob: Blob) => Promise<string>
export declare const readAllText: (blob: Blob) => Promise<string>
export declare const writeAllText: (content: string, filename?: string, type?: string) => NamedBlob
export declare const saveAs: (blob: Blob & { name?: string }, filename?: string) => void
export declare const formatFileSize: (bytes: number, si?: boolean, dp?: number) => string
export declare const dropHandler: (e: DragEvent) => File[] // subpath/file only
```

## datetimeUtility

```ts
export declare const isValidDate: (date: unknown) => boolean
export declare const daysDiff: (date1: Date | number | string, date2: Date | number | string) => number // file only
export declare const timer: { last: number; log(dateToCompare?: Date | number | string): number }
export interface CountdownValues {
    days: number
    hours: number
    minutes: number
    seconds: number
}
export declare const countDown: (startDate: Date | number | string, interval?: number) => CountdownValues // sets an interval that is never cleared
export declare const stringifyDate: (date: Date | number) => string | undefined
```

## httpUtility

```ts
export declare const isLocalHost: () => boolean
export declare const isHttps: (url: string | URL) => boolean // file only
export declare const getHttpsUrl: (url: string) => string
export declare const forceHttps: (currentUrl: string) => void
export declare function tryCreateValidURL(input: string): string // file only
export declare const toAbsoluteUrl: (relative: string, baseUrl?: string) => string // file only
export declare const toQueryString: (obj: Record<string, unknown>, includeNulls?: boolean) => string // Date → ISO-8601 + local offset; invalid Date → key omitted
export declare const getQueryStringParams: (url?: string) => { [k: string]: string }
```

## colorUtility

```ts
export declare const rgbToHex: (r: number, g: number, b: number) => string
export declare const hexToRgb: (hex: string, opacity?: number) => { r: number; g: number; b: number; a: number } | undefined
export declare const hexToRgbString: (hex: string, opacity?: number) => string | undefined
export declare const hexToRgbArray: (hex: string, opacity?: number) => number[]
export declare const getRgbString: (input: number[] | string, opacity?: number) => string | undefined
export declare const invertRgb: (r: number, g: number, b: number) => { ri: number; gi: number; bi: number }
export declare const invertHex: (hex: string) => string
export declare const grayscale: (hex: string, type?: string) => string
```

## imageUtility

```ts
export declare const contentTypes: { jpg: string; png: string; gif: string }
export declare const getImageContentType: (img: HTMLImageElement) => Promise<string | undefined>
export declare const parseContentType: (type: string | undefined) => string
export declare const createCanvas: (width: number, height: number, options?: Record<string, unknown> | null) => HTMLCanvasElement // file only
export declare const centerImageOnCanvas: (img: HTMLImageElement) => HTMLCanvasElement // file only
export declare const get2dContext: (canvas: HTMLCanvasElement, options?: Record<string, unknown> | null) => CanvasRenderingContext2D // file only
export declare const clearCanvas: (canvas: HTMLCanvasElement) => void // file only
export declare const addImageToCanvas: (
    canvas: HTMLCanvasElement | null | undefined,
    img: HTMLImageElement,
    { top, left }?: { top?: number; left?: number }
) => HTMLCanvasElement // file only
export declare const urlToImage: (url: string) => Promise<HTMLImageElement>
export declare const blobToImage: (blob: Blob) => Promise<HTMLImageElement>
export declare const imageToBlob: (img: HTMLImageElement, filename?: string, _type?: string) => Promise<Blob & { name: string }>
export declare const canvasToImage: (canvas: HTMLCanvasElement, type?: string, quality?: number) => Promise<HTMLImageElement>
export declare const imageToCanvas: (img: HTMLImageElement, width?: number, height?: number) => HTMLCanvasElement
export declare const canvasToBlob: (canvas: HTMLCanvasElement, type?: string, quality?: number) => Promise<unknown>
export declare const base64ToImage: (data: string) => Promise<HTMLImageElement>
export declare const imageToBase64: (img: HTMLImageElement, type?: string, quality?: number) => string
export declare const resizeByScale: (
    img: HTMLImageElement,
    scale: number,
    { quality, type }?: { quality?: number; type?: string }
) => Promise<HTMLImageElement>
export declare const resize: (
    img: HTMLImageElement,
    maxSize: number | [number, number],
    { quality, type }?: { quality?: number; type?: string }
) => Promise<HTMLImageElement>
export declare const rotate: (img: HTMLImageElement, direction?: number, type?: string) => Promise<HTMLImageElement>
export declare const flip: (img: HTMLImageElement, type?: string) => Promise<HTMLImageElement> // file only
export declare const flop: (img: HTMLImageElement, type?: string) => Promise<HTMLImageElement> // file only
export declare const flipFlop: (img: HTMLImageElement, flip: boolean, flop: boolean, type?: string) => Promise<HTMLImageElement>
export declare const convertType: (img: HTMLImageElement, targetType: string) => Promise<HTMLImageElement>
export declare const getRgbColor: (canvas: HTMLCanvasElement, pos: [number, number]) => { r: number; g: number; b: number } // file only
export declare const getLightness: (img: HTMLImageElement) => number
export declare const white2transparent: (img: HTMLImageElement, tolerance: number) => Promise<HTMLImageElement>
```

## numberUtility

```ts
export declare const naturalCompare: <T>(as: T, bs: T, f: (x: T) => string | number) => number
export declare const getRandom: (min?: number, max?: number) => number
```

## objectUtility

```ts
export declare const isPlainObject: (obj: unknown) => obj is Record<string, unknown>
export declare const flattenObject: (obj: Record<string, unknown>) => Record<string, unknown>
export declare const crawlObject: (obj: Record<string, unknown>, key: string) => unknown
export declare const removeEmpty: (obj: Record<string, unknown>) => Record<string, unknown> // file only
export declare const deepCopy: <T>(obj: T) => T // file only
export declare const mixin: <T extends Record<string, unknown>>(target: T, ...rest: Record<string, unknown>[]) => T
export declare const filterObject: (obj: Record<string, unknown>, filter: Record<string, unknown>) => boolean
```

## htmlUtility

```ts
export declare const redirect: (url: string, delayInSeconds?: number) => void
export interface Offset {
    top: number
    left: number
}
export declare const getAbsOffset: (element: HTMLElement) => Offset // file only
export declare const getAbsScrollPosition: (element: HTMLElement) => Offset // file only
export declare const setMetaTag: (name: string, content: string) => void
export declare const setCanonicalTag: (url: string) => void
```

## promiseUtility — `regira/utilities/promise-utility`

```ts
export declare const debounceToPromise: <T>(func: (...args: unknown[]) => T, wait?: number) => (...args: unknown[]) => Promise<T>
export declare const enqueue: (arr: Array<() => unknown>, throwOnFirstError?: boolean) => Promise<unknown[]> // runs all in order; rejects with the array of all errors, or the first error when throwOnFirstError
export declare const delay: (ms?: number) => Promise<unknown>
```

## clipboardUtility

```ts
export declare function copyTextToClipboard(text: string): Promise<void>
export default copyTextToClipboard // the namespace is the function itself
```

## See also

- [utilities.instructions.md](utilities.instructions.md)
- [Vue HTTP](../../vue/http/ai/http.signatures.md) · [Entities](../../vue/entities/ai/entities.signatures.md)
