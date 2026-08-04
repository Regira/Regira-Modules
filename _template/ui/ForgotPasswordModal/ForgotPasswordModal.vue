<template>
    <component :is="Modal" :is-visible="isVisible" title="Forgot password" :showFooter="false">
        <slot v-bind="{ username }"></slot>
    </component>
</template>

<script setup lang="ts">
import { injectModal } from "regira/vue/ui"
import type { ForgotPasswordModalProps, ForgotPasswordModalSlots } from "regira/vue/auth"

withDefaults(defineProps<ForgotPasswordModalProps>(), { isVisible: true })
defineSlots<ForgotPasswordModalSlots>()

const Modal = injectModal()
</script>
