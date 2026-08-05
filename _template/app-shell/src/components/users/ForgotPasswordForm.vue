<script setup lang="ts">
import { useRouter } from "vue-router"
import { useForgotPasswordForm, type ForgotPasswordFormProps, type ForgotPasswordFormEmits } from "@regira/modules/vue/auth"
import { useLang } from "@regira/modules/vue/lang"
import { useConfig } from "@/app-config"

const emit = defineEmits<ForgotPasswordFormEmits>()
const props = defineProps<ForgotPasswordFormProps>()

const router = useRouter()
const { title } = useConfig()
// The API mails `siteUrl` with "?token=…" appended, so it must be the ABSOLUTE url of the reset PAGE.
// Passing location.origin (a tempting shortcut) lands the recovery link on the dashboard, where nothing
// reads the token. router.resolve keeps it correct under a non-root Vite base.
const siteUrl = new URL(router.resolve({ name: "resetPassword" }).href, location.origin).href
const siteName = useLang().translateMessage(title)
const { username, isLoading, isFormValid, isSuccess, handleSubmit } = useForgotPasswordForm(props, emit, { siteUrl, siteName })
</script>

<template>
    <form @submit.prevent="handleSubmit">
        <!-- deliberately the same answer whether or not the account exists — do not leak which usernames are real -->
        <div v-if="isSuccess" class="alert alert-success">{{ $t("recoveryMailSent") }}</div>
        <div v-if="isSuccess === false" class="alert alert-danger">{{ $t("recoveryMailFailed") }}</div>
        <div v-if="!isSuccess" class="mb-3">
            <label class="form-label">{{ $t("username") }}</label>
            <input v-model.trim="username" type="text" class="form-control" autocomplete="username" :disabled="isLoading" v-focus />
        </div>
        <div class="d-flex gap-2">
            <button v-if="!isSuccess" type="submit" class="btn btn-primary" :disabled="isLoading || !isFormValid">
                {{ $t("sendRecoveryLink") }}
            </button>
            <button type="button" class="btn btn-link" @click="emit('login', username)">{{ $t("backToSignIn") }}</button>
        </div>
    </form>
</template>
