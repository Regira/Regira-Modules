<template>
    <form class="rg-logout-form">
        <button type="button" class="btn btn-sm btn-secondary" @click="logout">{{ displayName }} afmelden</button>
    </form>
</template>

<script setup lang="ts">
import { useRouter } from "vue-router"
import { computed } from "vue"
import useAuthStore from "./store"

const store = useAuthStore()
const router = useRouter()

const logout = () => {
    store.logout()
    const currentUrl = router.currentRoute.value.fullPath
    router.push({ name: "login", query: { returnUrl: currentUrl } })
}
const displayName = computed(() => store.displayName)
</script>
