<template>
    <div class="description-input">
        <textarea v-model="model" :readonly="readonly" class="form-control" rows="3"></textarea>
        <FormLabel v-if="label" :label="label" />
    </div>
</template>

<script setup lang="ts">
import { FormLabel } from "regira/vue/ui"
import type { DescriptionInputProps } from "regira/vue/ui"

defineProps<DescriptionInputProps>()
const model = defineModel<string>()
</script>
