<template>
    <div class="form-section mb-3">
        <div class="form-section-title bg-body-secondary rounded-2 px-2 mb-2">
            <slot name="header" :collapsed="collapsed" :showSummary="showSummary">
                <div class="row align-items-center">
                    <div class="col" @click="showSummary = !showSummary">
                        <slot name="title" :showSummary="showSummary">
                            <h3 class="fs-6 fw-semibold py-2 mb-0">{{ title }}</h3>
                        </slot>
                    </div>
                    <div class="col-auto">
                        <button
                            v-if="!readonly && $slots.summary"
                            type="button"
                            class="btn btn-default my-1 px-2 py-1 opacity-50"
                            @click.stop="showSummary = !showSummary"
                        >
                            <Icon :name="showSummary ? 'look' : 'edit'" />
                        </button>
                        <button type="button" class="btn btn-default my-1 px-2 py-1 opacity-50" @click.stop="toggleCollapsed">
                            <Icon :name="collapsed ? 'maximize' : 'minimize'" />
                        </button>
                    </div>
                </div>
            </slot>
        </div>
        <div v-show="!collapsed" class="form-section-body" :class="showSummary && summaryClass">
            <template v-if="!$slots.summary || !showSummary">
                <slot :collapsed="collapsed"></slot>
            </template>
            <template v-if="$slots.summary && showSummary">
                <slot name="summary" :collapsed="collapsed"></slot>
            </template>
            <slot name="always"></slot>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, getCurrentInstance } from "vue"
import Icon from "../icons/Icon.vue"
import type { FormSectionProps, FormSectionEmits, FormSectionSlots } from "./inputs"

const emit = defineEmits<FormSectionEmits>()
const props = defineProps<FormSectionProps>()
defineSlots<FormSectionSlots>()

const current = getCurrentInstance()
const collapsed = ref(props.collapsed)
const _showSummary = ref(props.readonly || props.showSummary)
const showSummary = computed({
    get: () => !!(current?.slots.summary && (props.readonly || _showSummary.value)),
    set: (value) => (_showSummary.value = !!value),
})

function toggleCollapsed() {
    collapsed.value = !collapsed.value
    collapsed.value ? emit("collapse") : emit("expand")
}

watch(
    () => props.collapsed,
    () => {
        collapsed.value = props.collapsed
        collapsed.value ? emit("collapse") : emit("expand")
    }
)
</script>
