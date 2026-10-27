<template>
    <component :is="Modal" :is-visible="isVisible" :title="title" :showFooter="false" @close="$emit('close')">
        <slot v-bind="{ username }"></slot>
    </component>
</template>

<script setup lang="ts">
import { injectModal } from "../ui/modal"
import type { ForgotPasswordModalEmits, ForgotPasswordModalProps, ForgotPasswordModalSlots } from "./useForgotPasswordForm"

defineEmits<ForgotPasswordModalEmits>()
withDefaults(defineProps<ForgotPasswordModalProps>(), { title: "Forgot password", isVisible: true })
defineSlots<ForgotPasswordModalSlots>()

const Modal = injectModal()
</script>
