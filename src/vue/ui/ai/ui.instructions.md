# Regira JsLib UI — AI Agent Instructions

The front-end UI toolkit (`regira/vue/ui`): the Vue components, composables, and plugins the
[entity views](../../entities/ai/entities.instructions.md) render with — paging, loading, feedback,
modal, tabs, icons, autocomplete, form inputs, and a reactive screen helper.

> **Never guess** a prop, emit, or signature — verify in [ui.signatures.md](ui.signatures.md) (programmatic
> API + key component props) or via the MCP source map (`list_types`/`get_type` on `regira_modules.vue.ui`).
> Worked usage: [ui.examples.md](ui.examples.md).

## Import

**The kit works à la carte.** Every component and composable here imports individually into any Vue 3
app — no entity scaffold, no plugin stack, no other module required. On a lean or headless build, reach
for these before hand-rolling a pager, spinner, toast/feedback banner, modal, tab strip, confirm button,
or autocomplete: the hand-rolled version is the expensive path and a deviation to declare
([frontend bootstrap](../../../bootstrap/ai/frontend.bootstrap.md) → _Pick the build tier first_).

Everything is re-exported from the barrel; three areas also have dedicated sub-paths for their extra
exports:

```ts
import { Paging, LoadingContainer, useFeedback, TabContainer, Tab, BsIcon, useScreen } from "regira/vue/ui"
import { Pending, Success, ErrorSummary, type FeedbackError } from "regira/vue/ui/feedback"
import { type IIconProvider, type IconProps } from "regira/vue/ui/icons"
import { DefaultModal } from "regira/vue/ui/modal" // styles: import "regira/style.css" once
```

## Plugins (install once at startup)

Plugins configure globals only — **components are imported locally by default**; import every component
from `regira/vue/ui` (or its sub-path). To opt back into app-wide registration, set
`configureGlobals({ registerComponentsGlobally: true })` (from `regira/vue/ioc`) before
installing the plugins — see the **Global registration** column.

| Plugin           | Configures                                                                      | Options                                                              | Global registration                            |
| ---------------- | ------------------------------------------------------------------------------- | -------------------------------------------------------------------- | ---------------------------------------------- |
| `feedbackPlugin` | `$feedback` (`FeedbackOut`) — app-wide toasts                                   | `{ autoHideDelay? }`                                                 | —                                              |
| `iconPlugin`     | glyph source for `Icon` (`bs`/`fa`) + friendly keys; `$icons` (`IIconProvider`) | `{ icons?, clearFirst?, source?: "bs" \| "fa", Icon?, IconButton? }` | `Icon`, `IconButton`                           |
| `loadingPlugin`  | the image `Loading` renders + the app-wide indicator for `injectLoading()`      | `{ img, Loading?, LoadingButton?, LoadingContainer? }`               | `Loading`, `LoadingButton`, `LoadingContainer` |
| `pagingPlugin`   | the `Paging` default page size                                                  | `{ defaultPageSize?, Paging? }`                                      | `Paging`                                       |
| `modalPlugin`    | the app-wide modal — provides it for `injectModal()`                            | `{ Modal?: ModalComponent }`                                         | `MyModal`                                      |
| `screenPlugin`   | exposes the shared `useScreen()` instance as `$screen` / `inject("screen")`     | `{ sizes? }` — override `SCREEN_SIZES` breakpoints                   | —                                              |

`loadingPlugin`'s `img` brands the indicator; skip the plugin (or leave the image out) and `Loading`
renders a built-in Bootstrap spinner instead, so the loading state stays visible either way. Its
screen-reader text comes from an injectable `loadingLabel` (`app.provide("loadingLabel", …)`, default
`"Loading…"`) — provide it from your translations to localise.

`$feedback`, `$icons`, `$screen` are typed on Vue's `ComponentCustomProperties`. `Icon` works without
`iconPlugin` (defaults to Bootstrap glyphs). Modals need no plugin either — but installing
`app.use(modalPlugin, { Modal: MyBrandedModal })` swaps **every** modal in the app, including the ones
rendered inside library components (`ConfirmButton`, `ErrorSummary`, `LoginModal`, …), which resolve it
via `injectModal()`. Import `regira/style.css` once in `main.ts` for the backdrop/overlay styling.

The `Xxx?` component options take a replacement skin (compile-checked against the matching props
contract) and swap what the plugin registers globally — so custom variants also reach apps that use
`registerComponentsGlobally` instead of local imports. `loadingPlugin { Loading }` goes further, like
the modal: `LoadingContainer`/`LoadingButton` resolve their indicator via `injectLoading()`, so the
swap propagates inside library components too. `iconPlugin { Icon }` does not — library-internal call
sites keep the library `Icon` (re-map glyphs via `icons`/`source`, restyle via `rg-icon`).

## Areas

| Area         | Key components                                                                                                                                                        | Programmatic                                                     |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| paging       | `Paging`, `ResultSummary`                                                                                                                                             | `usePaging`, `pagingDefaults`, `ButtonType`, `pagingPlugin`      |
| loading      | `Loading`, `LoadingContainer`, `LoadingButton`                                                                                                                        | `loadingPlugin`                                                  |
| feedback     | `Feedback`, `Pending`, `Success`, `ErrorSummary`                                                                                                                      | `useFeedback`, `FeedbackStatus`, `feedbackPlugin`, `FeedbackOut` |
| modal        | `DefaultModal`                                                                                                                                                        | `ModalType`, `modalPlugin`, `injectModal`                        |
| tabs         | `TabContainer`, `TabNavigation`                                                                                                                                       | `Tab` / `ITab`                                                   |
| icons        | `BsIcon`, `FaIcon`, `IconButton`                                                                                                                                      | `iconPlugin`, `loadIcons`, `IIconProvider`                       |
| screen       | —                                                                                                                                                                     | `useScreen`, `screenPlugin`                                      |
| autocomplete | `Autocomplete`                                                                                                                                                        | `useAutocomplete`, `autocompleteDefaults`                        |
| buttons      | `ConfirmButton`                                                                                                                                                       | —                                                                |
| input        | `Anchor`, `DateInput`, `DescriptionInput`, `FormButtonsRow`, `FormLabel`, `FormSection`, `NullableCheckBox`, `NullableLabel`, `FileDropZone`, `CopyToClipboardButton` | —                                                                |
| gis          | `GMap`, `GMapLink`, `GMapButton` (Google Maps)                                                                                                                        | —                                                                |

## What the entity views use

- **`Paging`** — `v-model="pagingInfo"` (`IPagingInfo`) + `:count="itemsCount"`; emits `change`. Pair with
  the overview composables (see entities).
- **`LoadingContainer`** — wraps content; `:is-loading="isLoading"`.
- **`Feedback`** — `:feedback="feedback"` (the `FeedbackOut` returned by the overview/form composables);
  or use the global `$feedback` / `useFeedback()` for app-wide messages.
- **`TabContainer`** + `Tab.create(...)` — multi-tab forms.
- **`Icon`** (= `BsIcon`/`FaIcon`) — give it a registered friendly key (`config.icon` per entity) or a raw
  icon class; seed friendly keys via `iconPlugin`.
- **`useScreen()`** — responsive layout (`screen.isLarge`, …) to switch form layouts.

## Composables

- `useFeedback({ autoHideDelay? })` → `FeedbackOut` (`status`, `message`, `error`, `isPending`,
  `pending(msg)` / `success(msg)` / `fail(msg, err?)` / `reset()`). `isPending` is the busy flag to disable
  buttons against double-submits; the message argument is **required** — `pending()` does not compile.
- `useScreen()` → `{ size, screen }` where `screen` exposes `isSmall`…`isExtraExtraLarge`, `layout`,
  `isSize`. It is a **module-level shared instance** that owns a single debounced
  `resize`/`orientationchange` subscription, so it tracks the viewport with or without `screenPlugin`
  installed. Every caller gets that same instance — `updateSize()` moves the breakpoints app-wide.
- `useAutocomplete(props, { emit })` → search/select state for building a custom autocomplete (the
  `Autocomplete` component already wraps it).
- `usePaging({ pagingInfo, count, maxPages, emit })` → page window/routes/change handling for a custom
  pager skin (the `Paging` component already wraps it).

## Customizing the look

The kit's default styling is deliberately plain Bootstrap 5 — restyling is encouraged and expected.
[ui.customize.md](ui.customize.md) is the canonical guide: a 5-layer ladder from theme tokens
(`--rg-*` CSS variables) and stable `rg-*`/`is-*` class hooks, over slots, to contract-typed
replacement skins and `scaffold.mjs --ui <Component>` ejects. Reach for a built-in and restyle or eject
it before writing a new component.

## Gotchas

- **Icon name resolution.** `Icon` renders a registered friendly key (`new`, `search`, …) via
  the seeded map, and renders a raw class (`bi bi-grid`, `fa-solid fa-user`) directly when given one;
  `source` (`"bs"`/`"fa"`) selects which glyph set `iconPlugin` seeds. The glyph **font CSS** is separate —
  import it (`bootstrap-icons`/Font Awesome) or every glyph stays blank.
- **Modal is a component, not a composable.** There is no `openModal()` here — use `DefaultModal` with
  `:is-visible` (one-way; it has no `update:isVisible` emit) plus `@close`/`@cancel` to flip your own state
  (its backdrop/overlay CSS ships in `regira/style.css`). For entity edit-in-modal, use `useModal` from
  the [entities](../../entities/ai/entities.signatures.md) module.
- **`Feedback` needs a `FeedbackOut`** — pass the one from a composable (`useFeedback()` or an
  overview/form composable), not a string.
- **Sub-path exports.** `FeedbackError`/`FeedbackIn` (from `/feedback`) and the modal `style.scss`
  (from `/modal`) are sub-path-only — everything else is on the main barrel.

## See also

- [ui.signatures.md](ui.signatures.md) · [ui.examples.md](ui.examples.md) · [ui.customize.md](ui.customize.md)
- [Entities](../../entities/ai/entities.instructions.md) — the main consumer of these components
