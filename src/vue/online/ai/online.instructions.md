# Regira Online — AI Agent Instructions

The front-end online/offline layer (`@regira/modules/vue/online`): one reactive `isOnline` ref, kept in
sync with the browser, which the `useOnlineChecker` composable returns and a Vue plugin exposes app-wide as
`$isOnline`. Use it to gate calls to the [entities client](../../entities/ai/entities.instructions.md)
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

Install the plugin once at startup. It registers the shared `isOnline` ref (below) two ways:

```ts
app.use(onlinePlugin)
// in any component option API:  this.$isOnline.value
// in any setup/inject:          inject("isOnline") as Ref<boolean>
```

`$isOnline` is typed on `ComponentCustomProperties`, so `this.$isOnline` is a `Ref<boolean>` in templates
and the Options API. The same ref is also `provide`d under the injection key `"isOnline"`.

## The composable

`useOnlineChecker()` returns `{ isOnline }`: one ref for the whole app, the same in a component's `setup`, a
store, a service or a module, with or without the plugin. It is made on first use, seeded from `navigator.onLine`,
and follows the window's `online`/`offline` events from then on.

```ts
const { isOnline } = useOnlineChecker()
if (!isOnline.value) {
    /* skip the request, show offline UI */
}
```

## Gotchas

- **Writable, on purpose.** `navigator.onLine` only knows whether there is a network, not whether the API
  answers. An app that knows better sets the shared ref from its requests — `false` on a request that got no
  response, `true` on the next answer — and every reader, `$isOnline` included, sees it. The browser's next
  `online`/`offline` event sets it again.
- **Inside `setup`, an app's own `provide("isOnline", …)` wins.** The composable injects `"isOnline"` first; the
  plugin provides the shared ref there, so with the plugin both are the same.
- **No side effect at import.** The ref and its listeners are made on the first `useOnlineChecker()` (or the
  plugin's install); on the server, without a `window`, it is `true` and wires nothing.

## See also

- [online.examples.md](online.examples.md)
- [online.signatures.md](online.signatures.md)
- [HTTP](../../http/ai/http.instructions.md) · [Entities](../../entities/ai/entities.instructions.md) — what you typically gate on the online state
