/** address parts (falsy parts are skipped) or a single address string */
export type GMapAddressInput = Array<string | undefined> | string

export type GMapProps = {
    modelValue: GMapAddressInput
    zoom?: number
}

export type GMapLinkProps = {
    modelValue: GMapAddressInput
}
export type GMapLinkSlots = {
    default?(): any
}

export type GMapButtonProps = {
    modelValue: GMapAddressInput
    zoom?: number
}
export type GMapButtonSlots = {
    /** the button content; defaults to the map icon */
    default?(): any
}
