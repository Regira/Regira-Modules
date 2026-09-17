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
import { computed, onMounted, ref, watch } from "vue"
import { useRouter } from "vue-router"
import { Tab, type ITab } from "./Tab"
import { tabContainerDefaults, type TabContainerProps, type TabsEmits } from "./tabs"
import TabNavigation from "./TabNavigation.vue"

const emit = defineEmits<TabsEmits>()
const props = withDefaults(defineProps<TabContainerProps>(), { ...tabContainerDefaults })

const router = useRouter()
const items = computed<Array<ITab>>(() => props.tabs.filter((x) => x != null).map((x) => (x instanceof Tab ? x : new Tab(x as string))))

const defaultTab = computed(() => (items.value.find((tab) => tab.isDefault) || items.value[0]!).key)
const isSelectable = (key?: string) =>
    items.value.some((tab) => tab.key === key && !tab.isDisabled && (typeof tab.isVisible == "function" ? tab.isVisible() : tab.isVisible))
// with route nav, the tab a hash-less URL shows — read once, so Back to that URL shows it again whatever was selected since
const initialTab = props.active
const _activeTab = ref(props.active)

// the first of these that names a visible, enabled tab — else the default tab
const activeTab = computed<string>({
    get: () => {
        const candidates = props.useRouteNav ? [router.currentRoute.value.hash?.substring(1), initialTab] : [_activeTab.value, initialTab]
        return candidates.find(isSelectable) ?? defaultTab.value
    },
    set: (value) => {
        if (props.useRouteNav) {
            // a selection is a history entry: Back returns to the previous tab
            router.push({ ...router.currentRoute.value, hash: "#" + value })
        } else {
            _activeTab.value = value
        }
    },
})

function handleSelect(tab: string) {
    // compared with the tab on screen, which the hash may have changed since the last selection (Back)
    if (activeTab.value !== tab && isSelectable(tab)) {
        activeTab.value = tab
    }
}

// `select` reports the tab on screen whenever it changes: a click, Back/Forward, or a tab turning (un)available
watch(activeTab, (tab) => emit("select", tab))

onMounted(() => {
    // Report the tab taken from the URL, `active` or the default without navigating: a route write here would cancel
    // whatever navigation is still pending as the container mounts — useForm's replace to a new item's id among them.
    emit("select", activeTab.value)
})
</script>
