<template>
    <div class="input-selector input-group text-nowrap">
        <slot name="prepend">
            <FormModalButton
                v-if="canEdit"
                v-model="item"
                :item-defaults="itemDefaults"
                :readonly="readonly"
                :close-on-save="closeOnSave"
                class="btn btn-outline-secondary"
                @save="({ saved }) => handleSelect(saved)"
            >
                <Icon :name="config.key" v-if="item?.id" />
                <Icon v-else name="new" />
            </FormModalButton>
        </slot>
        <slot>
            <Autocomplete
                class="form-control"
                v-model="item"
                :filter-defaults="filterDefaults"
                :readonly="readonly"
                :placeholder="placeholder"
                @select="handleSelect"
                ref="autoEl"
            />
        </slot>
        <slot name="append">
            <template v-if="!readonly">
                <button v-if="!readonly" type="button" v-show="item != null" class="btn btn-outline-secondary" @click="handleSelect(undefined)">
                    <Icon name="clear" />
                </button>
                <SelectorModalButton
                    v-model="item"
                    :filter-defaults="filterDefaults"
                    :disabled="readonly"
                    @select="handleSelect"
                    class="btn btn-outline-info"
                />
            </template>
        </slot>
    </div>
</template>

<script setup lang="ts">
import { computed, getCurrentInstance, onMounted, watch, type Ref } from "vue"
import { Icon } from "@regira/modules/vue/ui"
import config from "../config/config"
import Entity from "../data/Entity"
import useEntityStore from "../data/store"
import FormModalButton from "../details/FormModalButton.vue"
import Autocomplete from "./Autocomplete.vue"
import SelectorModalButton from "./SelectorModalButton.vue"

const emit = defineEmits<{
    (e: "update:modelValue", args?: Entity): void
    (e: "update:idValue", args?: number | string): void
    (e: "select", args?: Entity): void
}>()
const props = withDefaults(
    defineProps<{
        modelValue?: Entity
        idValue?: number | string
        readonly?: boolean
        canEdit?: boolean
        itemDefaults?: Ref<Record<string, any>> | Record<string, any>
        filterDefaults?: Record<string, any>
        closeOnSave?: boolean
        placeholder?: string
    }>(),
    {
        canEdit: true,
    }
)

const { fromPool, list } = useEntityStore()
const item = computed<Entity | undefined>({
    get: () => fromPool(props.modelValue) as Entity,
    set: (value) => {
        emit("update:modelValue", value)
        emit("update:idValue", value?.id)
    },
})

function handleSelect(selected?: Entity) {
    if (item.value?.id != selected?.id) {
        item.value = selected // emit
        emit("select", selected)
    }
}

// Two v-models: `idValue` is the FK that gets saved (or filtered on), `modelValue` is the entity that gets
// displayed. Keep the entity in step with the FK whenever it changes — at setup, where an overview filter
// restored from the query string carries the id alone, and again when the parent assigns or clears the FK later
// (Back/Forward re-deriving that filter, a deep-link prefill, a programmatic reset), which would otherwise show a
// stale row or nothing.
watch(
    () => props.idValue,
    async (id, previous) => {
        if (!id) {
            // cleared by the parent — only a real change: bound without `idValue`, it never moves
            if (previous && props.modelValue) emit("update:modelValue", undefined)
            return
        }
        if (props.modelValue?.id == id) return
        const model = await list({ id })
        if (props.idValue == id) emit("update:modelValue", model[0]) // a newer FK arrived meanwhile: drop this answer
    },
    { immediate: true }
)

onMounted(() => {
    // With only `idValue` bound the resolution above emits into nothing and the control renders blank on a
    // populated form — it fails silently, so say so.
    if (import.meta.env.DEV && props.idValue !== undefined && !("onUpdate:modelValue" in (getCurrentInstance()?.vnode.props ?? {}))) {
        console.warn(
            `[${config.key}InputSelector] v-model:idValue is bound without v-model — the resolved entity has nowhere to go, so the control renders blank. Bind both.`
        )
    }
})
</script>
