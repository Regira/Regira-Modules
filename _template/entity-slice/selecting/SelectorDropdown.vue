<template>
    <select v-model="selectedId" class="form-select">
        <option :value="undefined"></option>
        <option v-for="item in items" :value="item.id" :key="item.id">
            {{ item.$title }}
        </option>
    </select>
</template>

<script setup lang="ts">
import { computed, onMounted, watch, type Ref } from "vue"
import type Entity from "../data/Entity"
import useEntityStore from "../data/store"

const selectedItem = defineModel<Entity>()
const selectedId = defineModel<number | string>("idValue")
watch(selectedId, () => (selectedItem.value = items.value.find((x) => x.id == selectedId.value)))

const { fromCache } = useEntityStore()
const items = computed(() => (fromCache() as Array<Ref<Entity>>)!.map((x) => x.value))
onMounted(() => {
    if (!selectedItem.value && selectedId.value) {
        selectedItem.value = items.value.find((x) => x.id == selectedId.value)
    }
})
</script>
