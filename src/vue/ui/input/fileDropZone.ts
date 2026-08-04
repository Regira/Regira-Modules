export type FileDropZoneEmits = {
    (e: "drop-files", files: Array<Blob>): void
}
export type FileDropZoneSlots = {
    default?(props: { isDropping: boolean | undefined }): any
}
