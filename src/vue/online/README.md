# Regira Online (front-end)

`@regira/modules/vue/online` — online/offline detection for the app: the `useOnlineChecker` composable
plus a Vue plugin that keeps one reactive `isOnline` ref in sync with the browser and exposes it
app-wide as `$isOnline`. Use it to gate calls to the [HTTP layer](../http/README.md) and
[entities client](../entities/README.md) when the network is down.

## What it provides

| Export                             | Purpose                                                                                                                         |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `plugin` (also the default export) | Vue plugin: creates one `isOnline` ref, wires `online`/`offline` listeners, registers `$isOnline` and `provide("isOnline", …)`. |
| `useOnlineChecker()`               | Composable returning `{ isOnline }`: the plugin's live ref inside `setup`, else a ref seeded from `navigator.onLine`.           |
| `IsOnline`                         | The `{ isOnline: Ref<boolean> }` return type of `useOnlineChecker`, exported from the barrel.                                   |
| `$isOnline`                        | `Ref<boolean>` on `ComponentCustomProperties` — available in templates and the Options API after the plugin is installed.       |

> Note: inside a component's `setup` with the plugin installed, `useOnlineChecker()` returns the
> plugin's live ref. Elsewhere, or without the plugin, each call returns a **fresh, one-time snapshot**
> ref that never updates: the `online`/`offline` listeners are wired only to the plugin's own instance.

## Writes made while offline

The module detects the connection only: there is no write queue. A request sent offline rejects with an axios
error that has no `response`. An app that must keep such changes persists `{ method, url, body }` and replays them
in order on the window's `online` event, parking 4xx refusals for the user. A queued request answered 401 after a
long offline spell waits for the next sign-in (`onAuthenticated` from `@regira/modules/vue/auth`), since the
library keeps one token.
