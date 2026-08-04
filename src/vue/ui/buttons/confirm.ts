import { ModalType } from "../modal/modal"

export type ConfirmButtonProps = {
    icon?: string
    buttonLabel?: string
    modalTitle?: string
    modalType?: ModalType
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
