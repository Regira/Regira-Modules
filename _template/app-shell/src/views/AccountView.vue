<script setup lang="ts">
import { computed } from "vue"
import { ChangePasswordForm, getAccountName } from "@regira/modules/vue/auth"
import { FormSection } from "@regira/modules/vue/ui"

// resolved from $auth — the store the auth plugin was configured with, NOT necessarily the module's
// default useAuthStore(); not every JWT carries a displayName claim, hence the $t fallback below
const accountName = computed(() => getAccountName())
</script>
<template>
    <section>
        <h1 class="my-4">{{ accountName ?? $t("account") }}</h1>
        <div class="row mb-3">
            <div class="col-md-8 col-lg-6">
                <FormSection :title="$t('changePassword')">
                    <!-- username feeds the hidden password-manager field -->
                    <ChangePasswordForm :username="accountName" />
                </FormSection>
            </div>
        </div>
    </section>
</template>
