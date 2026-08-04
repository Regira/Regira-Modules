<template>
    <div class="rg-file-drop-zone" @drop.prevent="handleDrop" @dragover.prevent="isDropping = true" @dragleave.prevent="isDropping = false">
        <slot :isDropping="isDropping"></slot>
    </div>
</template>

<script setup lang="ts">
import { ref } from "vue"
import type { FileDropZoneEmits, FileDropZoneSlots } from "./fileDropZone"

const emit = defineEmits<FileDropZoneEmits>()
defineSlots<FileDropZoneSlots>()

const isDropping = ref<boolean>()

async function handleDrop(e: any) {
    emit("drop-files", [...e.dataTransfer.files])
}

defineExpose({
    isDropping,
})
</script>
