<script setup lang="ts">
import { ref } from "vue"
import type { RouteLocationRaw, LocationQueryRaw } from "vue-router"
import { Icon } from "@regira/modules/vue/ui"
import { isNavItem, type INavItem } from "@regira/modules/vue/entities"
import { useNavigation } from "./functions"
const { navbarTree } = useNavigation()
const openId = ref<string>()
const to = (v: INavItem): RouteLocationRaw => ({ name: v.routeName, query: (v.initialQuery ?? {}) as LocationQueryRaw })
</script>
<template>
    <ul v-if="navbarTree" class="navbar-nav me-auto">
        <li
            v-for="node in navbarTree.roots"
            :key="node.value.id"
            class="nav-item"
            :class="{ dropdown: !isNavItem(node.value) }"
            v-click-outside="
                () => {
                    if (openId === node.value.id) openId = undefined
                }
            "
        >
            <router-link v-if="isNavItem(node.value)" class="nav-link" :to="to(node.value as INavItem)">
                <Icon :name="node.value.icon ?? ''" /><span class="d-sm-none d-lg-inline ms-1">{{ $t(node.value.title) }}</span>
            </router-link>
            <template v-else>
                <a class="nav-link dropdown-toggle" href="#" @click.prevent="openId = openId === node.value.id ? undefined : node.value.id">
                    <Icon :name="node.value.icon ?? ''" /><span class="d-sm-none d-lg-inline ms-1">{{ $t(node.value.title) }}</span>
                </a>
                <ul class="dropdown-menu" :class="{ show: openId === node.value.id }">
                    <li v-for="child in node.children" :key="child.value.id">
                        <router-link class="dropdown-item" :to="to(child.value as INavItem)">{{ $t(child.value.title) }}</router-link>
                    </li>
                </ul>
            </template>
        </li>
    </ul>
</template>
