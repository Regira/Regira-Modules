<!-- Owned m2m editor for __Parent__.__Children__ — each join row is a chip selecting one __Target__.
     Bind it in the parent Form.vue to the ARRAY: <__Child__Overview v-model="item.__children__" />
     Removing a persisted chip marks `_deleted` (tinted, click again to restore); the parent's
     EntityService.prepareItem drops flagged rows so `Related()` deletes them by omission. A chip added this
     session is dropped outright — InputSelectorInline tracks it by identity, so new rows need no id. -->
<script setup lang="ts">
import { InputSelectorInline } from "@regira/modules/vue/entities"
import {
    InputSelector as __Target__Selector,
    FormModalButton as __Target__Button,
    useEntityStore as use__Target__Store,
    type Entity as __Target__,
} from "__targetAlias__"
import type { __Child__ } from "./Entity"

const model = defineModel<Array<__Child__>>()

// Rows arrive from ?includes= as plain DTOs — they have the API's fields but none of the model's getters, so
// row.__target__.$title reads undefined. fromPool rehydrates through the sibling slice's pool, which also
// makes a chip edit relabel live. It is a pass-through, so widen the nested DTO to the entity type here.
const { fromPool } = use__Target__Store()
const hydrate = (x?: Partial<__Target__>) => fromPool(x as __Target__)
</script>

<template>
    <InputSelectorInline v-model="model" :row-key="(r) => r.__target__Id" :exclude-key="(r) => r.__target__Id">
        <template #chip="{ row }">
            <!-- the related entity's own edit affordance — keep it, a bare label loses the way in -->
            <__Target__Button :modelValue="hydrate(row.__target__)" />
            {{ hydrate(row.__target__)?.$title }}
        </template>
        <template #selector="{ add, exclude }">
            <__Target__Selector :filter-defaults="{ exclude }" @select="(x?: __Target__) => x && add({ __target__Id: x.id!, __target__: x })" />
        </template>
    </InputSelectorInline>
</template>
