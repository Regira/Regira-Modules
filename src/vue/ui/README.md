# Regira UI (front-end)

`@regira/modules/vue/ui` — the UI toolkit the [entity views](../entities/README.md) render with:
components, composables, and plugins for paging, loading, feedback, modal, tabs, icons, autocomplete,
form inputs, and responsive layout.

## Areas

| Area         | Components                                                                                                                                                            | Programmatic                                                                           |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| paging       | `Paging`, `ResultSummary`                                                                                                                                             | `usePaging`, `pagingDefaults`, `ButtonType`, `pagingPlugin`                            |
| loading      | `Loading`, `LoadingContainer`, `LoadingButton`                                                                                                                        | `loadingPlugin`                                                                        |
| feedback     | `Feedback`, `Pending`, `Success`, `ErrorSummary`                                                                                                                      | `useFeedback`, `useAppFeedback`, `toFeedbackError`, `FeedbackStatus`, `feedbackPlugin` |
| modal        | `DefaultModal`                                                                                                                                                        | `ModalType`, `modalPlugin`, `injectModal`                                              |
| tabs         | `TabContainer`, `TabNavigation`                                                                                                                                       | `Tab` / `ITab`                                                                         |
| icons        | `Icon`, `BsIcon`, `FaIcon`, `IconButton`                                                                                                                              | `iconPlugin`, `loadIcons`                                                              |
| screen       | —                                                                                                                                                                     | `useScreen`, `screenPlugin`                                                            |
| autocomplete | `Autocomplete`                                                                                                                                                        | `useAutocomplete`                                                                      |
| buttons      | `ConfirmButton`                                                                                                                                                       | —                                                                                      |
| input        | `Anchor`, `DateInput`, `DescriptionInput`, `FormButtonsRow`, `FormLabel`, `FormSection`, `NullableCheckBox`, `NullableLabel`, `FileDropZone`, `CopyToClipboardButton` | —                                                                                      |
| gis          | `GMap`, `GMapLink`, `GMapButton` (Google Maps)                                                                                                                        | —                                                                                      |

## Plugins & imports

Components are **imported locally** from `@regira/modules/vue/ui` (or a sub-path) by default — no
component is registered globally. The whole kit works **à la carte**: nearly every component or
composable drops into any Vue 3 app on its own, with no entity scaffold, no plugin stack, and no other
module required — lean and headless builds included. The one exception is `Autocomplete`: its template
uses `v-click-outside`, so the click-outside directive plugin from `@regira/modules/vue/directives` must be
installed or the directive fails to resolve and the dropdown never closes:

```ts
import { clickOutside } from "@regira/modules/vue/directives"

app.use(clickOutside) // required by Autocomplete
```

Import the library styles once in `main.ts`:

```ts
import "@regira/modules/style.css" // --rg-* tokens, modal backdrop, autocomplete dropdown, the list layout rules
```

Install the plugins for the areas you use; each configures app-wide state only:

- `feedbackPlugin` → `$feedback` · `screenPlugin` → `$screen`
- `iconPlugin` → glyph source (`bs`/`fa`) + friendly icon keys, `$icons`
- `loadingPlugin` → the image `Loading`/`LoadingContainer` render (a built-in spinner when there is none) ·
  `pagingPlugin` → `Paging` page size

To opt back into app-wide registration, set `configureGlobals({ registerComponentsGlobally: true })`
(from `@regira/modules/vue/ioc`) **before** installing the plugins. With the flag on, `iconPlugin`
registers `Icon`/`IconButton`, `loadingPlugin` registers `Loading`/`LoadingButton`/`LoadingContainer`,
`pagingPlugin` registers `Paging`, and `modalPlugin` registers `MyModal` — so those tags resolve
without local imports. Each of these plugins takes matching component options (e.g.
`loadingPlugin { Loading? }`, `pagingPlugin { Paging? }`, compile-checked against the props contract)
that swap what gets registered — and `loadingPlugin { Loading }`, like `modalPlugin { Modal }`, also
swaps the indicator inside library components via `injectLoading()`.

`Icon` works without `iconPlugin` (defaults to Bootstrap glyphs) and `DefaultModal` needs no plugin; the
glyph **font CSS** (`bootstrap-icons`/Font Awesome) must be imported separately. `Icon` takes a registered
friendly key or a raw icon class. Most-used in entity UIs: `Paging`, `LoadingContainer`, `Feedback`,
`TabContainer` + `Tab.create`, `Icon`, and `useScreen`.

## Customizing the look

The default styling is deliberately plain Bootstrap 5 — restyling is encouraged and expected. Five
layers, cheapest first:

1. **Theme tokens** — override the `--rg-*` CSS variables (+ Bootstrap component-level vars) in the
   app's `theme.scss`, loaded after `@regira/modules/style.css`.
2. **CSS hooks** — every component carries stable `rg-*` root/part classes and `is-*` state classes.
3. **Slots** — typed via each component's exported `XxxSlots`.
4. **Replace the skin** — a new SFC declaring the exported contract (`XxxProps`/`XxxEmits`/`XxxSlots`)
   with behavior from the exported `useXxx` composable; the modal swaps app-wide via
   `app.use(modalPlugin, { Modal })` — every library-internal modal resolves it through `injectModal()`.
5. **Eject** — `node node_modules/@regira/modules/_template/scaffold.mjs --ui <Component>` copies the
   reference skin into the app, imports rewritten to public API.

`rg-*` and `--rg-*` are the library's namespace. Every one you write in an app stylesheet must be a hook
the library already ships, overridden — minting `.rg-card` or `--rg-surface` reads as library API and
collides the day the library ships that name. App-owned classes and tokens take an app prefix
(`.shop-card`, `--shop-surface`).

### Structural classes

The opt-in half of the shipped styling: rules `@regira/modules/style.css` provides for **your** markup to
wear, rather than hooks you restyle. Put them on your own elements; they need no `theme.scss` rule.

| Class                   | Rule                                                                                                                       | Put it on                                                             |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `entity-list`           | zeroes the child `.row` gutter margins + `min-width: 0` on the cells, so `text-truncate` clips instead of widening the row | the element wrapping an overview's header row and its item rows       |
| `entity-list--scroll-x` | adds `overflow-x: auto`                                                                                                    | a single list whose row genuinely cannot fit                          |
| `italic-muted`          | `opacity: .6; font-style: italic`                                                                                          | placeholder/inherited text; `NullableLabel`'s "no label set" fallback |

`.entity-list` sets no `overflow` on purpose — don't add one. `overflow-x: auto` next to a `visible`
`overflow-y` computes to `auto` on **both** axes, so the list becomes a scroll container that clips
absolutely-positioned descendants (a dropdown menu in a row) and breaks `position: sticky`
inside it. `entity-list--scroll-x` is the per-list opt-in for the rare row that cannot fit.

## Notes

- The barrel `@regira/modules/vue/ui` re-exports everything **except** part of the screen module: only
  `useScreen` and `screenPlugin` are re-exported — `SCREEN_SIZES`, `IScreen`, `IScreenSize`, and
  `getWindowSize` are not, and there is no `@regira/modules/vue/ui/screen` sub-path, so they cannot be
  imported from the published package. `feedback`, `icons`, and `modal` do have dedicated sub-paths
  for extra exports (e.g. `FeedbackError`/`FeedbackIn`, the modal `style.scss`).
- `FormLabel` renders **below** its input (a muted caption, not a `<label>` above it), so align a row that
  mixes labelled fields with buttons to `flex-start`.
- `FormButtonsRow` with `readonly` renders no buttons: nothing can be saved, deleted or restored, and there
  are no edits for Cancel to discard. The way back is the page's navigation or the modal's close button.
- `TabContainer` shows the first visible, enabled tab among the URL hash (with `use-route-nav`) or the last
  selection (without), then `active`, and otherwise the default tab. `active` is read once, when the container
  is created. With `use-route-nav` the hash is written only when a tab is selected — mounting never navigates.
  `select` fires on mount and whenever the tab on screen changes, Back/Forward included; a click on a disabled
  tab is ignored.
- Modal is a component (`DefaultModal` + `:is-visible` — one-way, flip your own state on
  `@close`/`@cancel`/`@submit`), not an `openModal()` composable; for entity edit-in-modal use
  `useModal` from the entities module.
- `Autocomplete` renders its result panel on `<body>` (a `Teleport`) with `position: fixed`, so no
  ancestor's `overflow` — a scrollable modal body, an `overflow: hidden` card — clips it. It places the panel
  against the viewport itself: it opens below the control, flips **above** it when the results do not fit
  below and there is more room up there (the field at the foot of a modal), and caps its height to the room
  on the side it opens to, so a long list scrolls instead of running off screen. It follows the control while
  open — a scroll, a resize, or the form shifting around it — and hides while the control is scrolled out of
  view inside its scroll container. Nothing to configure — `--rg-dropdown-max-height` stays the ceiling.
  The panel lives on `<body>`, outside your markup, so style it through `resultClass` / `itemsClass` /
  `itemClass` or a global `.autocomplete-items` rule; a selector scoped to an ancestor
  (`.my-form .autocomplete-items`) does not reach it. Neither does anything it would inherit from one: set
  `--rg-dropdown-max-height` / `--rg-dropdown-z` on `:root` or `.autocomplete-items` rather than on a
  container, and a font size, colour or `data-bs-theme` on a region around the form leaves the panel on the
  page's own — give it a `resultClass` that matches the region. For assistive technology the input is a
  `combobox` whose `aria-controls` names the panel's `listbox` and whose `aria-activedescendant` follows the
  arrow-key selection, so screen readers keep the two together even though the panel sits elsewhere in
  the DOM. Label the input as usual (`<label for>` or `aria-label`).
