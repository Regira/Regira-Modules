# Regira JsLib Events — API Signatures Reference

Verbatim TypeScript signatures for `regira/events`. Do not guess — look up here first.

```ts
import { Event, EventHandler } from "regira/events"
// default barrel: import events from "regira/events"  // { Event, EventHandler }
```

## Event

```ts
declare class Event {
    type: string
    src?: Event;
    [key: string]: unknown
    constructor(type: string, src?: Event, data?: Record<string, unknown>)
}
export default Event
```

## EventHandler

```ts
declare class EventHandler {
    static injectInto(target: object): void
}
export default EventHandler
```

## Injected runtime API

`injectInto(target)` defines these members on `target`. They are **not** in the `.d.ts` — the shapes below
are taken from source (`src/events/event-handler.ts`):

```ts
// callback / constraint shapes
type EventCallback = (event: Event, arg?: unknown) => unknown
type ConstraintFn = (e: unknown, arg?: unknown) => boolean

interface Injected {
    listeners: Record<string, Listener[]> // lazy per-instance map (getter)
    on(key: string, ...args: unknown[]): this // (callback) | (constraint, callback); optional trailing { scope }
    once(key: string, ...args: unknown[]): this // same as on, but auto-removed after first fire
    off(key: string, listener?: EventCallback): this // omit listener to drop all for key
    trigger(e: Event | string, arg?: unknown): Promise<unknown[]> // async; results in registration order
}
```

## See also

- [events.instructions.md](events.instructions.md) — usage and gotchas
