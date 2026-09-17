<template>
    <select v-model="selectedId" class="form-select">
        <option :value="undefined"></option>
        <option v-for="item in items" :value="item.id" :key="item.id">
            {{ item.$title }}
        </option>
    </select>
</template>

<script lang="ts">
import type Entity from "../data/Entity"

// shared by every dropdown of this slice, so the ones that load at the same moment wait for one request
let loading: Promise<Array<Entity>> | undefined
</script>

<script setup lang="ts">
import { onMounted, ref, watch } from "vue"
import { onAuthenticated } from "@regira/modules/vue/auth"
import useEntityStore from "../data/store"

const selectedItem = defineModel<Entity>()
const selectedId = defineModel<number | string>("idValue")
watch(selectedId, () => (selectedItem.value = items.value.find((x) => x.id == selectedId.value)))

// Loads its own rows: the pool cache is not reactive to ids added later, so a list read from fromCache() stays
// empty after a hard reload. pageSize: 0 asks for every row (the API still caps it at its MaxPageSize) — this
// control is for small lookup sets; use InputSelector for a large one.
const { list, fromPool } = useEntityStore()
const items = ref<Array<Entity>>([])
async function load() {
    try {
        loading ??= list({ pageSize: 0 }).finally(() => (loading = undefined))
        items.value = fromPool(await loading)
        if (!selectedItem.value && selectedId.value) {
            selectedItem.value = items.value.find((x) => x.id == selectedId.value)
        }
    } catch (ex: any) {
        // a 401 is a load that ran before sign-in and is repeated after it; anything else is worth a look
        if (ex?.response?.status !== 401) console.error("Loading the dropdown failed", ex)
    }
}
onMounted(load)
// immediate: false — onMounted already loads. No-auth app: delete this line AND its import above (scaffold.mjs --no-auth does both)
onAuthenticated(load, { immediate: false })
</script>
