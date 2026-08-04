<script setup lang="ts">
import { computed } from "vue"
import { useRoute, useRouter } from "vue-router"
import { ResetPasswordForm } from "regira/vue/auth"
import { FormSection } from "regira/vue/ui"

const route = useRoute()
const router = useRouter()

// ?token=… from the recovery link. A repeated param (?token=a&token=b) parses as an array — anything but
// a single string counts as no token, so a malformed link shows the notice instead of reaching the form.
const token = computed(() => (typeof route.query.token === "string" ? route.query.token : undefined))
// the API base64-encodes { Token, Username } into the link — decode the username for the hidden
// password-manager field so the browser can file the new password under the right account
const username = computed<string | undefined>(() => {
    try {
        return JSON.parse(atob(token.value!))?.Username
    } catch {
        return undefined // malformed/absent token: the form still works, just without the association
    }
})
</script>

<template>
    <section>
        <h1 class="my-4">{{ $t("resetPassword") }}</h1>
        <div class="row">
            <div class="col-md-8 col-lg-6">
                <FormSection v-if="token" :title="$t('chooseNewPassword')">
                    <!-- @login fires from the success message's "Sign in" button: home is protected, so the login modal pops there -->
                    <ResetPasswordForm :token="token" :username="username" @login="router.push({ name: 'home' })" />
                </FormSection>
                <p v-else class="text-danger">{{ $t("invalidResetLink") }}</p>
            </div>
        </div>
    </section>
</template>
