# Regira Extensions — Examples

Verify signatures in [extensions.signatures.md](extensions.signatures.md). Nothing is patched on import — each extension is
applied only when you call its `use()` enabler.

## Serialize dates without timezone shift (startup)

Every Regira demo app does exactly this in `main.ts` so `JSON.stringify(date)` emits the local wall-clock
value the back-end expects (instead of the native UTC conversion):

```ts
import dateSerializer from "regira/extensions/date-extensions"
dateSerializer.use() // overrides Date.prototype.toJSON
```

## Enable all three at once

The barrel default bundles convenience enablers — call them once, early, before any code relies on the
new prototype members:

```ts
import extensions from "regira/extensions"
extensions.useArrayExtensions() // Array.prototype gains orderBy/groupBy/sum/…
extensions.useDateExtensions() // Date.prototype.toJSON (local time)
extensions.usePromiseExtensions() // Promise.debounce / Promise.enqueue
```

## Use the array helpers in code

After `useArrayExtensions()`, `array-utility` helpers are available as instance methods; each calls the
utility with the array as the first argument (`arr.orderBy(fn)` ≡ `orderBy(arr, fn)`):

```ts
const byName = vehicles.orderBy((v) => v.name) // T[]
const total = invoices.sum((i) => i.amount) // number
const groups = interventions.groupBy((i) => i.supplierId) // [K, T[]][]
```

## Debounce an async call

After `usePromiseExtensions()`, `Promise.debounce` wraps a function so rapid calls collapse into one; every
call returns a promise that resolves to the final invoked value. The wrapped function is typed
`(...args: unknown[]) => T`, so narrow the args inside:

```ts
const search = Promise.debounce((q) => api.search(q as string), 300)
await search("blue") // only the last call within 300ms actually runs
```

## See also

- [extensions.instructions.md](extensions.instructions.md) · [extensions.signatures.md](extensions.signatures.md)
