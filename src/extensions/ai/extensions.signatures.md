# Regira Extensions — API Signatures Reference

Verbatim TypeScript signatures for `@regira/modules/extensions`. Do not guess — look up here first.

```ts
import extensions, { arrayExtensions, dateExtensions, promiseExtensions } from "@regira/modules/extensions"
import dateExtensions from "@regira/modules/extensions/date-extensions" // granular subpath
```

## Barrel (index.d.ts)

```ts
export { default as arrayExtensions } from "./array-extensions"
export { default as dateExtensions } from "./date-extensions"
export { default as promiseExtensions } from "./promise-extensions"
declare const _default: {
    useArrayExtensions: (overwrite?: boolean) => void
    useDateExtensions: () => void
    usePromiseExtensions: () => void
}
export default _default
```

## arrayExtensions (array-extensions.d.ts)

```ts
declare const _default: {
    injectInto(target: object, overwrite?: boolean): void
    use(overwrite?: boolean): void
}
export default _default
```

Injected onto `Array.prototype` (each method calls the matching `array-utility` function with the array as
the first argument): `orderBy`, `orderByDesc`, `naturalSort`, `shuffle`, `innerJoin`, `groupBy`,
`groupJoin`, `count`, `first`, `last`, `distinctBy`, `distinct`, `union`, `take`, `skip`,
`page`, `countPages`, `min`, `max`, `sum`, `average`, `toMap`, `sameContent`, `query`, `getEnumerator`,
`move`, `reFill`. (Not injected: `isArray`, `isIterable`, `toArray`, `newArray`.) See
[`utilities/array-utility`](../../utilities/array-utility) for each signature.

## dateExtensions (date-extensions.d.ts)

```ts
declare const _default: {
    use(): void
}
export default _default
```

`use()` sets `Date.prototype.toJSON` to a function backed by `stringifyDate` (no timezone correction):

```ts
// from utilities/datetime-utility
export declare const stringifyDate: (date: Date | number) => string | undefined
```

## promiseExtensions (promise-extensions.d.ts)

```ts
import { debounceToPromise, enqueue } from "../utilities/promise-utility"
declare global {
    interface PromiseConstructor {
        debounce: typeof debounceToPromise
        enqueue: typeof enqueue
    }
}
declare const _default: {
    use(): void
}
export default _default
```

`use()` assigns these statics on the `Promise` constructor:

```ts
// from utilities/promise-utility
export declare const debounceToPromise: <T>(func: (...args: unknown[]) => T, wait?: number) => (...args: unknown[]) => Promise<T>
export declare const enqueue: (arr: Array<() => unknown>, throwOnFirstError?: boolean) => Promise<unknown[]>
```

## See also

- [extensions.instructions.md](extensions.instructions.md)
