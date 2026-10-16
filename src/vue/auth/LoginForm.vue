<template>
    <form class="rg-login-form" @submit.prevent="handleSubmit" ref="loginForm">
        <div class="mb-3 position-relative" v-if="failed">
            <div class="bg-danger border rounded text-light p-2">
                <template v-if="isNotAllowed">This account is not confirmed yet. Follow the link we mailed you.</template>
                <template v-else>
                    Unfortunately, signing in failed.
                    <span v-if="isLockedOut">Try again in 5 min.</span>
                </template>
            </div>
        </div>
        <div class="row mb-3">
            <label :for="`${id}-username`" class="col-sm-3 col-form-label">Username</label>
            <div class="col-sm-9">
                <div class="input-group">
                    <input :id="`${id}-username`" type="text" name="username" class="form-control" autocomplete="username" v-model="username" :disabled="signingIn" />
                </div>
            </div>
        </div>
        <div class="row mb-3">
            <label :for="`${id}-password`" class="col-sm-3 col-form-label">Password</label>
            <div class="col-sm-9">
                <input :id="`${id}-password`" type="password" name="password" class="form-control" autocomplete="current-password" v-model="password" :disabled="signingIn" />
            </div>
        </div>
        <div class="row">
            <div class="col-sm-3">
                <button type="submit" class="btn btn-primary" :disabled="signingIn">Sign in</button>
            </div>
            <div class="col-sm">
                <span v-if="signingIn" class="text-info"> Signing in ... </span>
                <button v-else type="button" class="btn btn-link" @click="handleForgotPassword">Forgot password?</button>
            </div>
        </div>
    </form>
</template>

<script setup lang="ts">
import { useId } from "vue"
import { useLoginForm, type LoginFormEmits, type LoginFormProps } from "./useLoginForm"

const emit = defineEmits<LoginFormEmits>()
const props = defineProps<LoginFormProps>()
// unique per instance: a page can hold two forms (a sign-in view and the login modal)
const id = useId()

const { username, password, signingIn, failed, isLockedOut, isNotAllowed, handleSubmit, handleForgotPassword } = useLoginForm(props, emit)
</script>
