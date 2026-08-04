<template>
    <form v-if="item" class="entity-form" @submit.prevent="submit">
        <slot :item="item!" />
        <div class="mt-3">
            <button type="submit" class="btn btn-primary" :disabled="saving">Save</button>
            <button type="button" class="btn btn-link" @click="emit('cancel')">Cancel</button>
        </div>
    </form>
</template>

<script setup lang="ts" generic="T extends IEntity">
import type { IEntity } from "../abstractions"
import { useLeanForm, type LeanFormProps, type LeanFormEmits, type LeanFormSlots } from "./form"

const props = defineProps<LeanFormProps<T>>()
const emit = defineEmits<LeanFormEmits<T>>()
defineSlots<LeanFormSlots<T>>()

const { item, saving, submit } = useLeanForm<T>(props, { emit })
</script>
