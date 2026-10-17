# Regira Online — AI Agent Instructions

The front-end online/offline layer (`@regira/modules/vue/online`): a tiny `useOnlineChecker` composable
plus a Vue plugin that keeps a single reactive `isOnline` ref in sync with the browser and exposes it
app-wide as `$isOnline`. Use it to gate calls to the [entities client](../../entities/ai/entities.instructions.md)
or [HTTP layer](../../http/ai/http.instructions.md) when the network is down.

> **Never guess** a signature — verify in [online.signatures.md](online.signatures.md).

## Writes made while offline

<!-- how_to: key=offline-writes aliases=offline,queue,outbox,reconnect -->

This module detects the connection only: there is no write queue. A request sent offline rejects with an axios
error that has no `response`. An app that must keep such changes persists `{ method, url, body }` and replays them
in order on the window's `online` event, parking 4xx refusals for the user. A queued request answered 401 after a
long offline spell waits for the next sign-in (`onAuthenticated` from `@regira/modules/vue/auth`), since this
library keeps one token.

## Import

```ts
import { useOnlineChecker, plugin } from "@regira/modules/vue/online"
import onlinePlugin from "@regira/modules/vue/online" // default export === plugin
```

There are no granular subpaths — everything is re-exported from the package root.

## The plugin and `$isOnline`

Install the plugin once at startup. It creates one `isOnline` ref (seeded from `navigator.onLine`),
listens to the window `online`/`offline` events to keep it current, and registers it two ways:

```ts
app.use(onlinePlugin)
// in any component option API:  this.$isOnline.value
// in any setup/inject:          inject("isOnline") as Ref<boolean>
```

`$isOnline` is typed on `ComponentCustomProperties`, so `this.$isOnline` is a `Ref<boolean>` in templates
and the Options API. The same ref is also `provide`d under the injection key `"isOnline"`.

## The composable

`useOnlineChecker()` returns `{ isOnline }`: inside a component's `setup` with the plugin installed, the
plugin's live ref; elsewhere, a `Ref<boolean>` initialised from `navigator.onLine`.

```ts
const { isOnline } = useOnlineChecker()
if (!isOnline.value) {
    /* skip the request, show offline UI */
}
```

## Gotchas

- **Live only inside `setup`, with the plugin.** There `useOnlineChecker()` returns the plugin's
  `inject("isOnline")` ref, which the plugin's `online`/`offline` listeners keep current, so the component
  re-renders when the connection changes. Outside `setup` (an event handler, a service, a module), or without
  the plugin, it returns a new ref seeded from `navigator.onLine` once: right at that moment, never updated.
- **Browser-only.** It reads `navigator.onLine` and `window`, so it must run client-side.

## See also

- [online.examples.md](online.examples.md)
- [online.signatures.md](online.signatures.md)
- [HTTP](../../http/ai/http.instructions.md) · [Entities](../../entities/ai/entities.instructions.md) — what you typically gate on the online state
