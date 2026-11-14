<template>
    <transition name="modal">
        <div v-if="isVisible" class="rg-modal modal-mask" @keydown.esc="handleClose" @keydown.tab="keepTabInside">
            <div class="modal-wrapper">
                <div
                    ref="dialog"
                    class="modal show d-block"
                    tabindex="-1"
                    role="dialog"
                    aria-modal="true"
                    :aria-labelledby="showHeader ? titleId : undefined"
                    :aria-label="showHeader ? undefined : title"
                >
                    <div class="modal-dialog modal-dialog-scrollable" :class="[sizeClass, { 'full-width': fullWidth }]">
                        <div class="modal-content" :style="{ 'min-height': fullWidth ? '60vh' : 'inherit' }">
                            <div v-if="showHeader" class="rg-modal__header modal-header py-2" :class="titleClass">
                                <div class="d-flex justify-content-between w-100">
                                    <slot name="title" :titleId="titleId">
                                        <h3 :id="titleId" class="modal-title">
                                            <template v-if="isDanger">
                                                <Icon name="alert" class="me-2" />
                                            </template>
                                            <template v-if="isWarning">
                                                <Icon name="warning" class="me-2" />
                                            </template>
                                            {{ title }}
                                        </h3>
                                    </slot>
                                    <slot name="header-close-button" :handleClose="handleClose">
                                        <IconButton
                                            icon="close"
                                            :class="[isDanger ? 'btn-danger' : 'btn-outline-danger']"
                                            title="close"
                                            @click="handleClose"
                                            data-dismiss="modal"
                                        />
                                    </slot>
                                </div>
                            </div>
                            <div class="rg-modal__body modal-body" :class="contentClass">
                                <slot></slot>
                            </div>

                            <div v-if="showFooter" class="rg-modal__footer modal-footer py-1" :class="footerClass">
                                <slot name="buttons">
                                    <div class="d-flex justify-content-between w-100">
                                        <slot name="footer-close-button" :handleCancel="handleCancel">
                                            <div>
                                                <IconButton icon="cancel" class="btn-outline-secondary" @click="handleCancel">{{
                                                    labels?.cancel ?? "Cancel"
                                                }}</IconButton>
                                            </div>
                                        </slot>
                                        <slot name="footer-submit-button" :handleSubmit="handleSubmit" :handleClose="handleSubmit">
                                            <div>
                                                <IconButton icon="submit" :class="isDanger ? 'btn-danger' : 'btn-success'" @click="handleSubmit">{{
                                                    labels?.submit ?? "Submit"
                                                }}</IconButton>
                                            </div>
                                        </slot>
                                    </div>
                                </slot>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </transition>
</template>

<script setup lang="ts">
import "./style.scss"
import { computed, nextTick, onBeforeUnmount, ref, useId, watch } from "vue"
import Icon from "../icons/Icon.vue"
import IconButton from "../icons/IconButton.vue"
import { ModalType, modalDefaults, type ModalProps, type ModalEmits, type ModalSlots } from "./modal"

const emit = defineEmits<ModalEmits>()
const props = withDefaults(defineProps<ModalProps>(), { ...modalDefaults })
defineSlots<ModalSlots>()

const isNormal = computed(() => props.type === ModalType.normal)
const isSuccess = computed(() => props.type === ModalType.success)
const isWarning = computed(() => props.type === ModalType.warning)
const isDanger = computed(() => props.type === ModalType.danger)
const sizeClass = computed(() => (props.size && props.size !== "md" ? `modal-${props.size}` : ""))
// names the dialog: the default title carries it, and a `title` slot gets it to put on its own heading
const titleId = useId()

const titleClass = computed(() => ({
    "rg-accent-bg": isNormal.value,
    "bg-success": isSuccess.value,
    "bg-danger": isDanger.value,
    "text-white": isDanger.value,
    "bg-warning": isWarning.value,
}))
const contentClass = computed(() => ({
    "text-danger": isDanger.value,
}))
const footerClass = computed(() => ({}))

const handleClose = () => emit("close")
const handleCancel = () => emit("cancel")
const handleSubmit = () => emit("submit")

// The page behind holds still while any modal is open. The count lives on <body>, not in this file, so nested modals,
// and a copy of this component open beside the library's own, share it: the last one to close gives the scroll back
let holdsScroll = false
function holdScroll(hold: boolean) {
    if (typeof document === "undefined" || hold === holdsScroll) return
    holdsScroll = hold
    const body = document.body
    const count = Number(body.dataset.rgModalCount ?? 0) + (hold ? 1 : -1)
    if (count > 0) {
        if (count === 1 && hold) {
            body.dataset.rgModalOverflow = body.style.overflow
            body.style.overflow = "hidden"
        }
        body.dataset.rgModalCount = String(count)
    } else {
        body.style.overflow = body.dataset.rgModalOverflow ?? ""
        delete body.dataset.rgModalCount
        delete body.dataset.rgModalOverflow
    }
}

// Esc is heard on the mask, so it needs focus inside the modal: take it when the modal opens, unless an element in it
// already has it (an input the content focused itself). Give it back when the modal closes, to the element that had
// it (the button that opened the modal), so a keyboard user keeps their place
const dialog = ref<HTMLElement>()
let returnFocus: HTMLElement | undefined
function restoreFocus() {
    const el = returnFocus
    returnFocus = undefined
    if (typeof document === "undefined") return // server-side rendering: no DOM to focus
    const active = document.activeElement
    // only while focus is still the modal's: never take it from where the app moved it meanwhile
    const inModal = !active || active === document.body || !!dialog.value?.contains(active)
    if (el?.isConnected && inModal) el.focus({ preventScroll: true })
}
watch(
    () => props.isVisible,
    async (isVisible) => {
        if (typeof document === "undefined") return
        holdScroll(isVisible)
        if (!isVisible) return restoreFocus()
        const active = document.activeElement
        if (active instanceof HTMLElement && active !== document.body) returnFocus = active
        await nextTick()
        const el = dialog.value
        if (el && !el.contains(document.activeElement)) el.focus({ preventScroll: true })
    },
    { immediate: true }
)
onBeforeUnmount(() => {
    holdScroll(false)
    restoreFocus()
})

// Tab and Shift+Tab stay inside the dialog: past its last focusable element focus goes to the first, and back
const FOCUSABLE =
    'a[href], area[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), iframe, [contenteditable]:not([contenteditable="false"]), [tabindex]'
function keepTabInside(e: KeyboardEvent) {
    const el = dialog.value
    // a modal opened inside this one's content has kept the key inside itself already
    if (e.defaultPrevented || !el) return
    const focusable = [...el.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
        (x) => x.tabIndex >= 0 && !x.closest("[hidden], [inert]") && (x.checkVisibility?.() ?? true)
    )
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    const active = document.activeElement
    if (!first || !last) {
        // nothing to move to: focus stays on the dialog
        e.preventDefault()
    } else if (e.shiftKey && (active === first || active === el)) {
        e.preventDefault()
        last.focus()
    } else if (!e.shiftKey && active === last) {
        e.preventDefault()
        first.focus()
    }
}
</script>
