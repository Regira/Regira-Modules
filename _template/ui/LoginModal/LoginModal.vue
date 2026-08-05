<template>
    <component :is="Modal" :is-visible="isVisible" :title="title" :showFooter="false">
        <slot v-bind="{ username }">
            <LoginForm
                @success="$emit('success', $event)"
                @forgot-password="$emit('forgotPassword', $event)"
                @signing-in="$emit('signingIn', $event)"
                @fail="$emit('fail', $event)"
            />
        </slot>
    </component>
</template>

<script setup lang="ts">
import { type LoginFormEmits, type LoginModalProps, type LoginModalSlots } from "@regira/modules/vue/auth"
import { injectModal } from "@regira/modules/vue/ui"
import { LoginForm } from "@regira/modules/vue/auth"

defineEmits<LoginFormEmits>()
withDefaults(defineProps<LoginModalProps>(), {
    title: "Sign in",
    isVisible: true,
})
defineSlots<LoginModalSlots>()

const Modal = injectModal()
</script>
