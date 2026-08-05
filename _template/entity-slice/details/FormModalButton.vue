<template>
    <button type="button" class="btn btn-default" @click="open">
        <slot>
            <Icon :name="config.key" />
        </slot>
        <Teleport to="#modals">
            <component
                :is="Modal"
                :is-visible="isOpen"
                :title="modalTitle || $t(config.detailsTitle || '')"
                :showFooter="false"
                :full-width="fullWidth"
                size="lg"
                @close="close"
                @cancel="close"
                @submit="close"
            >
                <Form
                    v-model="item"
                    :initial-tab="initialTab"
                    :readonly="readonly"
                    :is-popup="true"
                    @cancel="handleCancel"
                    @save="handleSave"
                    @remove="handleRemove"
                />
            </component>
        </Teleport>
    </button>
</template>

<script setup lang="ts">
import { computed, type Ref } from "vue"
import { Icon, injectModal } from "@regira/modules/vue/ui"
import { FormStates, useModal, type FormModalEmits, type SaveResult } from "@regira/modules/vue/entities"
import config from "../config/config"
import Entity from "../data/Entity"
import useEntityStore from "../data/store"
import Form from "./Form.vue"

const Modal = injectModal() // resolves the app-wide modal (modalPlugin swap-aware)

interface Emits extends /* @vue-ignore */ FormModalEmits<Entity> {}
const emit = defineEmits<
    Emits & {
        "update:modelValue": (item?: Entity) => true
        save: (result: SaveResult<Entity>) => true
        remove: (item: Entity) => true
        restore: (item: Entity) => true
        cancel: (arg: { canceled: Entity; original?: Entity }) => true
        changeState: (state: FormStates) => true
        open: (item: Entity, update: (newItem: Entity) => void) => true
        close: (item?: Entity) => true
    }
>()

const props = withDefaults(
    defineProps<{
        readonly?: boolean
        itemDefaults?: Ref<Record<string, any>> | Record<string, any>
        initialTab?: string
        label?: string
        closeOnSave?: boolean
        fullWidth?: boolean
    }>(),
    {
        fullWidth: config.isComplex,
    }
)

const modelRef = defineModel<Entity>()
const { service: entityService } = useEntityStore()

const modalTitle = computed(() => props.label || (modelRef.value != null && entityService.toEntity(modelRef.value).$title))
const { item, isOpen, close, open, handleSave, handleRemove, handleCancel } = useModal<Entity>({
    entityService,
    model: modelRef,
    itemDefaults: props.itemDefaults,
    closeOnSave: props.closeOnSave,
    closeOnCancel: false,
    closeOnDelete: true,
    emit,
})
</script>
