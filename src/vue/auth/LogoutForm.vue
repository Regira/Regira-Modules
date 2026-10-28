<template>
    <form class="rg-logout-form">
        <button type="button" class="btn btn-sm btn-secondary" @click="logout">{{ buttonText }}</button>
    </form>
</template>

<script setup lang="ts">
import { useRouter } from "vue-router"
import { computed } from "vue"
import useAuthStore from "./store"
import type { LogoutFormProps } from "./logout-form"

const props = defineProps<LogoutFormProps>()

const store = useAuthStore()
const router = useRouter()

const logout = () => {
    store.logout()
    const currentUrl = router.currentRoute.value.fullPath
    router.push({ name: "login", query: { returnUrl: currentUrl } })
}
// {name} stands where the language puts the user's name ("{name} afmelden")
// a function, so a "$&" in a name stays text instead of a replacement pattern
const buttonText = computed(() => (props.labels?.signOut ?? "Sign out {name}").replace("{name}", () => store.displayName ?? "").trim())
</script>
