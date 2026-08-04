<template>
    <div class="tab-container">
        <TabNavigation :tabs="items" :activeTab="activeTab" @select="handleSelect" />
        <template v-for="tab in items" :key="tab.key">
            <div v-if="activeTab == tab.key" class="tab-content pt-2">
                <slot :name="tab.key"></slot>
            </div>
        </template>
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue"
import { useRouter } from "vue-router"
import { Tab, type ITab } from "./Tab"
import { tabContainerDefaults, type TabContainerProps, type TabsEmits } from "./tabs"
import TabNavigation from "./TabNavigation.vue"

const emit = defineEmits<TabsEmits>()
const props = withDefaults(defineProps<TabContainerProps>(), { ...tabContainerDefaults })

const router = useRouter()
const items = computed<Array<ITab>>(() => props.tabs.filter((x) => x != null).map((x) => (x instanceof Tab ? x : new Tab(x as string))))

const defaultTab = computed(() => (items.value.find((tab) => tab.isDefault) || items.value[0]!).key)
const _activeTab = ref<string>(props.active!)

const activeTab = computed<string>({
    get: () => {
        return (props.useRouteNav ? router.currentRoute.value.hash?.substring(1) : _activeTab.value) || defaultTab.value
    },
    set: (value) => {
        const hasActiveTab = _activeTab.value != null
        _activeTab.value = value
        if (props.useRouteNav) {
            const newRoute = { ...router.currentRoute.value, hash: "#" + value }
            if (hasActiveTab) {
                router.push(newRoute)
            } else {
                // replace route to avoid having to go back twice
                router.replace(newRoute)
            }
        }
        emit("select", value)
    },
})

function handleSelect(tab: string) {
    if (_activeTab.value !== tab) {
        activeTab.value = tab
    }
}

onMounted(() => {
    if (_activeTab.value != null) {
        return
    }

    if (props.useRouteNav) {
        let tab = (props.useRouteNav ? router.currentRoute.value.hash?.substring(1) : undefined) || defaultTab.value
        handleSelect(tab)
    }
})
</script>
