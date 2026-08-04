<template>
    <div class="rg-error-summary bg-danger bg-opacity-75 text-light">
        <slot name="message">
            <div class="row gy-0 gx-1">
                <div class="col-auto">
                    <button type="button" class="btn btn-default p-0 m-0 text-light" :diabled="!error" @click="showSummary = !showSummary">
                        <Icon name="warning" />
                    </button>
                </div>
                <div class="col-auto pt-1">
                    {{ msg }}
                </div>
                <div v-if="enablePopup && error" class="col-auto">
                    <button type="button" class="btn btn-link p-0 m-0 text-light" :diabled="!error" @click="showSummary = !showSummary">
                        <Icon name="info" />
                    </button>
                </div>
            </div>
        </slot>
        <slot name="summary">
            <template v-if="error">
                <div v-if="typeof error == 'string'" class="mt-2">{{ error }}</div>
                <ul v-else class="list-unstyled mt-2" v-for="(msgs, code) in error" :key="code">
                    <li>
                        <b>{{ code }}</b>
                        <div v-if="typeof msgs == 'string'" class="mt-2">{{ msgs }}</div>
                        <ul v-else>
                            <li v-for="err in msgs" :key="err">
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
                <ul v-else class="list-unstyled mt-2" v-for="(msgs, code) in error" :key="code">
                    <li>
                        <b>{{ code }}</b>
                        <div v-if="typeof msgs == 'string'" class="mt-2">{{ msgs }}</div>
                        <ul v-else>
                            <li v-for="err in msgs" :key="err">
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
import { ref } from "vue"
import type { FeedbackError } from "./feedback"
import Icon from "../icons/Icon.vue"
import { ModalType, injectModal } from "../modal"

const props = withDefaults(
    defineProps<{
        msg: string
        error: FeedbackError | undefined
        enablePopup?: boolean
    }>(),
    {
        msg: "Unfortunately, an error has occurred.",
        error: () => ({}),
    }
)

const Modal = injectModal()
const showSummary = ref(false)
</script>
