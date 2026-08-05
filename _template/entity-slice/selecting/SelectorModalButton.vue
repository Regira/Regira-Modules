<template>
    <button type="button" class="btn btn-default" @click="open">
        <slot><Icon name="search" /></slot>
        <Teleport to="#modals">
            <component
                :is="Modal"
                :is-visible="isOpen"
                :title="modalTitle || $t(config.overviewTitle || '')"
                :showFooter="true"
                :full-width="true"
                @close="close"
                @cancel="handleCancel"
                @submit="handleSubmit"
            >
                <SelectorSearch v-model="selected" :filter-defaults="filterDefaults" :item-defaults="itemDefaults" :page-size="maxResults" />
            </component>
        </Teleport>
    </button>
</template>

<script setup lang="ts">
import { ref, computed, watchEffect, type Ref } from "vue"
import { Icon, injectModal } from "@regira/modules/vue/ui"
import config from "../config/config"
import Entity from "../data/Entity"
import useEntityStore from "../data/store"
import SelectorSearch from "./SelectorSearch.vue"

const Modal = injectModal() // resolves the app-wide modal (modalPlugin swap-aware)

const emit = defineEmits<{
    (e: "update:modelValue", selected?: Entity): void
    (e: "select", selected?: Entity): void
}>()
const props = withDefaults(
    defineProps<{
        modelValue?: Entity
        filterDefaults?: Record<string, any>
        itemDefaults?: Ref<Record<string, any>> | Record<string, any>
        label?: string
        maxResults?: number
    }>(),
    { maxResults: 5 }
)

const selected = ref<Entity>()
const isOpen = ref(false)
const { service: entityService } = useEntityStore()
const modalTitle = computed(() => props.label || entityService.toEntity(props.modelValue || {}).$title)

function open() {
    selected.value = props.modelValue
    isOpen.value = true
}
function close() {
    isOpen.value = false
}
function handleCancel() {
    close()
}
function handleSubmit() {
    console.debug("submitSelection", { selected: selected.value })
    emit("update:modelValue", selected.value)
    emit("select", selected.value)
    close()
}

watchEffect(() => (selected.value = props.modelValue))
</script>
