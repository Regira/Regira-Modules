<template>
    <div class="entity-list">
        <div class="row fw-bold border-bottom pb-2">
            <div class="col-auto">
                <!-- header spacer: carries the SAME classes as ListItem.vue's edit affordance, so the columns
                     line up — a `.btn`'s transparent 1px border and line-height are part of that width, and
                     dropping them misaligns the header by ~2px. Inert markup on purpose (`.disabled` = no
                     pointer events) — a disabled FormModalButton here would mount a useModal + a <Teleport> per list. -->
                <span v-if="config.isComplex" class="btn btn-link p-1 disabled"><Icon name="edit" /></span>
                <button v-else type="button" class="btn btn-default" disabled><Icon :name="config.key" /></button>
            </div>
            <div class="col">{{ $t("name") }}</div>
            <!-- TODO: the 1–3 most important OTHER fields, in this reveal order (`scaffold.mjs --rel <Related>`
                 already wrote a header above for each relation). Uncomment what you use, rename the keys and
                 add them to translations.json, delete the rest — no fourth slot, and never an inline `width`.
            <div class="col d-none d-md-block">{{ $t("code") }}</div>
            <div class="col d-none d-lg-block">{{ $t("status") }}</div>
            <div class="col d-none d-xl-block">{{ $t("owner") }}</div>
            -->
            <div class="col-2 d-none d-lg-block">{{ $t("created") }}</div>
            <div class="col-auto">
                <!-- mirrors ListItem's ConfirmButton (`btn` + Icon): the `.btn` box is what makes this
                     header cell the same width as the row's, so the trailing edges line up. `disabled`
                     on a span is inert without being focusable. -->
                <span class="btn disabled text-muted"><Icon name="delete" /></span>
            </div>
        </div>
        <ListItem
            v-for="(item, i) in items"
            :key="item.$id"
            v-model="items[i]!"
            :readonly="readonly"
            @request-save="$emit('request-save', $event)"
            @request-remove="$emit('request-remove', $event)"
            @save="$emit('save', $event)"
            @remove="$emit('remove', $event)"
        />
    </div>
</template>

<script setup lang="ts">
import { computed } from "vue"
import { Icon } from "@regira/modules/vue/ui"
import type { OverviewEmits } from "@regira/modules/vue/entities"
import config from "../config/config"
import type Entity from "../data/Entity"
import useEntityStore from "../data/store"
import ListItem from "./ListItem.vue"

interface Emits extends /* @vue-ignore */ OverviewEmits<Entity> {}
const emit = defineEmits<Emits>()
const props = defineProps<{ modelValue?: Array<Entity>; readonly?: boolean }>()

const { fromPool } = useEntityStore() // resolve rows through the shared pool (reactive cache)
const items = computed<Array<Entity>>({
    get: () => fromPool(props.modelValue || []),
    set: (value) => emit("update:modelValue", value),
})
</script>
