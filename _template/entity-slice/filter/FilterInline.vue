<template>
    <div class="row">
        <div class="col-auto">
            <div class="input-group">
                <IconButton icon="clear" class="btn-outline-secondary" @click="handleReset" />
                <input v-model.lazy.trim="searchObject.q" class="form-control" :placeholder="$t('keywords')" @change="handleUpdate" />
                <IconButton icon="search" class="btn-outline-primary d-none d-sm-block" @click="handleUpdate" />
                <IconButton v-if="showToggleAdv" icon="filter" :class="filterIsActive ? 'btn-info' : 'btn-outline-info'" @click="handleToggle" />
            </div>
            <small v-if="filterIsActive" class="d-none d-sm-inline italic-muted">{{ $t("filtersAreApplied") }}</small>
        </div>
    </div>
</template>

<script setup lang="ts">
import { IconButton } from "@regira/modules/vue/ui"
import { useFilter, type FilterEmits } from "@regira/modules/vue/entities"
import config from "../config/config"
import SearchObject from "./SearchObject"

interface Emits extends /* @vue-ignore */ FilterEmits<SearchObject> {}
const emit = defineEmits<
    Emits & {
        "update:modelValue": (value: SearchObject) => true
        filter: (value: SearchObject) => true
        "toggle-adv": () => void
        close: () => void
    }
>()

const props = withDefaults(
    defineProps<{
        resultCount?: number
        showToggleAdv?: boolean
    }>(),
    {
        showToggleAdv: config.isComplex,
    }
)
const searchObject = defineModel<SearchObject>({
    default: () => new SearchObject(),
})

const { filterIsActive, handleReset, handleUpdate, handleToggle } = useFilter({
    searchObject,
    emit,
    Constructor: SearchObject,
})
</script>
