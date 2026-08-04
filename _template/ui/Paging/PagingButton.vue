<template>
    <button type="button" class="btn btn-link page-link" :title="'page ' + page">
        <slot>{{ page }}</slot>
    </button>
</template>

<script setup lang="ts">
import type { RouteLocationRaw } from "vue-router"

defineProps<{ to: RouteLocationRaw; page: number }>()
</script>
