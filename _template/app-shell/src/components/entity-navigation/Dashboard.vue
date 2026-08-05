<script setup lang="ts">
import type { RouteLocationRaw, LocationQueryRaw } from "vue-router"
import { Icon } from "@regira/modules/vue/ui"
import type { INavItem } from "@regira/modules/vue/entities"
import { useNavigation } from "./functions"
const { dashboardTree } = useNavigation()
const to = (v: INavItem): RouteLocationRaw => ({ name: v.routeName, query: (v.initialQuery ?? {}) as LocationQueryRaw })
</script>
<template>
    <div v-if="dashboardTree">
        <template v-for="group in dashboardTree.roots" :key="group.value.id">
            <section v-if="group.children.length" class="mb-4">
                <h3 class="mb-3"><Icon :name="group.value.icon ?? ''" class="me-1" /> {{ $t(group.value.title) }}</h3>
                <div class="row row-cols-2 row-cols-sm-3 row-cols-md-4 row-cols-lg-6 g-3">
                    <div v-for="node in group.children" :key="node.value.id" class="col">
                        <router-link :to="to(node.value as INavItem)" class="dashboard-card card h-100 text-center text-decoration-none py-3">
                            <Icon :name="node.value.icon ?? ''" size="xl" />
                            <div class="mt-2 small">{{ $t(node.value.title) }}</div>
                        </router-link>
                    </div>
                </div>
            </section>
        </template>
    </div>
</template>

<style scoped>
.dashboard-card {
    color: inherit;
    transition:
        box-shadow 0.15s ease,
        transform 0.15s ease;
}
.dashboard-card:hover {
    box-shadow: 0 0.25rem 0.75rem rgba(0, 0, 0, 0.1);
    transform: translateY(-2px);
}
</style>
