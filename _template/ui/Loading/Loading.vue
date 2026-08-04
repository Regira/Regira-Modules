<template>
    <img v-if="img" class="rg-loading" :src="img" ref="imgEl" alt="" />
    <div v-else class="rg-loading rg-loading-fallback d-flex justify-content-center" role="status">
        <span class="rg-loading-spinner spinner-border text-primary" aria-hidden="true"></span>
        <span class="visually-hidden">{{ label }}</span>
    </div>
</template>

<script setup lang="ts">
import { ref, inject } from "vue"

// `loadingImg` brands the indicator; without one the built-in spinner renders, so the loading state is
// always visible — an app that never provides the image would otherwise show an <img> with no src.
const img = inject<string>("loadingImg")
const label = inject<string>("loadingLabel", "Loading…")
const imgEl = ref<InstanceType<typeof HTMLImageElement> | null>(null)

defineExpose({
    imgEl,
    dimensions: () => [imgEl.value?.width, imgEl.value?.height],
    height: () => imgEl.value?.naturalHeight,
})
</script>

<style>
/* unscoped like every other `rg-*` hook: a scoped rule carries the `[data-v-…]` attribute and would
   outrank the plain class the theme.scss restyle path is documented to use */

/* the consumer sizes the indicator (LoadingContainer passes a width), so the wrapper absorbs it and the
   spinner keeps its own square dimensions instead of stretching into an ellipse */
.rg-loading-fallback {
    width: 100%;
}
.rg-loading-spinner {
    width: 2rem;
    height: 2rem;
}
@media (prefers-reduced-motion: reduce) {
    .rg-loading-spinner {
        animation: none;
        opacity: 0.65;
    }
}
</style>
