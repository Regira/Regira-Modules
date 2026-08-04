<template>
    <component :is="iconComponent" class="rg-icon" :name="name" :size="size" />
</template>

<script setup lang="ts">
import { computed, inject } from "vue"
import { BsIcon } from "regira/vue/ui"
import { FaIcon } from "regira/vue/ui"
import { iconDefaults, type IconsConfig, type IconProps } from "regira/vue/ui"

withDefaults(defineProps<IconProps>(), { ...iconDefaults })

// renders the glyph set selected by iconPlugin ({ source }); defaults to Bootstrap icons
const config = inject<IconsConfig | undefined>("icons.config", undefined)
const iconComponent = computed(() => (config?.source === "fa" ? FaIcon : BsIcon))
</script>
