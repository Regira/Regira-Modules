<template>
    <span class="result-summary text-muted small">
        <slot :visible-count="visibleCount" :total-count="totalCount">{{ visibleCount ?? 0 }} / {{ totalCount ?? 0 }}</slot>
    </span>
</template>

<script setup lang="ts">
import type { ResultSummaryProps, ResultSummarySlots } from "./paging"

defineProps<ResultSummaryProps>()
defineSlots<ResultSummarySlots>()
</script>
