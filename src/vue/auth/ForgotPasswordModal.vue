<template>
    <component :is="Modal" :is-visible="isVisible" title="Forgot password" :showFooter="false">
        <slot v-bind="{ username }"></slot>
    </component>
</template>

<script setup lang="ts">
import { injectModal } from "../ui/modal"
import type { ForgotPasswordModalProps, ForgotPasswordModalSlots } from "./useForgotPasswordForm"

withDefaults(defineProps<ForgotPasswordModalProps>(), { isVisible: true })
defineSlots<ForgotPasswordModalSlots>()

const Modal = injectModal()
</script>
