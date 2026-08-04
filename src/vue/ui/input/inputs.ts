// contract types for the simple form widgets (one place, SFCs consume their own contract)

export type FormLabelProps = {
    label: string
    /** hide the label below the md breakpoint */
    autoHide?: boolean
}
export const formLabelDefaults = {
    autoHide: false,
}

export type FormSectionProps = {
    title?: string
    readonly?: boolean
    showSummary?: boolean
    collapsed?: boolean
    summaryClass?: string | Array<string> | Record<string, string>
}
export type FormSectionEmits = {
    (e: "expand"): void
    (e: "collapse"): void
}
export type FormSectionSlots = {
    header?(props: { collapsed: boolean | undefined; showSummary: boolean }): any
    title?(props: { showSummary: boolean }): any
    default?(props: { collapsed: boolean | undefined }): any
    summary?(props: { collapsed: boolean | undefined }): any
    always?(): any
}

export type NullableCheckBoxProps = {
    modelValue?: boolean | string | number
    /** renders a clickable label beside the box; associated via `for` when an `id` is passed */
    label?: string
}
export type NullableCheckBoxEmits = {
    (e: "update:modelValue", modelValue?: boolean): void
    (e: "change", arg: { target: HTMLInputElement }): void
}

export type NullableLabelProps = {
    label?: string
}
export type NullableLabelSlots = {
    /** fallback content when no label is set */
    default?(): any
}

export type DateInputProps = {
    modelValue?: string | Date
    culture?: string
    readonly?: boolean
}
export type DateInputEmits = {
    (e: "update:modelValue", modelValue?: string | Date): void
}

/** the text value itself binds via v-model (defineModel) */
export type DescriptionInputProps = {
    label?: string
    readonly?: boolean
}

export type AnchorProps = {
    /** email/IP/phone inputs get their protocol prefixed automatically */
    href: string
}
export type AnchorSlots = {
    default?(): any
}

export type CopyToClipboardButtonProps = {
    value?: string
    timeout?: number
}
export const copyToClipboardButtonDefaults = {
    timeout: 2500,
}
