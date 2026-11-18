# Regira Online (front-end)

`@regira/modules/vue/online` — online/offline detection for the app: one reactive `isOnline` ref, kept in
sync with the browser, which the `useOnlineChecker` composable returns and a Vue plugin exposes app-wide as
`$isOnline`. Use it to gate calls to the [HTTP layer](../http/README.md) and
[entities client](../entities/README.md) when the network is down.

## What it provides

| Export                             | Purpose                                                                                                                   |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `plugin` (also the default export) | Vue plugin: registers the shared `isOnline` ref as `$isOnline` and `provide("isOnline", …)`.                              |
| `useOnlineChecker()`               | Composable returning `{ isOnline }`: the one shared, live ref — in `setup` or outside it, with or without the plugin.     |
| `IsOnline`                         | The `{ isOnline: Ref<boolean> }` return type of `useOnlineChecker`, exported from the barrel.                             |
| `$isOnline`                        | `Ref<boolean>` on `ComponentCustomProperties` — available in templates and the Options API after the plugin is installed. |

The ref is made on first use, seeded from `navigator.onLine` (`true` on the server), and follows the window's
`online`/`offline` events from then on; importing the module does nothing. Every `useOnlineChecker()` — in a
component, a store, a service — returns that same ref, and the plugin provides it. It is writable: an app that
knows better than the browser (a request that got no answer, the next one that did) sets `isOnline.value` itself,
and every reader sees it.

## Writes made while offline

The module detects the connection only: there is no write queue. A request sent offline rejects with an axios
error that has no `response`. An app that must keep such changes persists `{ method, url, body }` and replays them
in order on the window's `online` event, parking 4xx refusals for the user. A queued request answered 401 after a
long offline spell waits for the next sign-in (`onAuthenticated` from `@regira/modules/vue/auth`), since the
library keeps one token.
