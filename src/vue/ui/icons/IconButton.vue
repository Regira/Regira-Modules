<template>
    <button :type="type" class="rg-icon-button btn d-inline-flex align-items-center gap-1">
        <Icon :name="icon" :size="size" />
        <slot></slot>
    </button>
</template>

<script setup lang="ts">
import Icon from "./Icon.vue"
import { iconButtonDefaults, type IconButtonProps, type IconButtonSlots } from "./icons"

withDefaults(defineProps<IconButtonProps>(), { ...iconButtonDefaults })
defineSlots<IconButtonSlots>()
</script>
