<template>
    <ul class="rg-tab-nav nav" :class="{ 'nav-pills': !$screen?.isLarge, 'nav-tabs': $screen?.isLarge }">
        <template v-for="tab in tabs" :key="tab.key">
            <li v-if="isVisible(tab)" class="nav-item" :class="{ disabled: tab.isDisabled }">
                <a
                    :href="`#${tab.key}`"
                    :class="['py-1 px-2', 'nav-link', { active: activeTab == tab.key, disabled: tab.isDisabled }]"
                    @click.prevent="$emit('select', tab.key)"
                >
                    <template v-if="tab.icon"><Icon :name="tab.icon" /></template>
                    <span :class="{ 'd-none d-lg-inline ms-1': tab.icon }">{{ tab.title }}</span>
                </a>
            </li>
        </template>
    </ul>
</template>

<script setup lang="ts">
import { computed } from "vue"
import { Icon } from "regira/vue/ui"
import type { ITab } from "regira/vue/ui"
import type { TabsEmits, TabNavigationProps } from "regira/vue/ui"

defineEmits<TabsEmits>()
defineProps<TabNavigationProps>()

const isVisible = computed(() => (tab: ITab) => (typeof tab.isVisible == "function" ? tab.isVisible() : tab.isVisible))
</script>
