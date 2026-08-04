# Regira Events — AI Agent Instructions

A tiny event mixin (`regira/events`): an `Event` value object and an `EventHandler` whose
`injectInto(target)` adds a `trigger` / `on` / `once` / `off` API to any object. Regira managers use it
to broadcast state changes — e.g. the [identity manager](../../identity) injects it and fires
`trigger("login" | "refresh" | "logoff", …)` so the app can react.

> **Never guess** a signature — verify in [events.signatures.md](events.signatures.md). The injected
> methods (`on`/`once`/`off`/`trigger`/`listeners`) are added at runtime and do **not** appear in the
> `.d.ts`; their shapes are documented there from source.

## Import

```ts
import { Event, EventHandler } from "regira/events"
// or the default barrel:
import events from "regira/events" // { Event, EventHandler }
```

There are no granular subpaths — only `regira/events` is exported.

## Making an object an emitter

`EventHandler.injectInto(target)` defines `listeners`, `on`, `once`, `off` and `trigger` on `target`.
Inject into a **prototype** to make every instance an emitter (each instance lazily gets its own
listener map):

```ts
class IdentityManager {
    /* … */
}
EventHandler.injectInto(IdentityManager.prototype)
```

Because the injected methods are not on the TS type, cast when calling them:

```ts
;(this as unknown as { trigger(e: string, arg?: unknown): Promise<unknown[]> }).trigger("login", { ...state })
```

## Subscribing

`on(key, callback)` and `on(key, constraint, callback)` register a listener; `once(…)` does the same
but auto-removes after the first matching fire. The argument forms:

- The **first** argument is the event `key`. Space-separate to subscribe to several at once
  (`on("login logoff", cb)` registers the same listener under both keys).
- An empty key (`""`) is a **wildcard** — those listeners run for every `trigger`.
- An optional `constraint(e, arg) => boolean` goes **before** the callback (`on(key, constraint, callback)`)
  and filters whether the callback runs.
- `callback(event, arg) => unknown` may be sync or async; `arg` defaults to `{}`.
- Pass a trailing `{ scope }` object to bind `this` inside the callback and constraint
  (`on(key, callback, { scope })`); without it, `this` is the emitting target.

`on`/`once`/`off` return the target, so calls chain.

## Triggering

`trigger(event, arg?)` accepts an `Event` instance **or** a string (wrapped in `new Event(string)`). It is
**async** and returns `Promise<unknown[]>` — the listeners' results, in registration order. Listeners run
**sequentially** (each awaited before the next), matching `event.type` listeners plus wildcard (`""`)
listeners.

## Unsubscribing

`off(key, listener?)` removes one callback for `key`; called without a `listener` it drops all listeners
for that key. `once` listeners remove themselves before firing.

## The Event object

`new Event(type, src?, data?)` is a plain value object: `type` is the event name, `src` an optional parent
event, and `data` keys are copied onto the event (without overwriting existing properties like `type`/`src`).

## Gotchas

- **Methods aren't typed.** `injectInto` adds members via `Object.defineProperty`, so TS doesn't see
  `on`/`trigger`/etc. on the target — cast (see above) or augment the type yourself.
- **`trigger` swallows listener errors.** A throwing callback is caught, logged via `console.error`, and
  its error is pushed into the results array as a resolved value — the chain keeps going and never rejects.
- **Sequential, not parallel.** Listeners are awaited one after another; a slow async listener delays the
  rest. Order is registration order, with type-specific listeners before wildcard (`""`) listeners.
- **Per-instance listeners.** When injected on a prototype, the `listeners` map is created lazily per
  instance (a non-enumerable `_listeners`), so instances don't share subscriptions.

## See also

- [events.examples.md](events.examples.md) — copy-paste snippets for the basics
- [events.signatures.md](events.signatures.md) — verbatim signatures
- [Identity](../../identity) — a real consumer (`login`/`refresh`/`logoff` events)
- [HTTP](../../vue/http/ai/http.instructions.md) · [Entities](../../entities)
