import type { FeedbackOut } from "../feedback/feedback"

export type FormButtonsRowProps = {
    /** only `isArchived` (gates Restore) and `$title` (delete prompt) are read; typed `unknown` so any entity binds */
    item?: unknown
    readonly?: boolean
    feedback?: FeedbackOut
    showDelete?: boolean
    /** button-label overrides (i18n); defaults are English */
    labels?: { save?: string; cancel?: string; delete?: string; restore?: string }
    /** delete-confirm modal title; pair with the `delete` slot for a translated body */
    modalTitle?: string
}
export type FormButtonsRowEmits = {
    (e: "cancel"): void
    (e: "remove"): void
    (e: "restore"): void
}
export type FormButtonsRowSlots = {
    /** delete-confirm modal body */
    delete?(): any
}
