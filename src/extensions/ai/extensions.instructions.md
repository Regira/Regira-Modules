# Regira JsLib Extensions — AI Agent Instructions

Opt-in prototype extensions for `Array`, `Date`, and `Promise` (`regira/extensions`). Nothing is
patched on import — each extension is applied **explicitly** by calling a `use()` method, so the app
controls when (and whether) globals are touched. The array and promise helpers are thin wrappers over
[`regira/utilities`](../../utilities/array-utility) (`array-utility`, `promise-utility`,
`datetime-utility`).

> **Never guess** a signature — verify in [extensions.signatures.md](extensions.signatures.md).

## Import

```ts
// barrel: per-prototype objects + a default with the three enabler functions
import extensions, { arrayExtensions, dateExtensions, promiseExtensions } from "regira/extensions"

// granular subpath (only date-extensions is exported individually)
import dateExtensions from "regira/extensions/date-extensions"
```

The default export bundles `useArrayExtensions(overwrite?)`, `useDateExtensions()`, and
`usePromiseExtensions()` — convenience wrappers around the matching `use()` methods.

## Enabling at startup

Call the enablers once, early (before code relies on the new prototype members):

```ts
import extensions from "regira/extensions"
extensions.useArrayExtensions() // Array.prototype
extensions.useDateExtensions() // Date.prototype.toJSON
extensions.usePromiseExtensions() // Promise.debounce / Promise.enqueue
```

## Array extensions

`arrayExtensions.use(overwrite = false)` calls `injectInto(Array.prototype, overwrite)`, which copies the
`array-utility` functions onto the target as instance methods. Each injected method calls the underlying
utility with the array (`this`) as the first argument, so `arr.orderBy(x => x.name)` ≡
`orderBy(arr, x => x.name)`. Available methods: `orderBy`, `orderByDesc`, `naturalSort`, `shuffle`,
`innerJoin`, `groupBy`, `groupJoin`, `count`, `first`, `last`, `distinctBy`, `distinct`,
`union`, `take`, `skip`, `page`, `countPages`, `min`, `max`, `sum`, `average`, `toMap`, `sameContent`,
`query`, `getEnumerator`, `move`, `reFill`. (`isArray`, `isIterable`, `toArray`, `newArray` are **not**
injected.) Pass `overwrite = true` to replace members that already exist on the prototype; by default
existing members are left untouched.

## Date extensions

`dateExtensions.use()` replaces `Date.prototype.toJSON` with one backed by `stringifyDate`, which
serializes the date **without timezone correction** (unlike the native `toJSON`, which converts to UTC).
This makes `JSON.stringify(new Date())` emit the local wall-clock value, matching what the Regira
back-end expects.

## Promise extensions

`promiseExtensions.use()` adds two **static** members to the `Promise` constructor:

- `Promise.debounce(func, wait?)` — wraps `func` in a debouncer; every call returns a promise and they all
  resolve to the final invoked value (see `debounceToPromise`).
- `Promise.enqueue(arr, throwOnFirstError?)` — runs an array of (async) functions in order, resolving to the
  array of results. By default it runs them all and rejects with the array of every error; pass
  `throwOnFirstError` to stop at and reject with the first error.

## Gotchas

- **Nothing happens on import.** Importing the module does not patch any prototype — you must call the
  `use()`/enabler explicitly, or the new members will be `undefined`.
- **Array injection skips existing members.** By default `injectInto` only adds a method when the target
  doesn't already have that property; pass `overwrite = true` to force replacement (e.g. if a future JS or
  another lib defines `Array.prototype.group`).
- **`toJSON` is overwritten outright.** `dateExtensions.use()` always replaces `Date.prototype.toJSON`
  (no overwrite guard). Local serialization is intentional — do not call it if you actually want UTC
  output.
- **Static, not instance.** The promise extensions live on the `Promise` constructor
  (`Promise.debounce`), not on promise instances.

## See also

- [extensions.examples.md](extensions.examples.md) — copy-paste snippets
- [extensions.signatures.md](extensions.signatures.md) — verbatim signatures
- [regira_modules.vue.http](../../vue/http/ai/http.instructions.md) · [regira_modules.vue.entities](../../vue/entities/ai/entities.instructions.md)
