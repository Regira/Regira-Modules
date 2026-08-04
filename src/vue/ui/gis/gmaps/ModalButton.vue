<template>
    <button type="button" @click="showModal = true">
        <slot><Icon name="map" /></slot>
        <teleport to="#modals">
            <component :is="Modal" :is-visible="showModal" :title="address" :show-footer="false" :full-width="true" @close="showModal = false">
                <GMap id="gmap_canvas" :modelValue="modelValue" :zoom="zoom" class="w-100" />
            </component>
        </teleport>
    </button>
</template>

<script setup lang="ts">
import { ref, computed } from "vue"
import Icon from "../../icons/Icon.vue"
import { injectModal } from "../../modal"
import GMap from "./GMap.vue"
import type { GMapButtonProps, GMapButtonSlots } from "./gmaps"

const props = defineProps<GMapButtonProps>()
defineSlots<GMapButtonSlots>()

const address = computed<string>(() => (Array.isArray(props.modelValue) ? props.modelValue : [props.modelValue]).filter((x) => x).join(" "))

const Modal = injectModal()
const showModal = ref(false)
</script>

<style scoped>
#gmap_canvas {
    overflow: hidden;
    background: none !important;
    min-height: 75vh;
}
</style>
