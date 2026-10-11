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
import { onAuthenticated, useGlobalAuth } from "@regira/modules/vue/auth"
import { LoadingContainer, Feedback } from "@regira/modules/vue/ui"
import { useDetails } from "@regira/modules/vue/entities/details"
import { FormStates } from "@regira/modules/vue/entities/form"
import config from "../config/config"
import useEntityStore from "../data/store"

const { service } = useEntityStore()

const { item, isLoading, overviewUrl, load, feedback } = useDetails(service)

// load whenever a token arrives and the row on screen is none, or another account's: someone else signing in behind the
// LoginModal gets their own row, while a refresh of the same account's token keeps the form and its edits. immediate: false —
// useDetails already fetches on mount. No-auth app: delete these two lines AND their import above, and drop load from the useDetails destructure (scaffold.mjs --no-auth does all three)
let shownFor = useGlobalAuth()?.authData?.userId // the account whose row is on screen, for onAuthenticated below
onAuthenticated(() => { const userId = useGlobalAuth()?.authData?.userId; if (item.value == null || userId !== shownFor) { shownFor = userId; load() } }, { immediate: false })

const router = useRouter()
function handleRemove() {
    router.push(overviewUrl || { name: config.key + "Overview" })
}
</script>
