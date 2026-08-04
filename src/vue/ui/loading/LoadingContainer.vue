<template>
    <div class="rg-loading-container position-relative" :style="{ height: isLoading ? `${getHeight()}px` : undefined }" ref="containerEl">
        <slot name="loading">
            <component
                :is="Loading"
                v-if="isLoading"
                class="position-absolute top-0 start-50 translate-middle-x"
                style="width: 20rem; max-width: 100%"
                ref="loadingEl"
            />
        </slot>
        <div :style="{ opacity: isLoading ? '0.4' : '' }">
            <slot></slot>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue"
import { injectLoading, type LoadingContainerProps, type LoadingContainerSlots } from "./loading"

defineProps<LoadingContainerProps>()
defineSlots<LoadingContainerSlots>()

// the app-wide loading indicator (the loadingPlugin swap-in, the library Loading otherwise)
const Loading = injectLoading()

const containerEl = ref<InstanceType<typeof HTMLDivElement> | null>(null)
const loadingEl = ref<{ imgEl?: HTMLImageElement | null } | null>(null)

function getHeight() {
    // height returns 0, so assert that img is a square and return width
    return loadingEl.value?.imgEl?.width
}

defineExpose({
    containerEl,
    // computed so the exposed property tracks the template ref (a plain read here would capture null at setup)
    loadingImgEl: computed(() => loadingEl.value?.imgEl),
})
</script>
