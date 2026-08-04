<template>
    <RouterLink class="page-link" :to="to" :title="'page ' + page" activeClass="active-page">
        <slot>{{ page }}</slot>
    </RouterLink>
</template>

<script setup lang="ts">
import type { RouteLocationRaw } from "vue-router"

defineProps<{
    to: RouteLocationRaw
    page: number
}>()
</script>
