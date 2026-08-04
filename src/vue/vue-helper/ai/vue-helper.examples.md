# Regira JsLib Vue Helper — Examples

Verify signatures in [vue-helper.signatures.md](vue-helper.signatures.md).

## Component v-model — native `defineModel` (no helper)

In `<script setup>`, the compiler macro is the idiom — default and named models included. The slice
templates bind child editors, filters, and list rows this way:

```vue
<!-- entities/orders/order-lines/Form.vue — child editor bound to the parent's row -->
<script setup lang="ts">
import type Entity from "./Entity"

const emit = defineEmits<{ (e: "request-save", value: Entity): void }>()
defineProps<{ readonly?: boolean }>()

const item = defineModel<Entity>({ required: true })
const ids = defineModel<Array<number>>("idsValue", { default: () => [] }) // named secondary model
</script>

<template>
    <input v-model="item.quantity" type="number" class="form-control" />
</template>
```

## Composable v-model — `useVModelField`

A composable receives `props`/`emit` as arguments and can't call the `defineModel` macro — bridge the
host component's v-model with `useVModelField` instead. This mirrors the library's own
`useOwnedCollection` / `useListInput`:

```ts
// composables/useDraftList.ts
import { useVModelField } from "regira/vue/vue-helper"

export function useDraftList<T extends { id: number }>({ props, emit }: { props: Readonly<Record<string, any>>; emit: any }) {
    const items = useVModelField<Array<T>>(props, emit) // reads props.modelValue; assignments emit update:modelValue

    function add(item: T) {
        items.value = [...items.value, item]
    }
    function removeAt(i: number) {
        items.value = items.value.filter((_, x) => x !== i)
    }

    return { items, add, removeAt }
}
```

```vue
<!-- the host component just forwards its own v-model pair -->
<script setup lang="ts">
const props = defineProps<{ modelValue?: Array<OrderLine> }>()
const emit = defineEmits<{ (e: "update:modelValue", value: Array<OrderLine>): void }>()

const { items, add, removeAt } = useDraftList<OrderLine>({ props, emit })
</script>
```

## Resolve relations from the pool with `createFromComputedPool`

Rows often carry only an id or a bare JSON relation; resolve the display value from the preloaded pool,
reactively (re-renders when the pool fills):

```vue
<script setup lang="ts">
import { createFromComputedPool } from "regira/vue/vue-helper"
import useBrandStore from "@/entities/brands/data/store"

const getBrand = createFromComputedPool(useBrandStore())
</script>

<template>
    <td>{{ getBrand(item.brand)?.$title }}</td>
</template>
```

## Self-cleaning DOM listeners with `useEventListener`

Registered on mount, removed on unmount — call during `setup()`:

```ts
import { useEventListener } from "regira/vue/vue-helper"

useEventListener(window, "resize", updateLayout)
// space-separated events + capture flag (catch presses on all descendants):
useEventListener(document, "mousedown touchstart", handleOutsidePress, true)
```

## See also

- [vue-helper.instructions.md](vue-helper.instructions.md) · [vue-helper.signatures.md](vue-helper.signatures.md)
- [entities.patterns.md → Pooling](../../entities/ai/entities.patterns.md#pooling--the-shared-cache)
