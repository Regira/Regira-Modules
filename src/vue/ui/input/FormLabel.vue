<template>
    <small class="rg-form-label form-text text-muted" :class="autoHide ? 'd-none d-md-inline' : 'd-inline'">{{ label }}</small>
</template>

<script setup lang="ts">
import { formLabelDefaults, type FormLabelProps } from "./inputs"

withDefaults(defineProps<FormLabelProps>(), { ...formLabelDefaults })
</script>
