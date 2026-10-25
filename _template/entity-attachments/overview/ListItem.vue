<template>
    <div class="input-group">
        <a :href="item.uri" class="btn btn-outline-info" :aria-label="$t('download')" @click.prevent="handleDownload"><Icon name="download" /></a>
        <!-- an existing file edits newFileName; a staged file edits fileName directly -->
        <input
            v-if="item.id > 0"
            v-model.lazy="item.newFileName"
            :placeholder="item.fileName"
            :readonly="readonly"
            maxlength="256"
            class="form-control"
            @change="emit('change')"
        />
        <input v-else v-model.lazy="item.fileName" :readonly="readonly" maxlength="256" class="form-control" @change="emit('change')" />
        <span class="input-group-text">{{ formatFileSize(item.attachment?.length ?? 0) }}</span>
        <!-- swaps the file, keeping the row's place; staged until the parent's save -->
        <button
            v-if="!readonly && !item._deleted"
            type="button"
            class="btn btn-outline-secondary"
            :aria-label="$t('replaceFile')"
            @click="emit('replace')"
        >
            <Icon name="upload" />
        </button>
        <button v-if="!readonly" type="button" class="btn btn-outline-danger" :aria-label="$t('delete')" @click="toggleRemove">
            <Icon name="delete" />
        </button>
    </div>
</template>

<script setup lang="ts">
import { formatFileSize } from "@regira/modules/utilities/file-utility"
import { Icon } from "@regira/modules/vue/ui"
import type Entity from "../data/Entity"
import { download } from "../data/functions"

const emit = defineEmits<{ (e: "change"): void; (e: "replace"): void }>()
defineProps<{ readonly?: boolean }>()
const item = defineModel<Entity>({ required: true })

function toggleRemove() {
    item.value._deleted = !item.value._deleted // undoable
    emit("change")
}
async function handleDownload() {
    await download(item.value)
}
</script>
