<template>
    <Autocomplete
        v-model="item"
        :search="search"
        :max-results="maxResults"
        :id-selector="idSelector"
        :display-item-formatter="displayItemFormatter"
        :placeholder="placeholder"
        ref="autoEl"
    >
        <template #default="{ item }">
            <div class="row">
                <div class="col">{{ item.$title }}</div>
            </div>
        </template>
    </Autocomplete>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue"
import { Autocomplete } from "@regira/modules/vue/ui"
import { get } from "@regira/modules/vue/ioc"
import type { IEntityService } from "@regira/modules/vue/entities"
import Entity from "../data/Entity"
import useEntityStore from "../data/store"

const emit = defineEmits<{
    (e: "update:modelValue", args?: Entity): void
    (e: "update:idValue", args?: number | string): void
    (e: "select", args?: Entity): void
}>()
const props = withDefaults(
    defineProps<{
        modelValue?: Entity
        maxResults?: number
        filterDefaults?: Record<string, any>
        placeholder?: string
    }>(),
    { maxResults: 10 }
)

const { fromPool } = useEntityStore()
const item = computed({
    get: () => fromPool(props.modelValue) as Entity,
    set: (value) => {
        emit("update:modelValue", value)
        emit("update:idValue", value?.id)
        emit("select", value)
    },
})

// expose refs
const autoEl = ref<any>(null)
watch(item, () => {
    if (item.value == null) {
        autoEl.value?.resetQ()
    }
})

const entityService = get<IEntityService<Entity>>(Entity.name)!
const search = (q: string) =>
    entityService.list({
        ...props.filterDefaults,
        q: (q?.split(" ") || []).map((x) => `*${x}*`).join(" "),
        pageSize: props.maxResults,
    })
const idSelector = (item?: Entity) => item?.$id?.toString()
const displayItemFormatter = (item?: Entity) => item?.$title as string
</script>
