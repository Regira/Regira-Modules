<script setup lang="ts">
defineProps<{ url?: string }>()
</script>
<template>
    <section>
        <h1>401 — unauthorized</h1>
        <p>
            Please sign in to view <router-link :to="url ?? '/'">{{ url }}</router-link
            >.
        </p>
    </section>
</template>
