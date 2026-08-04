<template>
    <i :class="className" :style="style" />
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

// resolve a registered friendly key, else render the name as a raw icon class
const className = computed(() => iconMap.get(props.name) ?? props.name)
const fontSizes = { sm: 0.75, md: 1, lg: 2, xl: 3 }
const style = computed(() => ({ "font-size": `${fontSizes[props.size]}rem` }))
</script>
