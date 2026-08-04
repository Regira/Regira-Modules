<template>
    <i :class="className" />
</template>

<script setup lang="ts">
import { computed } from "vue"
import { type IconSize, iconMap } from "./icons"

const props = withDefaults(
    defineProps<{
        name: string
        size?: IconSize
    }>(),
    {
        size: "md",
    }
)

const isClassLike = (name: string) => /\s/.test(name) || name.startsWith("bi-") || name.startsWith("fa-")
if (!iconMap.has(props.name) && !isClassLike(props.name)) {
    console.warn(`Icon "${props.name}" is not a registered key; pass a known key or a raw icon class.`)
}

const fontSizes = { sm: "fa-sm", md: "fa-md", lg: "fa-lg", xl: "fa-3x" }
// resolve a registered friendly key, else render the name as a raw icon class
const className = computed(() => [iconMap.get(props.name) ?? props.name, fontSizes[props.size]])
</script>
