import type { AllowedComponentProps, VNodeProps } from "vue"

export enum ModalType {
    normal = "Normal",
    success = "Success",
    warning = "Warning",
    danger = "Danger",
}

export type ModalProps = {
    title?: string
    isVisible: boolean
    showHeader?: boolean
    showFooter?: boolean
    fullWidth?: boolean
    size?: "sm" | "md" | "lg" | "xl"
    type?: ModalType
}
export type ModalEmits = {
    (e: "submit"): void
    (e: "cancel"): void
    (e: "close"): void
}
export type ModalSlots = {
    title?(): any
    "header-close-button"?(props: { handleClose: () => void }): any
    default?(): any
    buttons?(): any
    "footer-close-button"?(props: { handleCancel: () => void }): any
    "footer-submit-button"?(props: { handleClose: () => void }): any
}
export const modalDefaults = {
    showHeader: true,
    showFooter: true,
    type: ModalType.normal,
}

/** any component implementing the modal contract (props checked at the registration site) */
export type ModalComponent = new (...args: any[]) => {
    $props: ModalProps & AllowedComponentProps & VNodeProps
}
