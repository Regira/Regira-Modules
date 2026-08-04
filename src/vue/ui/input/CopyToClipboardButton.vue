<template>
    <IconButton class="rg-copy-button" :icon="success ? 'check' : 'copy'" :disabled="success" @click="handleCopy" />
</template>

<script setup lang="ts">
import { ref } from "vue"
import IconButton from "../icons/IconButton.vue"
import { copyTextToClipboard } from "../../../utilities/clipboard-utility"
import { copyToClipboardButtonDefaults, type CopyToClipboardButtonProps } from "./inputs"

const props = withDefaults(defineProps<CopyToClipboardButtonProps>(), { ...copyToClipboardButtonDefaults })

const success = ref<boolean>()

function handleCopy() {
    copyTextToClipboard(props.value ?? "")
    success.value = true
    setTimeout(() => (success.value = undefined), props.timeout)
}

defineExpose({
    success,
})
</script>
