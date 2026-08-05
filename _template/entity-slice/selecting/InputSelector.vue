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
import { computed, getCurrentInstance, onMounted, type Ref } from "vue"
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

onMounted(async () => {
    // Two v-models: `idValue` is the FK that gets saved, `modelValue` is the entity that gets displayed. With
    // only `idValue` bound the resolution below emits into nothing and the control renders blank on a
    // populated form — it fails silently, so say so.
    if (import.meta.env.DEV && props.idValue !== undefined && !("onUpdate:modelValue" in (getCurrentInstance()?.vnode.props ?? {}))) {
        console.warn(
            `[${config.key}InputSelector] v-model:idValue is bound without v-model — the resolved entity has nowhere to go, so the control renders blank. Bind both.`
        )
    }

    if (props.idValue && !props.modelValue?.id) {
        const model = await list({ id: props.idValue })
        emit("update:modelValue", model[0])
    }
})
</script>
