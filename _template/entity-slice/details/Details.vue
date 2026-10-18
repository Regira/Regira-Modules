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
import { onAuthenticated, useAuth, useGlobalAuth } from "@regira/modules/vue/auth"
import { LoadingContainer, Feedback } from "@regira/modules/vue/ui"
import { useDetails } from "@regira/modules/vue/entities/details"
import { FormStates } from "@regira/modules/vue/entities/form"
import config from "../config/config"
import useEntityStore from "../data/store"

const { service } = useEntityStore()

const { item, isLoading, overviewUrl, load, feedback } = useDetails(service)

// load whenever a token arrives and the row on screen is none, or another account's: someone else signing in behind the
// LoginModal gets their own row, and the previous one is cleared first, so a reload refused for them (403/404) never leaves
// it on screen; a refresh of the same account's token keeps the form and its edits, and so does the stored token a hard reload
// validates, which the mount fetch sent. immediate: false — useDetails already fetches on mount.
// No-auth app: delete these lines AND their import above, and drop load from the useDetails destructure (scaffold.mjs --no-auth does all three)
let shownFor = useGlobalAuth()?.authData?.userId // the account whose row is on screen, for onAuthenticated below
const shownToken = useAuth()?.tokenManager?.token // the stored token the mount fetch sends before onAuthenticated validates it
onAuthenticated(() => { const userId = useGlobalAuth()?.authData?.userId; if (useGlobalAuth()?.authData?.token === shownToken) shownFor = userId; if (userId !== shownFor) item.value = undefined; if (item.value == null) { shownFor = userId; load() } }, { immediate: false })

const router = useRouter()
function handleRemove() {
    router.push(overviewUrl || { name: config.key + "Overview" })
}
</script>
