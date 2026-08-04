<template>
    <form class="rg-change-password-form" @submit.prevent="handleSubmit">
        <div v-if="isSuccess === false" class="mb-3">
            <div class="bg-danger border rounded text-light p-2">Unfortunately, changing the password failed.</div>
        </div>
        <div v-if="isSuccess" class="mb-3">
            <div class="bg-success border rounded text-light p-2">Password changed.</div>
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
            <label class="col-sm-3 col-form-label">Current password</label>
            <div class="col-sm-9">
                <input type="password" class="form-control" autocomplete="current-password" v-model="currentPassword" :disabled="isLoading" />
            </div>
        </div>
        <div class="row mb-3">
            <label class="col-sm-3 col-form-label">New password</label>
            <div class="col-sm-9">
                <input type="password" class="form-control" autocomplete="new-password" v-model="newPassword" :disabled="isLoading" />
            </div>
        </div>
        <div class="row mb-3">
            <label class="col-sm-3 col-form-label">Confirm password</label>
            <div class="col-sm-9">
                <input
                    type="password"
                    class="form-control"
                    :class="{ 'is-invalid': confirmPassword && !passwordsMatch }"
                    autocomplete="new-password"
                    v-model="confirmPassword"
                    :disabled="isLoading"
                />
                <div class="invalid-feedback">Passwords don't match.</div>
            </div>
        </div>
        <div class="row">
            <div class="col-sm-9 offset-sm-3">
                <button type="submit" class="btn btn-primary" :disabled="isLoading || !isFormValid">Change password</button>
            </div>
        </div>
    </form>
</template>

<script setup lang="ts">
import { useChangePasswordForm, type ChangePasswordFormEmits, type ChangePasswordFormProps } from "./useChangePasswordForm"

const emit = defineEmits<ChangePasswordFormEmits>()
// no store lookup here — the configured auth store is app state (plugin option), not this module's
// default `useAuthStore()`; the host passes the account name (see `getAccountName()`)
defineProps<ChangePasswordFormProps>()

const { currentPassword, newPassword, confirmPassword, isLoading, isSuccess, passwordsMatch, isFormValid, handleSubmit } = useChangePasswordForm(emit)
</script>
