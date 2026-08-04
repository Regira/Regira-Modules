<template>
    <section>
        <LoadingContainer :is-loading="isLoading">
            <RouterView v-slot="{ Component }">
                <Feedback :feedback="feedback" />
                <component
                    :is="Component"
                    v-if="item != null"
                    v-model="item"
                    :overviewUrl="overviewUrl"
                    @change-state="isLoading = $event == FormStates.pending"
                    @remove="handleRemove"
                />
            </RouterView>
        </LoadingContainer>
    </section>
</template>

<script setup lang="ts">
import { RouterView, useRouter } from "vue-router"
import { useAuthStore } from "regira/vue/auth"
import { LoadingContainer, Feedback } from "regira/vue/ui"
import { useDetails } from "regira/vue/entities/details"
import { FormStates } from "regira/vue/entities/form"
import config from "../config/config"
import useEntityStore from "../data/store"

const { service } = useEntityStore()

const { item, isLoading, overviewUrl, load, feedback } = useDetails(service)

// trigger load when logging in (only load when item has not been loaded before) — no-auth app: delete these two lines and drop load from the useDetails destructure above (scaffold.mjs --no-auth does both)
const authStore = useAuthStore()
authStore.$onAction(({ name, after }) => name == "login" && after(() => item.value == null && authStore.isAuthenticated && load()))

const router = useRouter()
function handleRemove() {
    router.push(overviewUrl || { name: config.key + "Overview" })
}
</script>
