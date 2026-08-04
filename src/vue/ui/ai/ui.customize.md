# Regira UI — Customization Guide

The built-ins are **deliberately plain Bootstrap 5 — restyling is encouraged and expected.** This guide
is the canonical path to a branded app: five layers, cheapest first. Climb only as high as the design
brief requires; at every layer the functionality is preserved by construction (behavior lives in the
`use*` composables, the exported contract types make replacements compile-checked by `vue-tsc`).

**Rule zero: prefer the provided components.** Reach for a built-in — restyle, wrap, or eject it if the
look doesn't fit — before writing a new component. Write a new component only when no built-in covers
the functionality.

**Scope of rule zero: the library's UI built-ins** — this guide's subject, whose behaviour (keyboard
selection, debounce, paging math, focus/Esc handling) lives in the `use*` composables, so a from-scratch
rewrite re-earns it the hard way. It does **not** govern the **scaffolded app-owned shell** —
`layout/`, `entity-navigation/`, the views — which are _default implementations_ you may replace outright
with your own design, as long as the functionality stays available (see the entities module's
[shell template](../../entities/ai/entities.shell.template.md) → _Default implementations, not
requirements_, and [entities.instructions.md](../../entities/ai/entities.instructions.md) →
_Functionality contract_ for the capability checklist a replacement must satisfy).

⚠️ **`rg-*` and `--rg-*` are the library's namespace — never define your own.** Every `rg-` class and
custom property in an app stylesheet must be a **hook the library already ships** (listed in L0/L1 below),
overridden. Minting `.rg-card`, `.rg-badge`, `--rg-surface` and the like reads as library API and silently
collides the day the library adds that name. App-owned classes and tokens take an **app** prefix
(`.shop-card`, `--shop-surface`).

## The five layers

| #   | Layer                   | You change                         | Mechanism                                                                                                                  |
| --- | ----------------------- | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| 0   | **Theme tokens**        | colors, radius, spacing — app-wide | override Bootstrap component vars + `--rg-*` tokens in `src/assets/theme.scss`                                             |
| 1   | **CSS restyle**         | one component's look, CSS only     | stable `rg-*` / `is-*` class hooks                                                                                         |
| 2   | **Recompose**           | a part of a component              | named/scoped slots (typed via `XxxSlots`)                                                                                  |
| 3   | **Replace the skin**    | the entire markup                  | new SFC against `XxxProps`/`XxxEmits`/`XxxSlots` + `useXxx`; modal/loading swap app-wide via `modalPlugin`/`loadingPlugin` |
| 4   | **Eject the reference** | start from the shipped markup      | `node node_modules/regira/_template/scaffold.mjs --ui <Component>`                                                |

## L0 — Theme tokens

Import order in `main.ts` matters — the app theme comes **after** Bootstrap and the library css:

```ts
import "bootstrap/dist/css/bootstrap.min.css"
import "regira/style.css"
import "@/assets/theme.scss" // the app's theme — always give the app one, even if it starts small
```

Library tokens (shipped in `regira/style.css`, all overridable):

| Token                      | Default                      | Used by                                                                                                         |
| -------------------------- | ---------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `--rg-accent`              | `var(--bs-primary, #0d6efd)` | the library's accent token — **override** it to re-accent the app; it is not a spare slot to invent siblings of |
| `--rg-accent-bg`           | `rgba(0, 0, 255, 0.1)`       | `.rg-accent-bg` — the normal-type modal header tint                                                             |
| `--rg-deleted-bg`          | `rgba(220, 53, 69, 0.25)`    | `.is-deleted` (pending-delete chips/rows)                                                                       |
| `--rg-backdrop`            | `rgba(0, 0, 0, 0.5)`         | modal mask                                                                                                      |
| `--rg-modal-z`             | `9998`                       | modal mask z-index                                                                                              |
| `--rg-dropdown-z`          | `99999`                      | autocomplete results z-index                                                                                    |
| `--rg-dropdown-max-height` | `13rem`                      | autocomplete results                                                                                            |
| `--rg-dragging-opacity`    | `0.6`                        | `.is-dragging`                                                                                                  |

**The Bootstrap nuance an agent must not get wrong:** apps import _precompiled_ Bootstrap 5.3, whose
component styles read **component-level** vars baked at compile time (`.btn-primary { --bs-btn-bg: #0d6efd }`).
Overriding `:root { --bs-primary: … }` alone recolors almost nothing. Re-theme at the component-var level:

```scss
// src/assets/theme.scss — worked accent swap
:root {
    --rg-accent: #7c3aed;
    --rg-accent-bg: rgba(124, 58, 237, 0.12);
    --bs-link-color-rgb: 124, 58, 237;
    --bs-border-radius: 0.75rem;
}
.btn-primary {
    --bs-btn-bg: var(--rg-accent);
    --bs-btn-border-color: var(--rg-accent);
    --bs-btn-hover-bg: #6d28d9;
    --bs-btn-hover-border-color: #6d28d9;
}
.pagination {
    --bs-pagination-active-bg: var(--rg-accent);
    --bs-pagination-active-border-color: var(--rg-accent);
    --bs-pagination-color: var(--rg-accent);
}
```

Theming belongs in `theme.scss` — never fork or patch the library css.

## L1 — CSS restyle via class hooks

Every built-in carries stable semantic classes alongside the Bootstrap ones. Write plain css against
them in `theme.scss` — no `::v-deep`, no `!important` needed.

- **Root hooks** (`rg-*`): `rg-modal`, `rg-paging`, `rg-autocomplete` (the input), `rg-feedback`,
  `rg-pending`, `rg-success`, `rg-error-summary`, `rg-confirm-button`, `rg-icon`, `rg-icon-button`,
  `rg-loading`, `rg-loading-button`, `rg-loading-container`, `rg-form-label`, `rg-date-input`,
  `rg-nullable-checkbox`, `rg-nullable-label`, `rg-anchor`, `rg-copy-button`, `rg-file-drop-zone`,
  `rg-tab-nav`, `rg-login-form`, `rg-logout-form`, `rg-change-password-form`, `rg-reset-password-form`,
  `rg-lang-selector`.
- **Semantic roots** (no `rg-` prefix): `entity-overview`, `entity-form`, `input-selector-inline`,
  `details-summary`, `result-summary`, `form-buttons`, `form-section`, `description-input`,
  `tab-container`, `autocomplete-items` / `autocomplete-item`.
  `form-buttons` is `FormButtonsRow`'s own root, and the entity-slice scaffold wraps it in an
  app-owned `.form-toolbar` row — style that wrapper for chrome around the buttons (sticky bar,
  padding, border), or the rule lands on both elements.
- **Part hooks** where inner parts are styling targets: `rg-modal__header` / `rg-modal__body` /
  `rg-modal__footer`, `rg-paging__page`, `rg-feedback__pending` / `rg-feedback__success` /
  `rg-feedback__error` / `rg-feedback__close-button`, `rg-loading-fallback` / `rg-loading-spinner`
  (the unbranded spinner and its wrapper — size or restyle them when no `loadingPlugin` image is set).
- **State classes** (`is-*`): `is-deleted`, `is-dragging`, `is-selected` (app convention), `.active`
  on the current page.
- Adding a class to a component's **root** needs no prop — Vue class fallthrough:
  `<Paging class="my-pager" …>`. `Autocomplete` additionally takes `resultClass` / `itemsClass` /
  `itemClass` for its detached dropdown parts.

**Structural classes** are the other half of the shipped surface: rules in `regira/style.css`
your markup **opts into**, rather than hooks you restyle. Put them on your own elements; keep them out
of `theme.scss`.

| Class                   | Rule                                                                                                                       | Put it on                                                             |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| `entity-list`           | zeroes the child `.row` gutter margins + `min-width: 0` on the cells, so `text-truncate` clips instead of widening the row | the element wrapping an overview's header row and its item rows       |
| `entity-list--scroll-x` | adds `overflow-x: auto`                                                                                                    | one list whose row genuinely cannot fit — see the ⚠️ below            |
| `italic-muted`          | `opacity: .6; font-style: italic`                                                                                          | placeholder/inherited text; `NullableLabel`'s "no label set" fallback |

⚠️ **Never put `overflow-x` on `.entity-list` yourself.** With a `visible` `overflow-y` it computes to
`auto` on **both** axes, turning the list into a scroll container that clips absolutely-positioned
descendants (an inline-edit row's autocomplete panel) and breaks `position: sticky` inside it. The
library rule omits it deliberately; `entity-list--scroll-x` is the per-list opt-in.

## L2 — Recompose with slots

Slots are typed (`XxxSlots`, visible via `get_type`) — the main seams:

- `DefaultModal`: `title`, `header-close-button{handleClose}`, default, `buttons`,
  `footer-close-button{handleCancel}`, `footer-submit-button{handleClose}`
- `Paging`: `firstPage{page}`, default `{page, route, handleChange}`, `lastPage{page}`
- `Autocomplete`: scoped default `{item, q}` — **the** result-item rendering seam
- `Feedback`: `close-button`, `pending`, `success`, `error`
- `ResultSummary`: default `{visibleCount, totalCount}`
- `ConfirmButton`: `button-content`, `modal`, default (confirm body)
- `LoginModal` / `ForgotPasswordModal`: default `{username}` — replace the whole form
- `EntityOverview`: `toolbar`, `head`, `row{item, remove, reload}`, `paging{page, pageCount, count, setPage}`
- `InputSelectorInline`: `chip{row}`, `selector{add, exclude}`
- `FormSection`: `header{collapsed, showSummary}`, `title`, default, `summary`, `always`

Wrapping is the slot-level alternative: a local component that renders the library one with your
defaults/skin, same props/emits (e.g. an i18n'd `FormButtonsRow`).

## L3 — Replace the skin (contract-first)

A replacement SFC is three lines of wiring plus free markup — behavior arrives from the composable:

```vue
<script setup lang="ts">
import { usePaging, pagingDefaults, type PagingProps, type PagingEmits, type PagingSlots } from "regira/vue/ui"
import { toRefs } from "vue"
import { useVModelField } from "regira/vue/vue-helper"
import type { IPagingInfo } from "regira/vue/entities"

const emit = defineEmits<PagingEmits>()
const props = withDefaults(defineProps<PagingProps>(), { ...pagingDefaults })
defineSlots<PagingSlots>()

const pagingInfo = useVModelField<IPagingInfo>(props, emit)
const { count } = toRefs(props)
const { page, pages, totalPages, pagedRoute, handleChangePage } = usePaging({ pagingInfo, count, maxPages: props.maxPages!, emit })
</script>
<!-- markup is yours — keep the rg-paging root hook and stay responsive -->
```

**The modal and the loading indicator swap app-wide.** They are the components with library-internal
call sites: modals inside `ConfirmButton`, `ErrorSummary`, `LoginModal`, `ForgotPasswordModal`, gis
`GMapButton` resolve via `injectModal()`; the spinner inside `LoadingContainer`/`LoadingButton` resolves
via `injectLoading()`. One line in `main.ts` reskins them everywhere:

```ts
import MyBrandedModal from "@/components/ui/MyBrandedModal.vue"
app.use(modalPlugin, { Modal: MyBrandedModal }) // Modal is compile-checked against ModalProps
app.use(loadingPlugin, { img, Loading: MyLoading }) // ditto for the loading indicator
```

Everything else is swapped where it's used: consumer-owned scaffolded slices just change an import;
per-entity view components (Overview/Details/Form/Fiche) swap via the `EntityDescriptor` registry. Apps
that opted into `registerComponentsGlobally` pass the variant to the owning plugin instead —
`iconPlugin { Icon?, IconButton? }`, `loadingPlugin { Loading?, LoadingButton?, LoadingContainer? }`,
`pagingPlugin { Paging? }`, `debugPlugin { Debug? }` (each compile-checked against its props contract) —
so the global name resolves to your skin. Only `iconPlugin { Icon }` stays registration-only: library
components keep the library `Icon` (re-map glyphs via `icons`/`source`, restyle via `rg-icon`).

## L4 — Eject the reference skin

```
node node_modules/regira/_template/scaffold.mjs --ui list
node node_modules/regira/_template/scaffold.mjs --ui DefaultModal   [--dir src/components/ui]
```

Every imported built-in is ejectable — `--ui list` is the authority. The full set: `DefaultModal`,
`Paging` (incl. button/anchor), `Autocomplete`, `Feedback`, `ConfirmButton`, `FormButtonsRow`,
`FileDropZone`, `Tabs` (container + nav), `LoginForm`, `ChangePasswordForm`, `ResetPasswordForm`,
`InputSelectorInline`, `Anchor`, `DateInput`, `DescriptionInput`, `FormLabel`, `FormSection`,
`NullableCheckBox`, `NullableLabel`, `ResultSummary`, `Icon`, `IconButton`, `Loading` (incl.
container/button), `Debug`, `LangSelector`, `DetailsSummary`, `GMapButton`, `LoginModal`,
`ForgotPasswordModal`.

The copy lands in your app with its imports rewritten to public `regira/...` specifiers, so
behavior (composables, contract types) keeps flowing from the library across upgrades — only the markup
is yours. Edit it freely, then wire it per the printed note (modal: `modalPlugin { Modal }`; others:
import your copy instead of the library one).

## Replacement checklist (MUST)

Types prove a skin _accepts_ the contract; they cannot prove it _fires_ the emits or _renders_ the
slots. Every replacement/ejected skin MUST:

1. Declare the contract: `defineProps<XxxProps>` (+ `xxxDefaults`), `defineEmits<XxxEmits>`,
   `defineSlots<XxxSlots>`; match the reference's `defineExpose` surface (visible in the `.d.ts`).
2. Keep the `rg-*` root/part hooks and `is-*` state classes — they are contractual, so css written at
   L1 survives any reskin.
3. **Stay responsive** unless the user explicitly asks otherwise: Bootstrap grid (`col` + breakpoint
   variants), `d-none d-md-inline` on button labels, `d-none d-md-block` to drop columns on small
   screens, `$screen` for JS-side switches.
4. Render every slot and fire every emit of the contract, per component:
    - **Modal**: render the default slot when `isVisible`; emit `close` on Esc and the header close;
      emit `cancel`/`submit` from the footer actions; honor `showHeader`/`showFooter`/`size`/`fullWidth`/`type`.
    - **Paging**: `v-model` (`update:modelValue`) + `change` with the new `IPagingInfo`; mark the
      active page; keep both anchor (`pagedRoute`) and button modes working.
    - **Autocomplete**: keyboard selection (up/down/enter), debounced search, and the scoped default
      slot for items — all provided by `useAutocomplete`; keep them wired.
    - **Feedback**: render the pending/success/error regions per `FeedbackStatus`; keep the close
      button emitting `close` and resetting.
    - **EntityOverview**: reload on mount; expose `reload`/`setPage`.
    - **Lean/entity forms**: guard against double submits (`saving`/feedback busy state).
5. Group form fields with `FormSection` (+ `FormLabel`, `input-group` icon prefixes) rather than flat
   field lists (SHOULD).

## See also

- [ui.signatures.md](ui.signatures.md) — every contract type, verbatim
- [ui.examples.md](ui.examples.md) — worked branded-modal / ejected-pager / theme examples
- entities [patterns](../../entities/ai/entities.patterns.md) — restyling the scaffolded slices,
  responsive overview layout, tabs for big forms
