# Regira Vue Helper — AI Agent Instructions

Three small Vue composition helpers (`@regira/modules/vue/vue-helper`) that the rest of the library is
built on — `useOwnedCollection`, `useListInput`, and `Autocomplete` use them internally.

> **Never guess** a signature — verify in [vue-helper.signatures.md](vue-helper.signatures.md).

## Import

```ts
import { useVModelField, createFromComputedPool, useEventListener } from "@regira/modules/vue/vue-helper"
// also re-exported from the vue barrel:
import { useVModelField } from "@regira/modules/vue"
```

## `useVModelField` — v-model for composables (components use `defineModel`)

**In a component's `<script setup>`, bind v-model with native `defineModel<T>()`** — that is what the
slice templates and examples do:

```ts
const item = defineModel<Entity>({ required: true }) // component idiom — no helper needed
```

`useVModelField` is the **runtime equivalent for the places the `defineModel` compiler macro can't go**:
composables and factory functions that receive `props`/`emit` as arguments. It returns a
`WritableComputedRef<T>` that reads the prop and writes by emitting `update:<name>` (`name` defaults to
`"modelValue"`):

```ts
// a composable can't call defineModel — bridge the caller's v-model instead
export function useDraftList<T>({ props, emit }: { props: Readonly<Record<string, any>>; emit: any }) {
    const items = useVModelField<Array<T>>(props, emit)
    // …mutate/replace items.value; assignments emit update:modelValue to the host component
    return { items }
}
```

This is exactly how the library's own `useOwnedCollection` and `useListInput` bind their models. Pass
`name` for a non-default model (`useVModelField(props, emit, "idsValue")`) and `defaultValue` for the
value to surface while the prop is `undefined`.

## `createFromComputedPool` — resolve relations from the pool, reactively

Wraps a pool store's `fromPool` in a `ComputedRef` so template bindings re-resolve when the
[entity pool](../../entities/ai/entities.patterns.md#pooling--the-shared-cache) updates — typically to
display a related entity's `$title` from a preloaded lookup when the row only carries an id or a bare
JSON relation:

```ts
const getBrand = createFromComputedPool(useBrandStore())
// template: {{ getBrand(item.brand)?.$title }}
```

The store argument is any `IPoolHandler<T>` — the per-entity Pinia store from `createStore` qualifies.
A plain `fromPool(x)` call resolves once; the computed variant keeps resolving as pooled items load
(e.g. after the preloader finishes).

## `useEventListener` — self-cleaning DOM listeners

Registers `callback` on `target` in `onMounted` and removes it in `onUnmounted` — call it during
`setup()` (it uses lifecycle hooks; calling it later registers nothing). `event` accepts multiple
space-separated names; `allChildren` is the capture flag (`addEventListener`'s third argument), used to
catch events from all descendants:

```ts
useEventListener(window, "resize", updateLayout)
useEventListener(document, "mousedown touchstart", handleOutsidePress, true)
```

## Gotchas

- **Component v-model belongs to `defineModel`.** Reaching for `useVModelField` inside `<script setup>`
  re-implements what the macro already does; the helper's place is composables receiving `props`/`emit`.
- **`useVModelField` must be paired with the matching emit.** The emit name is `update:<name>`; a
  mismatch (e.g. emitting `change`) silently breaks the write path — assignments to `.value` go nowhere.
- **Don't use `useVModelField` when the field must survive external reloads.** The library's own
  `useForm` keeps its `item` in a `ref` precisely because a pool reload elsewhere would overwrite a
  prop-backed computed mid-edit.
- **`createFromComputedPool` returns a computed of a function** — call it as `getBrand(x)` in the
  template (unwrapped automatically), or `getBrand.value(x)` in script code.
- **`useEventListener` never re-binds.** `target`, `event`, and `callback` are captured once at setup;
  wrap changing handlers in a stable closure.

## See also

- [vue-helper.examples.md](vue-helper.examples.md) · [vue-helper.signatures.md](vue-helper.signatures.md)
- [Entities](../../entities/ai/entities.instructions.md) — pooling, owned collections, and the slice
  child editors built on these helpers
- [UI](../../ui/ai/ui.instructions.md) — `Paging` and `Autocomplete`, the shipped consumers
