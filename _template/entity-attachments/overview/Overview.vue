<template>
    <FormSection :title="$t('files')">
        <!-- drag the handle onto another row to reorder; sortOrder follows the array index.
             rows also accept OS file drops (added like the drop zone) — never let the browser navigate -->
        <div
            v-for="(row, i) in items"
            :key="row.$id"
            class="d-flex align-items-center gap-2 mb-2"
            @dragover.prevent
            @drop.prevent="handleDrop(i, $event)"
        >
            <span
                v-if="!readonly"
                class="text-muted"
                style="cursor: grab"
                draggable="true"
                @dragstart="handleDragStart(i, $event)"
                @dragend="handleDragEnd"
            >
                <Icon name="move" />
            </span>
            <ListItem v-model="items[i]!" :class="{ 'is-deleted': row._deleted }" class="flex-grow-1" :readonly="readonly" @change="sync" />
        </div>
        <FileDropZone v-if="!readonly" @drop-files="handleBrowse" @click="triggerBrowse()">
            <template #default="{ isDropping }">
                <div class="text-center text-info p-4 my-2 border rounded" :class="{ 'border-info bg-light': isDropping }">
                    {{ $t("addNewFile(s)") }}
                </div>
            </template>
        </FileDropZone>
        <Debug :modelValue="items" />
    </FormSection>
</template>

<script setup lang="ts">
import { FileDropZone, FormSection, Icon } from "@regira/modules/vue/ui"
import { Debug } from "@regira/modules/vue/debug"
import { useEntityAttachments } from "../data/functions"
import type Entity from "../data/Entity"
import ListItem from "./ListItem.vue"

const emit = defineEmits<{ (e: "update:modelValue", v: Array<Entity>): void }>()
const props = withDefaults(defineProps<{ modelValue?: Array<Entity>; readonly?: boolean }>(), { modelValue: () => [] })

const { items, sync, triggerBrowse, handleBrowse, handleDragStart, handleDragEnd, handleDrop } = useEntityAttachments({ props, emit })
</script>
