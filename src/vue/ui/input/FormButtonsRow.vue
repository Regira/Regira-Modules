<template>
    <!-- `readonly` renders no buttons: nothing can be saved, deleted or restored, and Cancel only discards edits a
         readonly form cannot have — the way back is the page's own navigation or the modal's close button.
         Each label hides below md, so every button also carries it as its accessible name. -->
    <div class="form-buttons d-flex flex-wrap gap-2">
        <template v-if="!readonly">
            <IconButton type="submit" icon="save" class="btn-primary" :disabled="busy" :aria-label="text.save">
                <span class="d-none d-md-inline ms-1">{{ text.save }}</span>
            </IconButton>
            <IconButton type="button" icon="cancel" class="btn-secondary" :aria-label="text.cancel" @click="emit('cancel')">
                <span class="d-none d-md-inline ms-1">{{ text.cancel }}</span>
            </IconButton>
            <ConfirmButton
                v-if="showDelete && !isArchived"
                :modal-title="modalTitle ?? 'Delete?'"
                :modal-type="ModalType.danger"
                :modal-labels="{ cancel: text.cancel, submit: text.delete }"
                class="btn-danger"
                :disabled="busy"
                :aria-label="text.delete"
                @confirm="emit('remove')"
            >
                <template #button-content>
                    <Icon name="delete" />
                    <span class="d-none d-md-inline ms-1">{{ text.delete }}</span>
                </template>
                <slot name="delete">Delete {{ title }}?</slot>
            </ConfirmButton>
            <IconButton
                v-if="isArchived"
                type="button"
                icon="restore"
                class="btn-warning"
                :disabled="busy"
                :aria-label="text.restore"
                @click="emit('restore')"
            >
                <span class="d-none d-md-inline ms-1">{{ text.restore }}</span>
            </IconButton>
        </template>
    </div>
</template>

<script setup lang="ts">
import { computed } from "vue"
import Icon from "../icons/Icon.vue"
import IconButton from "../icons/IconButton.vue"
import ConfirmButton from "../buttons/ConfirmButton.vue"
import { ModalType } from "../modal"
import { FeedbackStatus } from "../feedback"
import type { FormButtonsRowProps, FormButtonsRowEmits, FormButtonsRowSlots } from "./formButtonsRow"

const props = defineProps<FormButtonsRowProps>()
const emit = defineEmits<FormButtonsRowEmits>()
defineSlots<FormButtonsRowSlots>()

// truthy, not === true: soft-delete flags may arrive as 0/1 instead of booleans
const isArchived = computed(() => !!(props.item as { isArchived?: number | boolean } | undefined)?.isArchived)
const title = computed(() => (props.item as { $title?: string } | undefined)?.$title ?? "")
const text = computed(() => ({
    save: props.labels?.save ?? "Save",
    cancel: props.labels?.cancel ?? "Cancel",
    delete: props.labels?.delete ?? "Delete",
    restore: props.labels?.restore ?? "Restore",
}))
// disable submit while a save/delete is in flight (or just succeeded, before it auto-clears) to block double-submits
const busy = computed(() => {
    const s = props.feedback?.status
    return s != null && s !== FeedbackStatus.none && s !== FeedbackStatus.failed
})
</script>
