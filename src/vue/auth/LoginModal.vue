<template>
    <component :is="Modal" :is-visible="isVisible" :title="title" :showFooter="false" @close="$emit('close')">
        <!-- showClose false: the modal contract's header-close-button slot gets an empty placeholder instead of the X -->
        <template v-if="!showClose" #header-close-button><span></span></template>
        <template #default>
            <slot v-bind="{ username }">
                <LoginForm
                    :labels="labels"
                    @success="$emit('success', $event)"
                    @forgot-password="$emit('forgotPassword', $event)"
                    @signing-in="$emit('signingIn', $event)"
                    @fail="$emit('fail', $event)"
                />
            </slot>
        </template>
    </component>
</template>

<script setup lang="ts">
import { type LoginModalEmits, type LoginModalProps, type LoginModalSlots } from "./useLoginForm"
import { injectModal } from "../ui/modal"
import LoginForm from "./LoginForm.vue"

defineEmits<LoginModalEmits>()
withDefaults(defineProps<LoginModalProps>(), {
    title: "Sign in",
    isVisible: true,
    showClose: true,
})
defineSlots<LoginModalSlots>()

const Modal = injectModal()
</script>
