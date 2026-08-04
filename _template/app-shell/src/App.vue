<script setup lang="ts">
import { computed, ref, watch } from "vue" // @auth:only
import { Feedback, LoadingContainer } from "regira/vue/ui"
import { LoginModal, LoginForm, ForgotPasswordModal, useAuthStore } from "regira/vue/auth" // @auth:only
import ForgotPasswordForm from "@/components/users/ForgotPasswordForm.vue" // @auth:only
import { AppStatus } from "regira/vue/app"
import TheHeader from "@/components/layout/TheHeader.vue"
import TheFooter from "@/components/layout/TheFooter.vue"
import Main from "@/components/layout/Main.vue"

// @auth:block-start
const authStore = useAuthStore()
// isRequired is route-driven (auth enabled + no allowAnonymous meta), so on any protected route — home
// included — an unauthenticated visitor gets the sign-in modal immediately, before any 401.
const showLogin = computed(() => authStore.isRequired && !authStore.isAuthenticated)

// LoginForm's "Forgot password?" button only EMITS — without this it does nothing. Swap the login modal
// for the recovery one (never both at once) and swap back when the user returns to sign-in.
const forgotUsername = ref<string>()
const showForgot = ref(false)
function handleForgotPassword(username?: string) {
    forgotUsername.value = username
    showForgot.value = true
}
// Clear the recovery step whenever the login gate closes — the v-if alone only HIDES it, so leaving to an
// anonymous route (or signing in elsewhere) and coming back would reopen recovery instead of sign-in.
watch(showLogin, (gateOpen) => {
    if (!gateOpen) showForgot.value = false
})
// @auth:block-end
</script>

<template>
    <div class="page">
        <header class="container-fluid bg-light"><TheHeader /></header>
        <section class="container-fluid position-relative overflow-hidden">
            <Feedback :feedback="$feedback" :enable-error-popup="true" />
        </section>
        <main class="container-fluid">
            <!-- @auth:block-start -->
            <LoadingContainer :is-loading="$appStatus !== AppStatus.Ready && (!$auth.enabled || $auth.isAuthenticated)">
            <!-- @auth:block-end -->
            <!-- @noauth:block-start -->
            <LoadingContainer :is-loading="$appStatus !== AppStatus.Ready">
            <!-- @noauth:block-end -->
                <Main />
            </LoadingContainer>
        </main>
        <footer class="container-fluid bg-light"><TheFooter /></footer>

        <!-- @auth:block-start -->
        <Teleport to="#loginModal">
            <!-- v-if (not :is-visible): unmounting removes mask + dialog atomically — no stranded overlay -->
            <LoginModal v-if="showLogin && !showForgot" :title="$t('signIn')">
                <LoginForm @forgot-password="handleForgotPassword" />
            </LoginModal>
            <!-- the library ships the recovery MODAL, not the form — slot in the app's own (users/).
                 `showLogin &&` matters: without it, authenticating by another path (token refresh, a sign-in
                 in a second tab) leaves this modal stranded over an authenticated app.
                 @close falls through to the modal's header X, which would otherwise be a dead button. -->
            <ForgotPasswordModal v-if="showLogin && showForgot" :username="forgotUsername" @close="showForgot = false" v-slot="{ username }">
                <ForgotPasswordForm :username="username" @login="showForgot = false" />
            </ForgotPasswordModal>
        </Teleport>
        <!-- @auth:block-end -->
    </div>
</template>
