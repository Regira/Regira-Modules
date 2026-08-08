<template>
    <div v-if="isPending || isSuccess || isFailed" class="rg-feedback mb-1 position-relative border h-100">
        <slot name="close-button" v-if="!hideCloseButton">
            <IconButton
                icon="close"
                class="rg-feedback__close-button btn btn-sm position-absolute end-0 p-1"
                :class="{ 'text-light': isFailed }"
                @click="handleClose"
            />
        </slot>
        <slot name="pending" v-if="isPending">
            <Pending :msg="message" class="rg-feedback__pending px-2 py-1 border h-100" />
        </slot>
        <slot name="success" v-if="isSuccess">
            <Success :msg="message" class="rg-feedback__success px-2 py-1 border h-100" />
        </slot>
        <slot name="error" v-if="isFailed">
            <ErrorSummary :msg="message" :error="error" :enable-popup="enableErrorPopup" class="rg-feedback__error px-2 border h-100" />
        </slot>
    </div>
</template>

<script setup lang="ts">
import IconButton from "../icons/IconButton.vue"
import Pending from "./Pending.vue"
import Success from "./Success.vue"
import ErrorSummary from "./ErrorSummary.vue"
import { FeedbackStatus, feedbackDefaults, type FeedbackEmits, type FeedbackProps, type FeedbackSlots } from "./feedback"

import { computed } from "vue"

const emit = defineEmits<FeedbackEmits>()
const props = withDefaults(defineProps<FeedbackProps>(), { ...feedbackDefaults })
defineSlots<FeedbackSlots>()

// Every field is read through the prop, never destructured or toRefs'd: FeedbackOut is reactive, so
// destructuring snapshots the values, and toRefs pins them to the object identity present at setup — a
// panel whose `feedback` prop is later swapped for a different instance would then render half of each.
// isPending is the composable's own busy flag (also public API for views); the other two stay local.
const message = computed(() => props.feedback.message)
const error = computed(() => props.feedback.error)
const isPending = computed(() => props.feedback.isPending)
const isSuccess = computed(() => props.feedback.status === FeedbackStatus.success)
const isFailed = computed(() => props.feedback.status === FeedbackStatus.failed)

const handleClose = (e: Event) => {
    e.stopPropagation() // prevent triggering buttons underneath
    emit("close", { status: props.feedback.status, error: props.feedback.error })

    props.feedback.reset()
}
</script>
