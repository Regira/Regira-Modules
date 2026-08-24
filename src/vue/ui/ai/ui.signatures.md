# Regira UI — API Signatures Reference

Verbatim TypeScript signatures for `@regira/modules/vue/ui`. Do not guess — look up here first. For any
component prop not listed, use the MCP source map (`get_type` on `regira_modules.vue.ui`).

**Where each export lives** — headings group by _category_, so searching for a component name finds nothing.
Look the name up here, then fetch its heading, e.g.
`get_package(id: "regira_modules.vue.ui", section: "ui.signatures", heading: "Buttons & input components")`:

| Heading                      | Exports                                                                                                                                                                                                                  |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Plugins`                    | `feedbackPlugin`, `iconPlugin`, `loadingPlugin`, `pagingPlugin`, `modalPlugin`, `screenPlugin`                                                                                                                           |
| `Feedback`                   | `useFeedback`, `Feedback`, `FeedbackStatus`, `FeedbackError`, `FeedbackOut`                                                                                                                                              |
| `Paging`                     | `Paging`, `usePaging`, `ButtonType`, `ResultSummary`                                                                                                                                                                     |
| `Loading`                    | `Loading`, `LoadingButton`, `LoadingContainer`, `injectLoading`                                                                                                                                                          |
| `Modal`                      | `DefaultModal`, `ModalType`, `injectModal`                                                                                                                                                                               |
| `Tabs`                       | `TabContainer`, `TabNavigation`, `Tab`, `ITab`                                                                                                                                                                           |
| `Icons`                      | `Icon`, `BsIcon`, `FaIcon`, `IconButton`, `loadIcons`                                                                                                                                                                    |
| `Screen`                     | `useScreen`, `SCREEN_SIZES`, `IScreen`                                                                                                                                                                                   |
| `Autocomplete`               | `Autocomplete`, `useAutocomplete`                                                                                                                                                                                        |
| `Buttons & input components` | `ConfirmButton`, `DateInput`, `DescriptionInput`, `FormButtonsRow`, `NullableCheckBox`, `NullableLabel`, `FileDropZone`, `Anchor`, `FormLabel`, `FormSection`, `CopyToClipboardButton`, `GMap`, `GMapLink`, `GMapButton` |

The table indexes **components, composables and plugins**. Their contract types (`XxxProps` / `XxxEmits` /
`XxxSlots`) and defaults (`xxxDefaults`) live under the same heading as the thing they belong to — or ask
`get_type(id: "regira_modules.vue.ui", typeName: "ConfirmButton")`, which resolves a component name straight to them.

**Contract convention.** Every skinnable component exports its contract from the barrel:
`XxxProps` / `XxxEmits` / `XxxSlots` (+ `xxxDefaults` where props have defaults), with behavior in an
exported `useXxx` composable where one exists. A replacement skin declares
`defineProps<XxxProps>` / `defineEmits<XxxEmits>` / `defineSlots<XxxSlots>` and is compile-checked by
`vue-tsc`. See [ui.customize.md](ui.customize.md) for the full customization ladder.

## Plugins

```ts
import { feedbackPlugin, iconPlugin, loadingPlugin, pagingPlugin, modalPlugin, screenPlugin } from "@regira/modules/vue/ui"

feedbackPlugin.install(app, { autoHideDelay?: number })
iconPlugin.install(app, { icons?: Record<string, string>; clearFirst?: boolean; source?: "bs" | "fa"; Icon?: IconComponent; IconButton?: IconButtonComponent })
loadingPlugin.install(app, options?: { img?: string; Loading?: LoadingComponent; LoadingButton?: LoadingButtonComponent; LoadingContainer?: LoadingContainerComponent })
// loadingPlugin's Loading swaps the indicator app-wide — incl. inside LoadingContainer/LoadingButton, which resolve it via injectLoading()
pagingPlugin.install(app, { defaultPageSize?: number; Paging?: PagingComponent })
modalPlugin.install(app, { Modal?: ModalComponent }) // provides the app-wide modal — swaps EVERY modal, incl. the ones inside library components
screenPlugin.install(app, { sizes?: Record<string, number> }) // sizes overrides the SCREEN_SIZES breakpoints (known keys only)
```

Components are imported locally by default. When `registerComponentsGlobally` is on (set via
`configureGlobals` from `@regira/modules/vue/ioc` before install), these plugins also register their
components app-wide: `iconPlugin` → `Icon`/`IconButton`, `loadingPlugin` →
`Loading`/`LoadingButton`/`LoadingContainer`, `pagingPlugin` → `Paging`, `modalPlugin` → `MyModal`.
The `Xxx?` component options swap what gets registered (each is compile-checked against the matching
props contract), so replacement skins also reach the global-registration path. Note the asymmetry:
`modalPlugin { Modal }` and `loadingPlugin { Loading }` additionally swap library-internal call sites
(via `injectModal()` / `injectLoading()`); `iconPlugin { Icon }` does not — library components keep the
library `Icon`, whose glyphs you re-map via `icons`/`source` and restyle via the `rg-icon` hook.

## Feedback

```ts
import { useFeedback, FeedbackStatus, Feedback, type FeedbackOut, type FeedbackProps, type FeedbackSlots } from "@regira/modules/vue/ui"
import { type FeedbackError, type FeedbackIn } from "@regira/modules/vue/ui/feedback"

export enum FeedbackStatus {
    none = "",
    pending = "Pending",
    success = "Success",
    failed = "Failed",
}
export type FeedbackIn = { autoHideDelay?: number }
// ⚠️ A FIELD-ERROR MAP ({ title: "Required" } — the 400 body an EntityInputException's InputErrors produces),
// or a plain string. NOT an Error: log the exception yourself and pass error.response?.data?.errors.
export type FeedbackError = string | Record<string, string>
// reactive(), not a bag of refs: read the fields directly in script and template — :disabled="f.isPending".
// Destructuring it snapshots the values, as with any reactive object — pass the object, or toRefs() it.
export interface FeedbackOut {
    status: FeedbackStatus
    message: string
    error: FeedbackError | undefined
    readonly isPending: boolean // busy flag = status === FeedbackStatus.pending; gate buttons on this
    pending(msg: string): void // every setter REQUIRES a message — there is no no-arg form
    success(msg: string): void
    fail(msg: string, errors?: FeedbackError): void // second arg is the FIELD-ERROR MAP above, never an Error
    reset(): void
}
export function useFeedback({ autoHideDelay }?: FeedbackIn): FeedbackOut
// the app-wide panel the feedback plugin installs, for a handler that owns no panel of its own; throws
// when the plugin was never installed
export function useAppFeedback(): FeedbackOut

// Feedback component contract:
export type FeedbackProps = { feedback: FeedbackOut; hideCloseButton?: boolean; enableErrorPopup?: boolean }
export const feedbackDefaults: { hideCloseButton: false; enableErrorPopup: false }
export interface FeedbackEmits {
    (e: "close", arg: { status: FeedbackStatus; error?: FeedbackError }): void
}
export type FeedbackSlots = { "close-button"?(): any; pending?(): any; success?(): any; error?(): any }
```

## Paging

```ts
import { Paging, ButtonType, usePaging, pagingDefaults, type PagingProps, type PagingEmits, type PagingSlots, type PagingComponent } from "@regira/modules/vue/ui"
export enum ButtonType {
    anchor = "Anchor",
    button = "Button",
}
export const pagingDefaults: { maxPages: number; buttonType: ButtonType }

// Paging component contract:
export type PagingProps = { modelValue: IPagingInfo; count: number; maxPages?: number; buttonType?: ButtonType }
export type PagingEmits = { (e: "update:modelValue", args: any): void; (e: "change", args: any): void }
export type PagingSlots = {
    firstPage?(props: { page: number }): any
    default?(props: { page: number; route: string; handleChange: (page: number) => void }): any
    lastPage?(props: { page: number }): any
}
export type PagingComponent // any component implementing PagingProps — pagingPlugin's Paging option type (compile-checked)
// behavior for replacement skins (page window, routes, change handling):
export function usePaging(input: { pagingInfo: Ref<IPagingInfo>; count: Ref<number>; maxPages: number; emit: PagingEmits }): {
    pagedRoute(p: number): string
    page: ComputedRef<number>
    totalPages: ComputedRef<number>
    totalVisiblePages: ComputedRef<number>
    firstPage: ComputedRef<number>
    lastPage: ComputedRef<number>
    pages: ComputedRef<Array<number>>
    visibleMaxPages: ComputedRef<number> // effective button budget — half of maxPages below the sm breakpoint
    handleChangePage(newPage: number): void
}
```

```ts
import { ResultSummary, type ResultSummaryProps, type ResultSummarySlots } from "@regira/modules/vue/ui"
export type ResultSummaryProps = { visibleCount?: number; totalCount?: number } // renders "visible / total"
export type ResultSummarySlots = { default?(props: { visibleCount?: number; totalCount?: number }): any }
```

## Loading

```ts
import { Loading, LoadingButton, LoadingContainer, injectLoading } from "@regira/modules/vue/ui"
import { type LoadingComponent, type LoadingContainerProps, type LoadingContainerSlots, type LoadingButtonProps, type LoadingButtonSlots } from "@regira/modules/vue/ui"
// Loading: no props — renders the img provided by loadingPlugin ({ img }); without one it falls back to a
// built-in Bootstrap spinner labelled by the injectable `loadingLabel` (default "Loading…")
export type LoadingContainerProps = { isLoading: boolean }
export type LoadingContainerSlots = { loading?(): any; default?(): any }
export type LoadingButtonProps = { isLoading: boolean; disabled?: boolean }
export type LoadingButtonSlots = { loading?(): any; default?(): any }
export type LoadingComponent // any component usable as the loading indicator — loadingPlugin's Loading option type (compile-checked)

// resolves the app-wide loading indicator (the loadingPlugin swap-in, Loading otherwise); call in setup:
export function injectLoading(): LoadingComponent
// LoadingContainer/LoadingButton render their indicator through it, so a swapped Loading propagates
```

## Modal

```ts
import { DefaultModal, ModalType, injectModal, modalDefaults } from "@regira/modules/vue/ui"
import { type ModalProps, type ModalEmits, type ModalSlots, type ModalComponent } from "@regira/modules/vue/ui"
export enum ModalType {
    normal = "Normal",
    success = "Success",
    warning = "Warning",
    danger = "Danger",
}

// modal contract — DefaultModal implements it; a branded replacement declares the same types:
export type ModalProps = {
    title?: string
    isVisible: boolean
    showHeader?: boolean
    showFooter?: boolean
    fullWidth?: boolean
    size?: "sm" | "md" | "lg" | "xl"
    type?: ModalType
}
export type ModalEmits = { (e: "submit"): void; (e: "cancel"): void; (e: "close"): void }
export type ModalSlots = {
    title?(): any
    "header-close-button"?(props: { handleClose: () => void }): any
    default?(): any
    buttons?(): any
    "footer-close-button"?(props: { handleCancel: () => void }): any
    "footer-submit-button"?(props: { handleClose: () => void }): any
}
export const modalDefaults: { showHeader: true; showFooter: true; type: ModalType.normal }
export type ModalComponent // any component implementing ModalProps — modalPlugin's option type (compile-checked)

// resolves the app-wide modal (the modalPlugin swap-in, DefaultModal otherwise); call in setup:
export function injectModal(): ModalComponent
// usage in a component:  const Modal = injectModal()  →  <component :is="Modal" :is-visible="..." @close="...">
```

## Tabs

```ts
import { TabContainer, TabNavigation, Tab, type ITab, type TabContainerProps, type TabsEmits, type TabNavigationProps } from "@regira/modules/vue/ui"
export interface ITab {
    key: string
    icon?: string
    title: string
    isDefault: boolean
    isDisabled: boolean
    isVisible: boolean | (() => boolean)
}
export class Tab implements ITab {
    constructor(title: string, key?: string, isDefault?: boolean, isDisabled?: boolean, isVisible?: boolean)
    static create(key: string, values?: object): Tab & object
}
// USAGE: create(key, { title, icon, isDefault?, isDisabled? }). The first positional arg is the tab KEY —
// it seeds both `key` and `title`, then `values.title` overrides the label. Pass a slug-safe key that
// matches the `<template #key>` slot and the route hash: Tab.create("form", { title: translate("form"),
// icon: "form", isDefault: true }). Never Tab.create("My Products", …) — a spaced/cased key breaks both.
// TabNavigation renders `tab.title` VERBATIM — it does not run `$t()`. Omitting `values.title` shows the
// raw key in the tab strip; translate eagerly (useLang().translate(...)) when building the tabs array.
export type TabContainerProps = { tabs: Array<ITab | string | undefined>; useRouteNav?: boolean; active?: string }
export type TabsEmits = { (e: "select", tab: string): void }
export type TabNavigationProps = { tabs: Array<ITab>; activeTab: string }
// TabContainer renders one named slot per tab key; `useRouteNav` syncs the active tab with the route
// hash (deep-linkable, back-button friendly) — disable it inside popups (`:use-route-nav="!isPopup"`).
```

## Icons

```ts
import { Icon, BsIcon, FaIcon, IconButton, loadIcons, iconPlugin, iconDefaults, iconButtonDefaults } from "@regira/modules/vue/ui"
import { type IIconProvider, type IconProps, type IconSize, type IconButtonProps, type IconButtonSlots } from "@regira/modules/vue/ui"
export type IconSize = "sm" | "md" | "lg" | "xl"
export type IconProps = { name: string; size?: IconSize }
export const iconDefaults: { size: IconSize } // "md"
export type IconButtonProps = { icon: string; size?: IconSize; type?: "button" | "submit" | "reset" }
export const iconButtonDefaults: { type: "button" }
export type IconButtonSlots = { default?(): any }
export type IconComponent // any component implementing IconProps — iconPlugin's Icon option type (compile-checked); IconButtonComponent likewise
export type IIconProvider = { add: (key: string, icon: string) => void; source: "bs" | "fa"; map: Map<string, string> }
export function load(icons: Record<string, string> | Array<Array<string>>): void // exported as loadIcons
// BsIcon / FaIcon props: IconProps
```

## Screen

```ts
import { useScreen, screenPlugin } from "@regira/modules/vue/ui" // SCREEN_SIZES / IScreen are not re-exported from the barrel
export const SCREEN_SIZES: Record<string, number>
export interface IScreen {
    get size(): number[]
    get isExtraSmall(): boolean
    get isSmall(): boolean
    get isMedium(): boolean
    get isLarge(): boolean
    get isExtraLarge(): boolean
    get isExtraExtraLarge(): boolean
    get layout(): string
    updateSize(newSize: IScreenSize): void
    isSize(size: string): boolean
}
// module-level shared instance; it owns the debounced resize/orientationchange subscription, so it is
// reactive with or without screenPlugin (the plugin only exposes the same instance as $screen)
export function useScreen(): { size: Ref<number[]>; screen: IScreen }
```

## Autocomplete

```ts
import { useAutocomplete, autocompleteDefaults, Autocomplete } from "@regira/modules/vue/ui"
import { type AutocompleteProps, type AutocompleteEmits, type AutocompleteSlots, type AutocompleteOut } from "@regira/modules/vue/ui"
// AutocompleteProps<T>: { idValue?, modelValue?, data?, maxResults?, debounceTime?, enableDblClick?, autoSelect?, allowFreeInput?,
//                         resultClass?, itemsClass?, itemClass?,
//                         search?(term?): Promise<Array<T>>, idSelector?(item?): TKey|undefined,
//                         displayItemFormatter?(item?): string }
// AutocompleteEmits<T>: "update:modelValue" | "update:idValue" | "select" | "qInput"
// AutocompleteSlots<T>: { default?({ item: T; q: string }): any }
//   the scoped default slot is THE result-item rendering seam; the fallback renders
//   displayItemFormatter(item) with the matched term in bold (safe text — no innerHTML)
export const autocompleteDefaults: { data: () => []; maxResults: 10; debounceTime: 250; autoSelect: false }
export function useAutocomplete<T = any, TKey = number | string | T>(props, { emit }): AutocompleteOut<T, TKey>
```

## Buttons & input components

```ts
import {
    ConfirmButton,
    DateInput,
    DescriptionInput,
    FormButtonsRow,
    NullableCheckBox,
    FileDropZone,
    Anchor,
    FormLabel,
    FormSection,
    NullableLabel,
    CopyToClipboardButton,
} from "@regira/modules/vue/ui"
// ConfirmButton contract (ConfirmButtonProps/Emits/Slots + confirmButtonDefaults):
//   props: { icon?: string; buttonLabel?: string; modalTitle?: string; modalType?: ModalType }
//   emits: confirm | cancel | open | close ; slots: button-content, modal, default (confirm-modal body)
//   exposes: open() / close() — `open` is BOTH an emit (fired on click) and an exposed method. To raise the
//   same confirmation from another affordance (a swipe, a context menu, a shortcut), keep the button in the
//   tree and call it through a ref: <ConfirmButton ref="confirm" … /> + confirm.value?.open()
// DateInput contract (DateInputProps/Emits): { modelValue?: string | Date; culture?: string; readonly?: boolean;
//   showTime?: boolean } (v-model; `readonly` also refuses the emit — a native picker cannot write through it).
//   showTime renders <input type="datetime-local"> and keeps the time on the emitted Date; without it the
//   control is date-only. The matching formatters are dateInputString / dateTimeInputString.
//   Clearing the field emits `undefined` — so a search-object field bound to it goes back to inactive
//   (`value != null` is what marks a filter active), and an unparseable value emits nothing at all.
// NullableCheckBox contract (NullableCheckBoxProps/Emits): { modelValue?: boolean | string | number; label?: string }
//   (v-model: true → false → undefined, rendered indeterminate). `label` renders a clickable <label> beside the
//   box — pass `id` too and it is associated via `for`:
//     <NullableCheckBox v-model="so.isActive" id="isActive" :label="$t('isActive')" />
//   Omit `label` and the component renders as the bare <input> (fallthrough attrs land on it either way), for a
//   custom layout: <NullableCheckBox v-model="so.isActive" /> beside your own markup or a `NullableLabel`.
//   ⚠️ Inside a Bootstrap `.form-check` keep the bare form: `label` emits `rg-nullable-checkbox-label`, not
//   `form-check-label`, so it does not pick up Bootstrap's check alignment. Pair the bare input with your own
//   <label class="form-check-label" for> there, and use the `label` prop everywhere else.
// DescriptionInput contract (DescriptionInputProps): { label?: string; readonly?: boolean }   (v-model: string)
// FileDropZone contract (FileDropZoneEmits/Slots): emits "drop-files" (files: Array<Blob>) ; default slot scoped { isDropping }
// FormButtonsRow contract (FormButtonsRowProps/Emits/Slots): { item?: unknown; readonly?: boolean; feedback?: FeedbackOut; showDelete?: boolean; labels?: { save?: string; cancel?: string; delete?: string; restore?: string }; modalTitle?: string } (reads item.isArchived — truthy, 0/1 ok — to gate Restore, item.$title for the delete prompt; feedback busy-gates Save/Delete/Restore against double-submits; labels/modalTitle override the English defaults for i18n) ; emits: cancel | remove | restore ; slots: delete (delete-confirm body; defaults to "Delete {$title}?")
```

The remaining input widgets export contract types too (`FormLabelProps` + `formLabelDefaults`,
`FormSectionProps`/`FormSectionEmits`/`FormSectionSlots`, `NullableCheckBoxProps`/`NullableCheckBoxEmits`,
`NullableLabelProps`/`NullableLabelSlots`, `AnchorProps`/`AnchorSlots`, `CopyToClipboardButtonProps` +
`copyToClipboardButtonDefaults`) — inspect exact shapes with `get_type` on `regira_modules.vue.ui`. The
gis components are contract-typed too: `GMapProps` `{ modelValue: GMapAddressInput; zoom?: number }`,
`GMapLinkProps`/`GMapLinkSlots`, `GMapButtonProps`/`GMapButtonSlots` (`GMapAddressInput` = address parts
array or a single string; `GMapButton`'s map modal resolves via `injectModal()`).

## See also

- [ui.instructions.md](ui.instructions.md) · [ui.examples.md](ui.examples.md)
