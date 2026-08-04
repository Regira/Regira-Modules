<template>
    <a :href="`https://www.google.com/maps/?q=${address}`">
        <Icon name="map" />
        <slot></slot>
    </a>
</template>

<script setup lang="ts">
import { computed } from "vue"
import Icon from "../../icons/Icon.vue"
import type { GMapLinkProps, GMapLinkSlots } from "./gmaps"

const props = defineProps<GMapLinkProps>()
defineSlots<GMapLinkSlots>()

const address = computed<string>(() => (Array.isArray(props.modelValue) ? props.modelValue : [props.modelValue]).filter((x) => x).join(" "))
</script>
