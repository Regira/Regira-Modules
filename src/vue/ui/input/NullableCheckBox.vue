<template>
    <input
        type="checkbox"
        class="rg-nullable-checkbox"
        ref="input"
        v-bind="$attrs"
        @click="handleChange"
        :true-value="true"
        :checked="cbValue"
        :style="style"
    />
    <label v-if="label" class="rg-nullable-checkbox-label" :for="labelFor" @click.prevent="handleLabelClick">{{ label }}</label>
</template>

<script lang="ts">
export default {
    name: "NullableCheckBox",
    inheritAttrs: false,
}
</script>

<script setup lang="ts">
import { ref, computed, watchEffect, useAttrs } from "vue"
import type { NullableCheckBoxProps, NullableCheckBoxEmits } from "./inputs"

type ValueType = boolean | undefined

const emit = defineEmits<NullableCheckBoxEmits>()
const props = defineProps<NullableCheckBoxProps>()

const input = ref<HTMLInputElement>(null!)
const getValue = (v: ValueType | string | number): ValueType => {
    if (v == null) {
        return undefined
    }
    if (typeof v === "string") {
        return v === "true" ? true : v === "false" ? false : undefined
    }
    return new Boolean(v).valueOf()
}

const _value = ref<ValueType>(getValue(props.modelValue))
const cbValue = computed<ValueType>({
    get() {
        return _value.value
    },
    set(value) {
        _value.value = value
        emit("update:modelValue", value)
        emit("change", { target: input.value })
    },
})
const style = computed(() => ({ opacity: cbValue.value == null ? 0.5 : 1 }))

function handleChange() {
    cbValue.value = (cbValue.value == null ? true : cbValue.value ? false : undefined) as ValueType
}

// `for` associates the label with the box for assistive tech; the click is handled here rather than left to
// the browser's label activation, which would forward a second click to the input and skip a state
const attrs = useAttrs()
const labelFor = computed(() => (attrs.id as string | undefined) || undefined)
// `disabled` is a fallthrough attribute, so the input ignores clicks on its own — but the label is ours to gate
const isDisabled = computed(() => attrs.disabled !== undefined && attrs.disabled !== false)
function handleLabelClick() {
    if (!isDisabled.value) {
        handleChange()
    }
}

// input.value -> (HTMLInputElement)
watchEffect(() => input.value && (input.value.indeterminate = cbValue.value === undefined))
</script>
