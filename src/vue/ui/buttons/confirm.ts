import { ModalType } from "../modal/modal"

/**
 * `disabled`, `aria-label` and any other attribute fall through to the root `<button>`. It exposes `open()` / `close()`:
 * to confirm from a swipe or a shortcut, keep it in the tree and call `confirmRef.value?.open()`.
 */
export type ConfirmButtonProps = {
    icon?: string
    buttonLabel?: string
    modalTitle?: string
    modalType?: ModalType
    /** confirm-modal footer labels (i18n); defaults are English "Cancel" / "Submit" */
    modalLabels?: { cancel?: string; submit?: string }
}
export type ConfirmButtonEmits = {
    (e: "confirm"): void
    (e: "cancel"): void
    (e: "open"): void
    (e: "close"): void
}
export type ConfirmButtonSlots = {
    "button-content"?(): any
    modal?(): any
    /** confirm-modal body */
    default?(): any
}
export const confirmButtonDefaults = {
    icon: "warning",
    modalTitle: "Sure?",
    modalType: ModalType.warning,
}
