<template>
    <div class="rg-success bg-success bg-opacity-75 text-light">
        <slot name="message">{{ msg }}</slot>
    </div>
</template>

<script setup lang="ts">
withDefaults(
    defineProps<{
        msg: string
    }>(),
    { msg: "Success!" }
)
</script>
