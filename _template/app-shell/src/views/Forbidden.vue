<script setup lang="ts">
defineProps<{ url?: string }>()
</script>
<template>
    <section>
        <h1>403 — forbidden</h1>
        <p class="text-danger">
            You are not authorized to view <router-link v-if="url" :to="url">{{ url }}</router-link
            >.
        </p>
    </section>
</template>
