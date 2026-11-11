<template>
    <!-- the sentinel and the fallback in one: scrolled near, it loads the next page; clicked, it does the same -->
    <div v-if="hasMore" ref="sentinel" class="rg-load-more text-center my-2">
        <LoadingButton class="btn-outline-secondary" :is-loading="isLoading" @click="handleLoad">
            <slot>{{ label }}</slot>
        </LoadingButton>
    </div>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from "vue"
import LoadingButton from "../loading/LoadingButton.vue"
import { loadMoreDefaults, type LoadMoreProps, type LoadMoreSlots } from "./paging"

const props = withDefaults(defineProps<LoadMoreProps>(), { ...loadMoreDefaults })
defineSlots<LoadMoreSlots>()

const sentinel = ref<HTMLElement>()
const isLoading = ref(false)

// without IntersectionObserver (server rendering, an old browser) the button alone loads the next page
const observer =
    typeof IntersectionObserver === "undefined"
        ? undefined
        : new IntersectionObserver((entries) => entries.some((x) => x.isIntersecting) && handleLoad(), { rootMargin: props.rootMargin })

// observing an element reports its position at once, so a sentinel that appears in view loads straight away
watch(sentinel, (el, old) => {
    if (old) observer?.unobserve(old)
    if (el) observer?.observe(el)
})
onBeforeUnmount(() => observer?.disconnect())

async function handleLoad() {
    if (isLoading.value || !props.hasMore) return
    const el = sentinel.value
    const offset = el?.offsetTop
    isLoading.value = true
    try {
        await props.load()
    } finally {
        isLoading.value = false
    }
    await nextTick()
    // Rows landed and the sentinel moved, but it may still be in view (a page shorter than the screen): observe it
    // afresh so the next page loads too. A load that added nothing (a failed fetch) leaves it in place, so a failure
    // is not retried in a loop; the button stays for the reader.
    if (el && el === sentinel.value && el.offsetTop !== offset) {
        observer?.unobserve(el)
        observer?.observe(el)
    }
}
</script>
