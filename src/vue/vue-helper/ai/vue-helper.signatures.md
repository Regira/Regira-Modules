# Regira JsLib Vue Helper — API Signatures Reference

Verbatim TypeScript signatures for `regira/vue/vue-helper` (from `dist/vue/vue-helper.d.ts`).
Do not guess — look up here first.

```ts
import { useVModelField, createFromComputedPool, useEventListener } from "regira/vue/vue-helper"
// the same three functions are re-exported from the "regira/vue" barrel
```

## Functions

```ts
import { type WritableComputedRef, type ComputedRef } from "vue"
import type { IEntity, IPoolHandler } from "./entities"

// name defaults to "modelValue"; writes emit `update:${name}`; reads fall back to defaultValue
// for composables receiving props/emit — in <script setup>, use native defineModel<T>() instead
export declare function useVModelField<T>(
    props: Readonly<Record<string, unknown>>,
    emit: any,
    name?: string,
    defaultValue?: T
): WritableComputedRef<T>

// store.fromPool wrapped in a computed — re-resolves when the pool updates
export declare function createFromComputedPool<T extends IEntity>(
    store: IPoolHandler<T>
): ComputedRef<(x: Array<T> | T | undefined) => Array<T> | T | undefined>

// registers in onMounted / removes in onUnmounted; event allows space-separated names;
// allChildren (default false) is addEventListener's capture flag
export declare function useEventListener(
    target: HTMLElement | Document | Window,
    event: string,
    callback: (e: Event) => void,
    allChildren?: boolean
): void
```

## See also

- [vue-helper.instructions.md](vue-helper.instructions.md)
- `IPoolHandler` lives in the entities module — [entities.signatures.md §7](../../entities/ai/entities.signatures.md)
