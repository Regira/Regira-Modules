import { ModalType } from "../modal/modal"

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
