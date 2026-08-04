<template>
    <form class="rg-login-form" @submit.prevent="handleSubmit" ref="loginForm">
        <div class="mb-3 position-relative" v-if="failed">
            <div class="bg-danger border rounded text-light p-2">
                Unfortunately, signing in failed.
                <span v-if="isLockedOut">Try again in 5 min.</span>
            </div>
        </div>
        <div class="row mb-3">
            <label for="username" class="col-sm-3 col-form-label">Username</label>
            <div class="col-sm-9">
                <div class="input-group">
                    <input class="form-control" autocomplete="username email" v-model="username" :disabled="signingIn" />
                </div>
            </div>
        </div>
        <div class="row mb-3">
            <label for="password" class="col-sm-3 col-form-label">Password</label>
            <div class="col-sm-9">
                <input type="password" class="form-control" autocomplete="password current-password" v-model="password" :disabled="signingIn" />
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
import { useLoginForm, type LoginFormEmits, type LoginFormProps } from "./useLoginForm"

const emit = defineEmits<LoginFormEmits>()
const props = defineProps<LoginFormProps>()

const { username, password, signingIn, failed, isLockedOut, handleSubmit, handleForgotPassword } = useLoginForm(props, emit)
</script>
