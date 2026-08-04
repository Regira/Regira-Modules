# Regira Events — Examples

Verify signatures in [events.signatures.md](events.signatures.md).

## Make an object an emitter

`EventHandler.injectInto(target)` adds `on`/`once`/`off`/`trigger` to `target`. Inject into a
**prototype** so every instance is an emitter (this is exactly what the identity manager does):

```ts
import { EventHandler } from "regira/events"

class IdentityManager {
    async login(email: string, password: string) {
        // ... authenticate, update this.state ...
        // injected methods aren't on the TS type, so cast when calling:
        return (this as unknown as { trigger(e: string, arg?: unknown): Promise<unknown[]> }).trigger("login", { ...this.state })
    }
}
EventHandler.injectInto(IdentityManager.prototype)
```

## Subscribe and unsubscribe

`on(key, callback)` registers a listener and returns the target, so calls chain. `off` removes it.

```ts
const mgr = new IdentityManager(/* ... */) as any

const onLogin = (e, arg) => console.log("logged in", arg)
mgr.on("login", onLogin).on("logoff", () => console.log("logged out"))

// later: stop listening to one callback (omit it to drop all "login" listeners)
mgr.off("login", onLogin)
```

## Listen once, or to several events at once

`once(...)` auto-removes after the first matching fire. Space-separate the key to register the same
listener under multiple events:

```ts
mgr.once("refresh", () => console.log("token refreshed (fires only once)"))

// one listener for both "login" and "logoff":
mgr.on("login logoff", (e) => console.log("auth changed:", e.type))
```

## Trigger with an Event object

`trigger` accepts a string (wrapped in `new Event(string)`) or an `Event` you build yourself. The
`data` keys are copied onto the event, and `trigger` is async — it returns the listeners' results:

```ts
import { Event } from "regira/events"

mgr.on("login", (e) => `welcome ${e.email}`) // e.email comes from the data below

const results = await (mgr as any).trigger(new Event("login", undefined, { email: "bram@regira.com" }))
// results === ["welcome bram@regira.com"], in registration order
```

## See also

- [events.instructions.md](events.instructions.md) · [events.signatures.md](events.signatures.md)
