<template>
    <form class="rg-reset-password-form" @submit.prevent="handleSubmit">
        <div v-if="isSuccess === false" class="mb-3">
            <div class="bg-danger border rounded text-light p-2">{{ text.failed }}</div>
        </div>
        <div v-if="isSuccess" class="mb-3">
            <div class="bg-success border rounded text-light p-2">
                {{ text.succeeded }}
                <button type="button" class="btn btn-link p-0 align-baseline" @click="emit('login')">{{ text.signIn }}</button>
            </div>
        </div>
        <!-- hidden username field so password managers can associate the new password with the account.
             visually-hidden, NOT d-none: display:none removes it from the form parse most password managers do -->
        <input
            type="text"
            class="visually-hidden"
            name="username"
            autocomplete="username"
            :value="username"
            readonly
            tabindex="-1"
            aria-hidden="true"
        />
        <div class="row mb-3">
            <label class="col-sm-3 col-form-label">{{ text.newPassword }}</label>
            <div class="col-sm-9">
                <input type="password" class="form-control" autocomplete="new-password" v-model="password" :disabled="isLoading" />
            </div>
        </div>
        <div class="row mb-3">
            <label class="col-sm-3 col-form-label">{{ text.confirmPassword }}</label>
            <div class="col-sm-9">
                <input
                    type="password"
                    class="form-control"
                    :class="{ 'is-invalid': confirmPassword && !passwordsMatch }"
                    autocomplete="new-password"
                    v-model="confirmPassword"
                    :disabled="isLoading"
                />
                <div class="invalid-feedback">{{ text.mismatch }}</div>
            </div>
        </div>
        <div class="row">
            <div class="col-sm-9 offset-sm-3">
                <button type="submit" class="btn btn-primary" :disabled="isLoading || !isFormValid">{{ text.submit }}</button>
            </div>
        </div>
    </form>
</template>

<script setup lang="ts">
import { computed } from "vue"
import { useResetPasswordForm, type ResetPasswordFormProps, type ResetPasswordFormEmits } from "./useResetPasswordForm"

const emit = defineEmits<ResetPasswordFormEmits>()
const props = defineProps<ResetPasswordFormProps>()
const text = computed(() => ({
    newPassword: props.labels?.newPassword ?? "New password",
    confirmPassword: props.labels?.confirmPassword ?? "Confirm password",
    mismatch: props.labels?.mismatch ?? "Passwords don't match.",
    submit: props.labels?.submit ?? "Reset password",
    succeeded: props.labels?.succeeded ?? "Password reset.",
    signIn: props.labels?.signIn ?? "Sign in",
    failed: props.labels?.failed ?? "Unfortunately, resetting the password failed.",
}))

const { password, confirmPassword, isLoading, isSuccess, passwordsMatch, isFormValid, handleSubmit } = useResetPasswordForm(props, emit)
</script>
