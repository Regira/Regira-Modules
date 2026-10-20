<template>
    <component :is="Modal" :is-visible="isVisible" title="Forgot password" :showFooter="false" @close="$emit('close')">
        <slot v-bind="{ username }"></slot>
    </component>
</template>

<script setup lang="ts">
import { injectModal } from "@regira/modules/vue/ui"
import type { ForgotPasswordModalEmits, ForgotPasswordModalProps, ForgotPasswordModalSlots } from "@regira/modules/vue/auth"

defineEmits<ForgotPasswordModalEmits>()
withDefaults(defineProps<ForgotPasswordModalProps>(), { isVisible: true })
defineSlots<ForgotPasswordModalSlots>()

const Modal = injectModal()
</script>
