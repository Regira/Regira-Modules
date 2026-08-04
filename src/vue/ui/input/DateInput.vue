<template>
    <input
        type="date"
        class="rg-date-input form-control"
        :value="dateValue"
        :readonly="readonly"
        @change="handleChange"
        :lang="culture"
        :class="{ 'is-invalid': dateValue && !isValidDate }"
    />
</template>

<script setup lang="ts">
import { computed } from "vue"
import { dateInputString } from "../../formatters"
import { isValid } from "date-fns"
import type { DateInputProps, DateInputEmits } from "./inputs"

const emit = defineEmits<DateInputEmits>()
const props = defineProps<DateInputProps>()

const isValidDate = computed(() => isValid(new Date(props.modelValue || "")))
const dateValue = computed(() => (isValidDate.value ? dateInputString(new Date(props.modelValue!)) : props.modelValue))
const handleChange = (e: any) => {
    // `readonly` does not stop every browser's native date picker from writing a value — refuse the emit too
    if (props.readonly) {
        return
    }
    const date = new Date(e.target.value)
    if (!e.target.value || isValid(date)) {
        emit("update:modelValue", date || e.target.value)
    }
}
</script>
