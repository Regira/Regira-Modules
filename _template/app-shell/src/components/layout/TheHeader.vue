<script setup lang="ts">
import { computed, ref } from "vue"
import { useAuthStore, getAccountName } from "@regira/modules/vue/auth" // @auth:only
import { useConfig } from "@/app-config"
import { NavBar, NavSearch } from "@/components/entity-navigation"

const { title } = useConfig()
const open = ref(false)
const closeMenu = () => (open.value = false)
const authStore = useAuthStore() // @auth:only
const logout = () => authStore.logout() // @auth:only
// resolved from $auth (the store the auth plugin was configured with); not every JWT carries a displayName claim // @auth:only
const accountLabel = computed(() => getAccountName()) // @auth:only
</script>
<template>
    <nav class="navbar navbar-expand-sm" v-click-outside="closeMenu">
        <div class="container-fluid">
            <router-link class="navbar-brand" :to="{ name: 'home' }">{{ $tm(title) }}</router-link>
            <button class="navbar-toggler" type="button" @click.stop="open = !open"><span class="navbar-toggler-icon"></span></button>
            <div class="collapse navbar-collapse" :class="{ show: open }">
                <NavBar @select="closeMenu" />
                <div class="d-flex ms-auto align-items-center gap-2">
                    <NavSearch @search="closeMenu" />
                    <!-- @auth:block-start -->
                    <router-link v-if="$auth.enabled && $auth.isAuthenticated" class="nav-link" :to="{ name: 'account' }" @click="closeMenu">
                        <!-- the $t fallback guards a token with no name claims at all — never an empty (invisible) link -->
                        {{ accountLabel ?? $t("account") }}
                    </router-link>
                    <button v-if="$auth.enabled && $auth.isAuthenticated" class="btn btn-outline-secondary btn-sm" @click="logout">
                        {{ $t("signOut") }}
                    </button>
                    <!-- @auth:block-end -->
                </div>
            </div>
        </div>
    </nav>
</template>
