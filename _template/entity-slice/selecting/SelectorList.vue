<template>
    <div class="entity-list">
        <div class="row fw-bold border-bottom pb-2">
            <div class="col-auto"></div>
            <!-- TODO: column headers -->
            <div class="col">{{ $t("name") }}</div>
        </div>
        <div v-for="item in items" :key="item.$id" class="row border-bottom py-2" :class="{ 'is-selected': isSelected(item) }">
            <div class="col-auto">
                <IconButton :icon="isSelected(item) ? 'selected' : 'select'" @click="handleSelect(item)" />
            </div>
            <!-- TODO: columns -->
            <div class="col text-truncate">{{ item.$title }}</div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from "vue"
import { IconButton } from "@regira/modules/vue/ui"
import type { OverviewEmits } from "@regira/modules/vue/entities"
import type Entity from "../data/Entity"
import useEntityStore from "../data/store"

interface Emits extends /* @vue-ignore */ OverviewEmits<Entity> {}
const emit = defineEmits<Emits & { (e: "update:modelValue", value: Array<Entity>): void; (e: "select", selected?: Entity): void }>()
const props = defineProps<{ modelValue?: Array<Entity>; selected?: Entity }>()

const isSelected = computed(() => (item: Entity) => item.$id == props.selected?.$id)
const { fromPool } = useEntityStore()
const items = computed<Array<Entity>>({ get: () => fromPool(props.modelValue || []), set: (value) => emit("update:modelValue", value) })

function handleSelect(item?: Entity) {
    emit("select", item?.$id !== props.selected?.$id ? item : undefined)
}
</script>
