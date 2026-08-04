<script setup lang="ts">
import { useConfig } from "@/app-config"
import { Dashboard } from "@/components/entity-navigation"
const { title } = useConfig()
</script>
<template>
    <section>
        <h1 class="text-center my-4">{{ $tm(title) }}</h1>
        <Dashboard />
    </section>
</template>
