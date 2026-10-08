<template>
    <div class="rg-error-summary bg-danger bg-opacity-75 text-light">
        <slot name="message">
            <div class="row gy-0 gx-1">
                <div class="col-auto">
                    <button
                        type="button"
                        class="btn btn-default p-0 m-0 text-light"
                        :disabled="!hasError"
                        aria-label="Error details"
                        @click="showSummary = !showSummary"
                    >
                        <Icon name="warning" />
                    </button>
                </div>
                <div class="col-auto pt-1">
                    {{ msg }}
                </div>
                <div v-if="enablePopup && hasError" class="col-auto">
                    <button
                        type="button"
                        class="btn btn-link p-0 m-0 text-light"
                        :disabled="!hasError"
                        aria-label="Error details"
                        @click="showSummary = !showSummary"
                    >
                        <Icon name="info" />
                    </button>
                </div>
            </div>
        </slot>
        <slot name="summary">
            <template v-if="hasError">
                <div v-if="typeof error == 'string'" class="mt-2">{{ error }}</div>
                <ul v-else class="list-unstyled mt-2" v-for="field in fields" :key="field.name">
                    <li>
                        <b v-if="field.label">{{ field.label }}</b>
                        <ul>
                            <li v-for="(err, index) in field.messages" :key="index">
                                {{ err }}
                            </li>
                        </ul>
                    </li>
                </ul>
            </template>
        </slot>
        <Teleport to="#modals">
            <component
                :is="Modal"
                v-if="showSummary"
                is-visible
                :title="msg"
                :show-footer="false"
                :type="ModalType.danger"
                @close="showSummary = false"
                @cancel="showSummary = false"
                @submit="showSummary = false"
            >
                <div v-if="typeof error == 'string'" class="mt-2">{{ error }}</div>
                <ul v-else class="list-unstyled mt-2" v-for="field in fields" :key="field.name">
                    <li>
                        <b v-if="field.label">{{ field.label }}</b>
                        <ul>
                            <li v-for="(err, index) in field.messages" :key="index">
                                {{ err }}
                            </li>
                        </ul>
                    </li>
                </ul>
            </component>
        </Teleport>
    </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue"
import { fieldLabel, fieldMessages, type FeedbackError } from "./feedback"
import Icon from "../icons/Icon.vue"
import { ModalType, injectModal } from "../modal"

const props = withDefaults(
    defineProps<{
        msg: string
        error: FeedbackError | undefined
        enablePopup?: boolean
        /** leave the named fields out — the form shows them at its inputs; text and `""`-keyed errors still show */
        hideFieldErrors?: boolean
    }>(),
    {
        msg: "Unfortunately, an error has occurred.",
        error: () => ({}),
    }
)

// Vue gives an `undefined` error — what Feedback passes for a failure without a field map — the `{}` default, so
// whether there is anything to show is read from the content, not from the prop being set
// the fields that hold a message: one whose messages are all empty shows nothing, as at its input. Each is headed by its
// label, not its key; the `""` key's errors, which belong to no field, show without a heading and are never hidden
const fields = computed(() => {
    const error = props.error as FeedbackError | null | undefined
    return error != null && typeof error === "object"
        ? Object.keys(error)
              .filter((name) => !props.hideFieldErrors || name === "")
              .map((name) => ({ name, label: fieldLabel(name), messages: fieldMessages(error, name) }))
              .filter((field) => field.messages.length > 0)
        : []
})
const hasError = computed(() => {
    const error = props.error as FeedbackError | null | undefined
    if (error == null) {
        return false
    }
    return typeof error === "string" ? error.trim() !== "" : fields.value.length > 0
})

const Modal = injectModal()
const showSummary = ref(false)
</script>
