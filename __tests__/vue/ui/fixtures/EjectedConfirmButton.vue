<template>
    <button type="button" class="rg-confirm-button btn" :name="icon" @click="handleOpen">
        <Icon v-if="icon != null" :name="icon" />
    </button>
</template>

<script setup lang="ts">
// The button of a ConfirmButton ejected on 6.5.0, as its markup wrote it (without the modal), over today's contract
// types: it binds no `disabled`, which reached it as a fallthrough attribute
import Icon from "../../../../src/vue/ui/icons/Icon.vue"
import { confirmButtonDefaults, type ConfirmButtonProps, type ConfirmButtonEmits } from "../../../../src/vue/ui/buttons/confirm"

const emit = defineEmits<ConfirmButtonEmits>()
withDefaults(defineProps<ConfirmButtonProps>(), { ...confirmButtonDefaults })

function handleOpen() {
    emit("open")
}
</script>
