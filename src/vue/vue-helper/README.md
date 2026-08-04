# Regira Vue Helper (front-end)

`regira/vue/vue-helper` — three small Vue composition helpers the other modules are built on
(`useOwnedCollection`, `useListInput`, and `Autocomplete` use them internally).

Source: [`src/vue/vue-helper.ts`](../vue-helper.ts) (this folder holds the module docs). Also re-exported
from the `regira/vue` barrel.

> **In components, bind v-model with native `defineModel<T>()`** — the slice templates and examples do.
> `useVModelField` is the runtime equivalent for the places the `defineModel` compiler macro can't go:
> composables and factory functions that receive `props`/`emit` as arguments.

## What it provides

| Export                                                    | Purpose                                                                                                                                                                                            |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `useVModelField<T>(props, emit, name?, defaultValue?)`    | `WritableComputedRef<T>` bridging a prop to its `update:<name>` emit — for **composables** that receive `props`/`emit` (in a component's `<script setup>`, prefer native `defineModel`).           |
| `createFromComputedPool<T>(store)`                        | Wraps a pool store's `fromPool` in a `ComputedRef` so template bindings re-resolve when the [entity pool](../entities/README.md) updates — resolve relation display values from preloaded lookups. |
| `useEventListener(target, event, callback, allChildren?)` | Adds a DOM listener on mount and removes it on unmount; `event` accepts multiple space-separated names; `allChildren` is the capture flag.                                                         |
