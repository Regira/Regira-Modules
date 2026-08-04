<template>
    <span class="rg-nullable-label" :class="{ 'italic-muted': !label }">
        <template v-if="label">{{ label }}</template>
        <template v-else><slot></slot></template>
    </span>
</template>

<script setup lang="ts">
import type { NullableLabelProps, NullableLabelSlots } from "./inputs"

defineProps<NullableLabelProps>()
defineSlots<NullableLabelSlots>()
</script>
