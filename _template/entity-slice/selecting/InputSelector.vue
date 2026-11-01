<template>
    <div v-if="multiple" class="input-selector-multiple row g-1 align-items-center">
        <div v-for="row in rows" :key="row.$id" class="col-auto">
            <div class="text-nowrap p-1 border rounded-1">
                <FormModalButton v-if="canEdit" :model-value="row" :readonly="readonly" :close-on-save="closeOnSave" class="m-0 p-0" />
                {{ row.$title }}
                <button v-if="!readonly" type="button" class="btn btn-sm m-0 py-0 px-1" :aria-label="$t('remove')" @click="handleRemove(row)">
                    <Icon name="delete" />
                </button>
            </div>
        </div>
        <div v-if="!readonly" class="col-auto">
            <InputSelector
                confirm-selection
                :can-edit="canEdit"
                :item-defaults="itemDefaults"
                :filter-defaults="pickerFilter"
                :close-on-save="closeOnSave"
                :placeholder="placeholder"
                @select="handleAdd"
            >
                <template v-for="(_, name) in $slots" #[name]>
                    <slot :name="name" />
                </template>
            </InputSelector>
        </div>
    </div>
    <div v-else class="input-selector input-group text-nowrap">
        <slot name="prepend">
            <FormModalButton
                v-if="canEdit && (!readonly || item?.id)"
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
                :confirm-selection="confirmSelection"
                @select="handleSelect"
                ref="autoEl"
            />
        </slot>
        <slot name="append">
            <template v-if="!readonly">
                <button
                    v-if="!readonly"
                    type="button"
                    v-show="item != null"
                    class="btn btn-outline-secondary"
                    :aria-label="$t('clear')"
                    @click="handleSelect(undefined)"
                >
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
    // one Entity, or an array with `multiple`: a union here would refuse a handler typed for one Entity
    (e: "update:modelValue", args?: any): void
    (e: "update:idValue", args?: number | string): void
    (e: "update:idsValue", args: Array<number | string>): void
    (e: "select", args?: Entity): void
}>()
const props = withDefaults(
    defineProps<{
        // multiple: `modelValue` is an array and `idsValue` replaces `idValue`
        multiple?: boolean
        modelValue?: Entity | Array<Entity>
        idValue?: number | string
        // one value is a list of one: a query string with a single id comes back as a scalar
        idsValue?: Array<number | string> | number | string
        readonly?: boolean
        canEdit?: boolean
        itemDefaults?: Ref<Record<string, any>> | Record<string, any>
        filterDefaults?: Record<string, any>
        closeOnSave?: boolean
        placeholder?: string
        // the arrow keys only highlight a result, and Enter or a click selects it
        confirmSelection?: boolean
    }>(),
    {
        canEdit: true,
    }
)

const { fromPool, list } = useEntityStore()
const item = computed<Entity | undefined>({
    get: () => fromPool(props.modelValue as Entity),
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

// `multiple`: chips for the selected rows, and this same control in single mode to pick the next one. That control
// holds no value of its own, so a pick leaves it empty, and it confirms a pick because every pick adds a row.
// `select` fires on every change: with the added row, or undefined when one is removed.
const rows = computed(() => fromPool((props.modelValue ?? []) as Array<Entity>))
const pickerFilter = computed(() => ({
    ...props.filterDefaults,
    exclude: [props.filterDefaults?.exclude ?? [], selectedIds()].flat(),
}))
// The ids lead: they can name rows that are still loading or that this caller may not read, and the rows can lag
// behind ids the parent just changed. Rows bound without ids are the selection themselves.
const selectedIds = () => (toIds().length ? toIds() : rows.value.map((x) => x.id!))
function updateRows(ids: Array<number | string>, added?: Entity) {
    const kept = rows.value.filter((x) => x.id != added?.id)
    const value = [...kept, ...(added ? [added] : [])].filter((x) => ids.some((id) => id == x.id))
    emit("update:modelValue", value)
    emit("update:idsValue", ids)
    emit("select", added)
}
// Selected takes both: an id without its row still takes a pick, which gives it a chip, and a row the ids no longer
// name is not selected, whatever chip it still shows.
function isSelected(row: Entity) {
    return selectedIds().some((id) => id == row.id) && rows.value.some((x) => x.id == row.id)
}
function handleAdd(selected?: Entity) {
    // `exclude` only hides rows from an API that filters on it, and the browse modal keeps the list it opened with
    if (selected != null && !isSelected(selected)) {
        updateRows([...selectedIds().filter((id) => id != selected.id), selected.id!], selected)
    }
}
function handleRemove(selected: Entity) {
    updateRows(selectedIds().filter((id) => id != selected.id))
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
        if ((props.modelValue as Entity | undefined)?.id == id) return
        let model
        try {
            model = await list({ id })
        } catch {
            return // a caller who may not read this entity (403) keeps the FK and shows no row
        }
        if (props.idValue == id) emit("update:modelValue", model[0]) // a newer FK arrived meanwhile: drop this answer
    },
    { immediate: true }
)

// The same for `multiple`: the rows follow `idsValue`. Watched by value, because a route round trip rebuilds the
// array and turns its numbers into strings without changing what it says.
const toIds = () => (props.idsValue == null || props.idsValue === "" ? [] : [props.idsValue].flat())
watch(
    () => toIds().join(),
    async (key, previous) => {
        const ids = toIds()
        if (!ids.length) {
            if (previous && rows.value.length) emit("update:modelValue", [])
            return
        }
        if (ids.length == rows.value.length && ids.every((id) => rows.value.some((x) => x.id == id))) return
        let models
        try {
            models = await list({ ids, pageSize: ids.length })
        } catch {
            // a caller who may not read these rows (403) keeps the ids, and the rows they still name
            const named = rows.value.filter((x) => ids.some((id) => id == x.id))
            if (named.length < rows.value.length && toIds().join() == key) emit("update:modelValue", named)
            return
        }
        if (toIds().join() == key) emit("update:modelValue", models) // newer ids arrived meanwhile: drop this answer
    },
    { immediate: true }
)

onMounted(() => {
    // With only `idValue` bound the resolution above emits into nothing and the control renders blank on a
    // populated form — it fails silently, so say so.
    const idBinding = props.multiple ? props.idsValue : props.idValue
    if (import.meta.env.DEV && idBinding !== undefined && !("onUpdate:modelValue" in (getCurrentInstance()?.vnode.props ?? {}))) {
        console.warn(
            `[${config.key}InputSelector] v-model:${props.multiple ? "idsValue" : "idValue"} is bound without v-model — the resolved entity has nowhere to go, so the control renders blank. Bind both.`
        )
    }
})
</script>
