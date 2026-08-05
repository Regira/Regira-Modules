<template>
    <div class="adv-filter">
        <!-- top row: result count (left) + clear (right) — the overview-filter convention; keep it -->
        <div class="row">
            <div class="col mb-2" v-if="resultCount != null">
                <span class="text-info">{{ resultCount }} {{ $t("results") }}</span>
                <small v-if="filterIsActive" class="ms-2 italic-muted">({{ $t("filtersAreApplied") }})</small>
            </div>
            <div class="col mb-2 text-end">
                <IconButton icon="clear" :showText="true" @click="handleReset" />
            </div>
        </div>

        <!-- keywords (free-text q) -->
        <input v-model.lazy.trim="searchObject.q" class="form-control mb-2" :placeholder="$t('keywords')" @change="handleUpdate" />

        <!-- TODO: one input per SearchObject filter field (placeholder `title` — keep in sync with SearchObject.ts).
             Native <input> → @change="handleUpdate". A custom component (InputSelector, NullableCheckBox,
             DateInput) emits Vue events only → @select="handleUpdate" / @update:modelValue="handleUpdate",
             or the results and the count go stale. A checkbox filter needs its own label — pass `label`
             (with an `id`, so clicking the text toggles the box). e.g.:
                 <BarInputSelector v-model="bar" v-model:idValue="searchObject.barId" @select="handleUpdate" />
                 <NullableCheckBox v-model="searchObject.isActive" id="isActive" :label="$t('isActive')" @update:modelValue="handleUpdate" /> -->
        <input v-model.lazy.trim="searchObject.title" class="form-control mb-2" :placeholder="$t('name')" @change="handleUpdate" />
    </div>
</template>

<script setup lang="ts">
import { IconButton } from "@regira/modules/vue/ui"
import { useFilter, type FilterEmits } from "@regira/modules/vue/entities"
import SearchObject from "./SearchObject"

interface Emits extends /* @vue-ignore */ FilterEmits<SearchObject> {}
const emit = defineEmits<Emits & { "update:modelValue": (v: SearchObject) => true; filter: (v: SearchObject) => true; close: () => void }>()
defineProps<{ resultCount?: number }>()

const searchObject = defineModel<SearchObject>({ required: true })
// handleUpdate = sync the model + re-run the search; bind it on EVERY input above.
const { handleReset, handleUpdate, filterIsActive } = useFilter({ searchObject, emit, Constructor: SearchObject })
</script>
