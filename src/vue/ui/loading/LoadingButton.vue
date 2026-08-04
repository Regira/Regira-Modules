<template>
    <button type="button" class="rg-loading-button btn" :disabled="disabled || isLoading">
        <template v-if="isLoading">
            <slot name="loading">
                <component :is="Loading" style="width: 1rem" />
            </slot>
        </template>
        <template v-else>
            <slot></slot>
        </template>
    </button>
</template>

<script setup lang="ts">
import { injectLoading, type LoadingButtonProps, type LoadingButtonSlots } from "./loading"

defineProps<LoadingButtonProps>()
defineSlots<LoadingButtonSlots>()

// the app-wide loading indicator (the loadingPlugin swap-in, the library Loading otherwise)
const Loading = injectLoading()
</script>
