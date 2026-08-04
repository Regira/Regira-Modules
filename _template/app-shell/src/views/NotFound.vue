<script setup lang="ts">
defineProps<{ url?: string }>()
</script>
<template>
    <section>
        <h1>404 — page not found</h1>
        <p>
            Page <router-link :to="url ?? '/'">{{ url }}</router-link> was not found.
        </p>
    </section>
</template>
