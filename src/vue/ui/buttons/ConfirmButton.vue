<template>
    <button type="button" class="rg-confirm-button btn" :name="icon" @click="handleOpen">
        <slot name="button-content">
            <Icon v-if="icon != null" :name="icon" />
            <span v-if="buttonLabel" class="ms-1">{{ buttonLabel }}</span>
        </slot>
        <Teleport to="#modals">
            <slot name="modal">
                <component
                    :is="Modal"
                    :is-visible="showModal"
                    :type="modalType"
                    :title="modalTitle"
                    @submit="handleConfirm"
                    @cancel="handleCancel"
                    @close="handleClose"
                >
                    <slot></slot>
                </component>
            </slot>
        </Teleport>
    </button>
</template>

<script setup lang="ts">
import { ref } from "vue"
import Icon from "../icons/Icon.vue"
import { injectModal } from "../modal"
import { confirmButtonDefaults, type ConfirmButtonProps, type ConfirmButtonEmits, type ConfirmButtonSlots } from "./confirm"

const emit = defineEmits<ConfirmButtonEmits>()
withDefaults(defineProps<ConfirmButtonProps>(), { ...confirmButtonDefaults })
defineSlots<ConfirmButtonSlots>()

const Modal = injectModal()

const showModal = ref(false)
function handleConfirm() {
    emit("confirm")
    handleClose()
}
function handleOpen() {
    emit("open")
    showModal.value = true
}
function handleCancel() {
    emit("cancel")
    handleClose()
}
function handleClose() {
    emit("close")
    showModal.value = false
}

// Lets any affordance raise the same confirmation — a swipe gesture, a context menu, a keyboard shortcut —
// so a destructive action behind a gesture reuses this dialog instead of reimplementing it.
defineExpose({ open: handleOpen, close: handleClose })
</script>
